# project/src/dependencies.py

import logging
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status, WebSocket
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from services.supabase import SupabaseService
# Make sure this import is correct
from supabase_auth.errors import AuthApiError

logger = logging.getLogger(__name__)

# Re-use the singleton instance of the SupabaseService
supabase_service = SupabaseService()

# Dependency for standard HTTP endpoints


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        HTTPBearer(bearerFormat="JWT"))
) -> Dict[str, Any]:
    """
    Validates the Bearer token and returns the authenticated user's data.
    Raises HTTPException 401 if the token is invalid or missing.
    """
    if not supabase_service.is_initialized:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service is not available."
        )

    token = credentials.credentials
    user = await supabase_service.get_user_by_token(token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

# Dependency for WebSocket endpoints


async def get_current_user_ws(websocket: WebSocket) -> Optional[Dict[str, Any]]:
    """
    Authenticates a WebSocket connection using a token from query parameters.
    Closes the connection if authentication fails.
    """
    if not supabase_service.is_initialized:
        # It's crucial here that the websocket.close is awaited before returning
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Auth service unavailable.")
        return None

    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token.")
        return None

    user = await supabase_service.get_user_by_token(token)

    if user is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token.")
        return None

    return user
