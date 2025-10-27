# project/backend/tests/integration/test_main_api.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone
import uuid  # Import uuid for generating valid UUIDs
# Import the global instance
from src.main import app, supabase_service as global_supabase_service
from src.services.supabase import SupabaseService  # Import class for type hinting
from supabase_auth.errors import AuthApiError
from fastapi import HTTPException, status, Depends
# Import original dependency
from src.dependencies import get_current_user as original_get_current_user

client = TestClient(app)

# Helper function for dependencies that raise HTTPExceptions


def _raise_http_exception(status_code: int, detail: str):
    raise HTTPException(status_code=status_code, detail=detail)


@pytest.fixture
def mock_supabase_service(mocker):
    """
    Mocks the global SupabaseService instance (`src.main.supabase_service`)
    and its internal components for API integration tests.
    """
    # Get the *actual* singleton instance used by main.py
    service = global_supabase_service

    # Ensure the internal client is always a mock, and the 'client' property returns it.
    mock_internal_client = MagicMock()
    mocker.patch.object(service, '_supabase_client', new=mock_internal_client)
    # Patch the 'client' property on the class to return our mock_internal_client
    # This is crucial for `service.client` calls to work.
    mocker.patch.object(service.__class__, 'client',
                        new_callable=mocker.PropertyMock, return_value=mock_internal_client)

    # Patch the public async methods of the SupabaseService instance directly
    mocker.patch.object(service, 'sign_up', new=AsyncMock())
    mocker.patch.object(service, 'sign_in', new=AsyncMock())
    mocker.patch.object(service, 'get_user_by_token', new=AsyncMock())

    # --- Mock Postgrest client chain calls (.table().select().eq().order().execute()) ---
    mock_chainable = MagicMock()
    mock_chainable.select.return_value = mock_chainable
    mock_chainable.insert.return_value = mock_chainable
    mock_chainable.update.return_value = mock_chainable
    mock_chainable.delete.return_value = mock_chainable
    mock_chainable.eq.return_value = mock_chainable
    mock_chainable.order.return_value = mock_chainable

    # Configure execute to be a MagicMock itself, so we can set its side_effect or return_value later
    mock_chainable.execute = MagicMock()

    # When mock_internal_client.table('tasks') is called, it should return our mock_chainable.
    mock_internal_client.table.return_value = mock_chainable

    # Expose individual mocks via the 'service' object (which is the actual instance)
    service._mock_postgrest_chainable = mock_chainable
    service._mock_postgrest_execute_method = mock_chainable.execute

    yield service


# Mock `get_current_user` dependency for authenticated endpoints
@pytest.fixture
def mock_auth_dependency_override():
    """
    Mocks the get_current_user dependency using FastAPI's dependency_overrides.
    This ensures that authenticated endpoints receive a consistent mocked user.
    """
    # Use a valid UUID for the user ID to avoid type validation errors if the mock leaks
    mock_user = {"id": str(uuid.uuid4()), "email": "test@example.com"}

    # Temporarily override the dependency in the FastAPI app
    app.dependency_overrides[original_get_current_user] = lambda: mock_user
    yield mock_user
    # Clean up overrides after the test (handled by the autouse fixture in conftest.py)


# --- Authentication Endpoints ---

def test_read_root():
    """Basic endpoint to check if the API is running."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "FastAPI is running!"}


@pytest.mark.asyncio
# Type hint for clarity
async def test_signup_success(mock_supabase_service: SupabaseService):
    """
    Given valid signup credentials,
    When a POST request is made to /auth/signup,
    Then it should return auth data with status 201.
    """
    signup_data = {"email": "newuser@example.com", "password": "password123"}

    mock_supabase_service.sign_up.return_value = {
        "user": {"id": str(uuid.uuid4()), "email": signup_data["email"]},
        "session": {"access_token": "abc", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "def"}
    }

    response = client.post("/auth/signup", json=signup_data)

    assert response.status_code == 201
    assert "access_token" in response.json()
    assert response.json()["user"]["email"] == signup_data["email"]
    mock_supabase_service.sign_up.assert_awaited_once_with(
        signup_data["email"], signup_data["password"])


@pytest.mark.asyncio
async def test_signup_auth_api_error(mock_supabase_service: SupabaseService):
    """
    Given signup fails due to Supabase AuthApiError (e.g., duplicate user),
    When a POST request is made to /auth/signup,
    Then it should return 401 with the error message.
    """
    signup_data = {"email": "existing@example.com", "password": "password123"}
    mock_supabase_service.sign_up.side_effect = AuthApiError(
        message="User already registered", status=400, code="400")

    response = client.post("/auth/signup", json=signup_data)

    assert response.status_code == 401
    assert response.json()["detail"] == "User already registered"
    mock_supabase_service.sign_up.assert_awaited_once()


@pytest.mark.asyncio
async def test_signup_service_unavailable(mock_supabase_service: SupabaseService, mocker):
    """
    Given SupabaseService is not initialized,
    When a POST request is made to /auth/signup,
    Then it should return 503.
    """
    # To simulate service unavailable, patch the 'is_initialized' property of the service instance
    # by making its underlying _supabase_client None.
    mocker.patch.object(mock_supabase_service, '_supabase_client', new=None)
    signup_data = {"email": "test@example.com", "password": "password123"}

    response = client.post("/auth/signup", json=signup_data)

    assert response.status_code == 503
    assert response.json()[
        "detail"] == "Authentication service is not initialized."
    mock_supabase_service.sign_up.assert_not_awaited()


@pytest.mark.asyncio
async def test_login_success(mock_supabase_service: SupabaseService):
    """
    Given valid login credentials,
    When a POST request is made to /auth/login,
    Then it should return auth data.
    """
    login_data = {"email": "test@example.com", "password": "password123"}

    mock_supabase_service.sign_in.return_value = {
        "user": {"id": str(uuid.uuid4()), "email": login_data["email"]},
        "session": {"access_token": "abc", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "def"}
    }

    response = client.post("/auth/login", json=login_data)

    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["user"]["email"] == login_data["email"]
    mock_supabase_service.sign_in.assert_awaited_once_with(
        login_data["email"], login_data["password"])


@pytest.mark.asyncio
async def test_login_auth_api_error(mock_supabase_service: SupabaseService):
    """
    Given invalid login credentials,
    When a POST request is made to /auth/login,
    Then it should return 401 with the error message.
    """
    login_data = {"email": "test@example.com", "password": "wrongpassword"}
    mock_supabase_service.sign_in.side_effect = AuthApiError(
        message="Invalid login credentials", status=400, code="400")

    response = client.post("/auth/login", json=login_data)

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid login credentials"
    mock_supabase_service.sign_in.assert_awaited_once()


@pytest.mark.asyncio
async def test_login_service_unavailable(mock_supabase_service: SupabaseService, mocker):
    """
    Given SupabaseService is not initialized,
    When a POST request is made to /auth/login,
    Then it should return 503.
    """
    # To simulate service unavailable, patch the 'is_initialized' property of the service instance
    # by making its underlying _supabase_client None.
    mocker.patch.object(mock_supabase_service, '_supabase_client', new=None)
    login_data = {"email": "test@example.com", "password": "password123"}

    response = client.post("/auth/login", json=login_data)

    assert response.status_code == 503
    assert response.json()[
        "detail"] == "Authentication service is not initialized."
    mock_supabase_service.sign_in.assert_not_awaited()

# --- Task Endpoints ---


@pytest.mark.asyncio
async def test_read_tasks_success(mock_supabase_service: SupabaseService, mock_auth_dependency_override):
    """
    Retrieve all tasks for the authenticated user.
    """
    user_id = mock_auth_dependency_override["id"]
    test_tasks = [
        {"id": str(uuid.uuid4()), "user_id": user_id, "text": "Buy groceries", "completed": False,
            "created_at": "2023-01-01T10:00:00+00:00", "updated_at": "2023-01-01T10:00:00+00:00"},
        {"id": str(uuid.uuid4()), "user_id": user_id, "text": "Walk the dog", "completed": True,
            "created_at": "2023-01-02T11:00:00+00:00", "updated_at": "2023-01-02T11:00:00+00:00"},
    ]
    mock_supabase_service._mock_postgrest_execute_method.return_value = MagicMock(
        data=test_tasks, status_code=status.HTTP_200_OK)

    response = client.get("/tasks/")

    assert response.status_code == 200
    assert len(response.json()) == 2
    assert response.json()[0]["text"] == "Buy groceries"
    mock_supabase_service.client.table.assert_called_with('tasks')
    mock_supabase_service._mock_postgrest_chainable.select.assert_called_with(
        '*')
    mock_supabase_service._mock_postgrest_chainable.eq.assert_called_with(
        'user_id', user_id)
    mock_supabase_service._mock_postgrest_chainable.order.assert_called_once_with(
        'created_at', desc=False)
    mock_supabase_service._mock_postgrest_execute_method.assert_called_once()


@pytest.mark.asyncio
async def test_read_tasks_unauthorized():
    """
    Given no authentication,
    When a GET request is made to /tasks/,
    Then it should return 401 Unauthorized.
    """
    app.dependency_overrides[original_get_current_user] = lambda: _raise_http_exception(
        status.HTTP_401_UNAUTHORIZED, "Unauthorized")
    response = client.get("/tasks/")
    assert response.status_code == 401
    assert response.json()["detail"] == "Unauthorized"


@pytest.mark.asyncio
async def test_create_task_success(mock_supabase_service: SupabaseService, mock_auth_dependency_override):
    """
    Create a new task for the authenticated user.
    """
    user_id = mock_auth_dependency_override["id"]
    new_task_data = {"text": "New task text", "completed": False}
    inserted_task_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat(
        timespec='milliseconds').replace('+00:00', 'Z')
    inserted_task = {
        "id": inserted_task_id,
        "user_id": user_id,
        "text": new_task_data["text"],
        "completed": new_task_data["completed"],
        "created_at": now,
        "updated_at": now
    }
    mock_supabase_service._mock_postgrest_execute_method.return_value = MagicMock(
        data=[inserted_task], status_code=status.HTTP_201_CREATED)

    response = client.post("/tasks/", json=new_task_data)

    assert response.status_code == 201
    assert response.json()["text"] == new_task_data["text"]
    assert response.json()["user_id"] == user_id
    mock_supabase_service.client.table.assert_called_with('tasks')
    mock_supabase_service._mock_postgrest_chainable.insert.assert_called_once()
    mock_supabase_service._mock_postgrest_execute_method.assert_called_once()
    args, kwargs = mock_supabase_service._mock_postgrest_chainable.insert.call_args_list[
        0].args
    inserted_payload = args[0]
    assert inserted_payload["text"] == new_task_data["text"]
    assert inserted_payload["completed"] == new_task_data["completed"]
    assert inserted_payload["user_id"] == user_id


@pytest.mark.asyncio
async def test_create_task_unauthorized():
    """
    Given a new task and no authentication,
    When a POST request is made to /tasks/,
    Then it should return 401 Unauthorized.
    """
    app.dependency_overrides[original_get_current_user] = lambda: _raise_http_exception(
        status.HTTP_401_UNAUTHORIZED, "Unauthorized")
    response = client.post(
        "/tasks/", json={"text": "Unauthorized task", "completed": False})
    assert response.status_code == 401
    assert response.json()["detail"] == "Unauthorized"


@pytest.mark.asyncio
async def test_update_task_success(mock_supabase_service: SupabaseService, mock_auth_dependency_override):
    """
    Update an existing task for the authenticated user.
    """
    user_id = mock_auth_dependency_override["id"]
    task_id = str(uuid.uuid4())
    update_data = {"text": "Updated task text", "completed": True}
    now = datetime.now(timezone.utc).isoformat(
        timespec='milliseconds').replace('+00:00', 'Z')
    updated_task_in_db = {
        "id": task_id,
        "user_id": user_id,
        "text": update_data["text"],
        "completed": update_data["completed"],
        "created_at": "2023-01-01T10:00:00Z",
        "updated_at": now
    }
    mock_supabase_service._mock_postgrest_execute_method.return_value = MagicMock(
        data=[updated_task_in_db], status_code=status.HTTP_200_OK)

    response = client.put(f"/tasks/{task_id}", json=update_data)

    assert response.status_code == 200
    assert response.json()["text"] == update_data["text"]
    assert response.json()["completed"] == update_data["completed"]
    mock_supabase_service.client.table.assert_called_with('tasks')
    mock_supabase_service._mock_postgrest_chainable.update.assert_called_once()
    mock_supabase_service._mock_postgrest_chainable.eq.assert_any_call(
        'id', task_id)
    mock_supabase_service._mock_postgrest_chainable.eq.assert_any_call(
        'user_id', user_id)
    mock_supabase_service._mock_postgrest_execute_method.assert_called_once()

    args, kwargs = mock_supabase_service._mock_postgrest_chainable.update.call_args_list[
        0].args
    update_payload = args[0]
    assert update_payload["text"] == update_data["text"]
    assert update_payload["completed"] == update_data["completed"]
    assert "updated_at" in update_payload


@pytest.mark.asyncio
async def test_update_task_not_found(mock_supabase_service: SupabaseService, mock_auth_dependency_override):
    """
    Given a non-existent task ID and an authenticated user,
    When a PUT request is made to /tasks/{task_id},
    Then it should return 404 Not Found.
    """
    user_id = mock_auth_dependency_override["id"]
    task_id = str(uuid.uuid4())  # Valid UUID but non-existent
    update_data = {"text": "Attempt update", "completed": False}

    first_execute_response = MagicMock(data=[], status_code=status.HTTP_200_OK)
    second_execute_response = MagicMock(
        data=[], status_code=status.HTTP_200_OK)

    mock_supabase_service._mock_postgrest_execute_method.side_effect = [
        first_execute_response,  # for the update() call
        second_execute_response  # for the select() call
    ]

    response = client.put(f"/tasks/{task_id}", json=update_data)

    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found."
    assert mock_supabase_service._mock_postgrest_execute_method.call_count == 2


@pytest.mark.asyncio
async def test_update_task_forbidden(mock_supabase_service: SupabaseService, mock_auth_dependency_override):
    """
    Given an existing task ID belonging to another user,
    When a PUT request is made to /tasks/{task_id} by a different user,
    Then it should return 403 Forbidden.
    """
    user_id = mock_auth_dependency_override["id"]
    task_id = str(uuid.uuid4())  # Valid UUID but for another user
    update_data = {"text": "Attempt update", "completed": False}

    first_execute_response = MagicMock(data=[], status_code=status.HTTP_200_OK)
    second_execute_response = MagicMock(
        data=[{"id": task_id}], status_code=status.HTTP_200_OK)

    mock_supabase_service._mock_postgrest_execute_method.side_effect = [
        first_execute_response,  # for the update() call
        second_execute_response  # for the select() call
    ]

    response = client.put(f"/tasks/{task_id}", json=update_data)

    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to update this task."
    assert mock_supabase_service._mock_postgrest_execute_method.call_count == 2


@pytest.mark.asyncio
async def test_delete_task_success(mock_supabase_service: SupabaseService, mock_auth_dependency_override):
    """
    Delete a task for the authenticated user.
    """
    user_id = mock_auth_dependency_override["id"]
    task_id = str(uuid.uuid4())  # Valid UUID

    delete_execute_response = MagicMock(
        data=[], status_code=status.HTTP_204_NO_CONTENT)
    mock_supabase_service._mock_postgrest_execute_method.return_value = delete_execute_response

    response = client.delete(f"/tasks/{task_id}")

    assert response.status_code == 204
    mock_supabase_service.client.table.assert_called_with('tasks')
    mock_supabase_service._mock_postgrest_chainable.delete.assert_called_once()
    mock_supabase_service._mock_postgrest_chainable.eq.assert_any_call(
        'id', task_id)
    mock_supabase_service._mock_postgrest_chainable.eq.assert_any_call(
        'user_id', user_id)
    mock_supabase_service._mock_postgrest_execute_method.assert_called_once()


@pytest.mark.asyncio
async def test_delete_task_not_found(mock_supabase_service: SupabaseService, mock_auth_dependency_override):
    """
    Given a non-existent task ID and an authenticated user,
    When a DELETE request is made to /tasks/{task_id},
    Then it should return 404 Not Found.
    """
    user_id = mock_auth_dependency_override["id"]
    task_id = str(uuid.uuid4())  # Valid UUID but non-existent

    # Not 204 because no item was deleted
    first_execute_response = MagicMock(data=[], status_code=status.HTTP_200_OK)
    second_execute_response = MagicMock(
        data=[], status_code=status.HTTP_200_OK)

    mock_supabase_service._mock_postgrest_execute_method.side_effect = [
        first_execute_response,  # for the delete() call
        second_execute_response  # for the select() call
    ]

    response = client.delete(f"/tasks/{task_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found."
    assert mock_supabase_service._mock_postgrest_execute_method.call_count == 2


@pytest.mark.asyncio
async def test_delete_task_forbidden(mock_supabase_service: SupabaseService, mock_auth_dependency_override):
    """
    Given an existing task ID belonging to another user,
    When a DELETE request is made to /tasks/{task_id} by a different user,
    Then it should return 403 Forbidden.
    """
    user_id = mock_auth_dependency_override["id"]
    task_id = str(uuid.uuid4())  # Valid UUID but for another user

    first_execute_response = MagicMock(data=[], status_code=status.HTTP_200_OK)
    second_execute_response = MagicMock(
        data=[{"id": task_id}], status_code=status.HTTP_200_OK)

    mock_supabase_service._mock_postgrest_execute_method.side_effect = [
        first_execute_response,  # for the delete() call
        second_execute_response  # for the select() call
    ]

    response = client.delete(f"/tasks/{task_id}")

    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to delete this task."
    assert mock_supabase_service._mock_postgrest_execute_method.call_count == 2
