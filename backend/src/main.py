# project/src/main.py

import logging
import re
from typing import List, Dict, Any, Optional

import uuid
from datetime import datetime, timezone
from fastapi import Body, FastAPI, HTTPException, WebSocket, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from supabase_auth.errors import AuthApiError

from src.config import FRONTEND_CORS_ORIGINS
from src.utils.logging import setup_logging
from src.services.supabase import SupabaseService
from src.models.auth import UserCredentials, AuthResponse
from src.models.task import Task, TaskCreate, TaskUpdate
from src.dependencies import get_current_user, get_current_user_ws

# --- Setup Logging ---
setup_logging()
logger = logging.getLogger(__name__)

# --- Initialize Global Services ---
# SupabaseService manages database interactions.
supabase_service = SupabaseService()


# --- FastAPI App Setup ---
app = FastAPI(
    title="Alldone Task List Backend",  # MODIFIED: Changed title
    # MODIFIED: Changed description
    description="API for the Alldone task list application.",
    version="1.0.0",
)

# Configure CORS (Cross-Origin Resource Sharing)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", summary="Health Check")
async def read_root():
    """Basic endpoint to check if the API is running."""
    logger.info("Root endpoint accessed.")
    return {"message": "FastAPI is running!"}


# Authentication Endpoints (unchanged logic)
@app.post(
    "/auth/signup",
    response_model=AuthResponse,
    summary="Register a new user",
    description="Registers a new user with email and password via Supabase Auth.",
    tags=["Authentication"],
    status_code=status.HTTP_201_CREATED
)
async def signup(credentials: UserCredentials):
    """
    Registers a new user in Supabase.
    A confirmation email might be sent depending on Supabase project settings.
    """
    logger.info(f"Attempting to sign up user: {credentials.email}")
    if not supabase_service.is_initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not initialized."
        )
    try:
        auth_data = await supabase_service.sign_up(credentials.email, credentials.password)
        return AuthResponse(
            access_token=auth_data.get("session", {}).get("access_token"),
            token_type=auth_data.get("session", {}).get(
                "token_type", "Bearer"),
            expires_in=auth_data.get("session", {}).get("expires_in"),
            refresh_token=auth_data.get("session", {}).get("refresh_token"),
            user=auth_data.get("user"),
            session=auth_data.get("session")
        )
    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.error(
            f"Unhandled error during signup for {credentials.email}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="An unexpected error occurred during signup.")


@app.post(
    "/auth/login",
    response_model=AuthResponse,
    summary="Log in an existing user",
    description="Logs in an existing user with email and password via Supabase Auth.",
    tags=["Authentication"]
)
async def login(credentials: UserCredentials):
    """
    Logs in an existing user in Supabase.
    """
    logger.info(f"Attempting to log in user: {credentials.email}")
    if not supabase_service.is_initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not initialized."
        )
    try:
        auth_data = await supabase_service.sign_in(credentials.email, credentials.password)
        return AuthResponse(
            access_token=auth_data.get("session", {}).get("access_token"),
            token_type=auth_data.get("session", {}).get(
                "token_type", "Bearer"),
            expires_in=auth_data.get("session", {}).get("expires_in"),
            refresh_token=auth_data.get("session", {}).get("refresh_token"),
            user=auth_data.get("user"),
            session=auth_data.get("session")
        )
    except AuthApiError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=e.message)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except Exception as e:
        logger.error(
            f"Unhandled error during login for {credentials.email}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="An unexpected error occurred during login.")


@app.get("/tasks/", response_model=List[Task], tags=["Tasks"])
async def read_tasks(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Retrieve all tasks for the authenticated user.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token.")

    response = supabase_service.client.table('tasks').select(
        '*').eq('user_id', user_id).order('created_at', desc=False).execute()
    if response.data is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to fetch tasks from database.")
    return [Task(**task_data) for task_data in response.data]


@app.post("/tasks/", response_model=Task, status_code=status.HTTP_201_CREATED, tags=["Tasks"])
async def create_task(task_create: TaskCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Create a new task for the authenticated user.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token.")

    new_task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    task_data = {
        "id": new_task_id,
        "user_id": user_id,
        "text": task_create.text,
        "completed": task_create.completed,
        "created_at": now,
        "updated_at": now
    }
    response = supabase_service.client.table(
        'tasks').insert(task_data).execute()
    if response.data is None or not response.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to create task in database.")
    return Task(**response.data[0])


@app.put("/tasks/{task_id}", response_model=Task, tags=["Tasks"])
async def update_task(task_id: str, task_update: TaskUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Update an existing task for the authenticated user.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token.")

    now = datetime.now(timezone.utc).isoformat()
    update_data = task_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = now

    response = supabase_service.client.table('tasks').update(
        update_data).eq('id', task_id).eq('user_id', user_id).execute()
    if response.data is None or not response.data:
        # Check if the task exists but belongs to another user
        check_response = supabase_service.client.table(
            'tasks').select('id').eq('id', task_id).execute()
        if not check_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Not authorized to update this task.")
    return Task(**response.data[0])


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Tasks"])
async def delete_task(task_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Delete a task for the authenticated user.
    """
    user_id = current_user.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User ID not found in token.")

    response = supabase_service.client.table('tasks').delete().eq(
        'id', task_id).eq('user_id', user_id).execute()
    if response.data is None:
        if response.status_code == status.HTTP_204_NO_CONTENT:  # No Content on successful delete
            return  # Successfully deleted

        # If status code is not 204, it might be an error or not found
        # Check if the task exists but belongs to another user (more detailed error)
        check_response = supabase_service.client.table(
            'tasks').select('id').eq('id', task_id).execute()
        if not check_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Not authorized to delete this task.")
    return
