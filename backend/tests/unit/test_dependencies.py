# project/backend/tests/unit/test_dependencies.py
import pytest
from fastapi import HTTPException, status, WebSocket
from fastapi.security import HTTPAuthorizationCredentials
from unittest.mock import MagicMock, AsyncMock, patch

from src.dependencies import get_current_user, get_current_user_ws, supabase_service


# Fixture to reset the supabase_service singleton for each test
@pytest.fixture(autouse=True)
def reset_supabase_service_singleton():
    """Resets the SupabaseService singleton before each test."""
    supabase_service._instance = None
    supabase_service._supabase_client = None

# Mock SupabaseService to control its state and return values


@pytest.fixture
def mock_supabase_service(mocker):
    """Mocks the SupabaseService instance used by dependencies."""
    # Ensure the singleton is initialized (mocked) for the test
    service = supabase_service  # Access the singleton instance
    # Mock the internal supabase client. This makes `service.is_initialized` return True.
    service._supabase_client = MagicMock()
    service.get_user_by_token = AsyncMock()
    return service

# Test cases for get_current_user


@pytest.mark.asyncio
async def test_get_current_user_success(mock_supabase_service):
    """
    Given a valid JWT token,
    When get_current_user is called,
    Then it should return the user data.
    """
    test_token = "valid_jwt_token"
    test_user_data = {"id": "test_user_id", "email": "test@example.com"}
    mock_supabase_service.get_user_by_token.return_value = test_user_data
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer", credentials=test_token)

    user = await get_current_user(credentials)

    mock_supabase_service.get_user_by_token.assert_awaited_once_with(
        test_token)
    assert user == test_user_data


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(mock_supabase_service):
    """
    Given an invalid JWT token,
    When get_current_user is called,
    Then it should raise HTTPException 401.
    """
    test_token = "invalid_jwt_token"
    mock_supabase_service.get_user_by_token.return_value = None
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer", credentials=test_token)

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials)

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc_info.value.detail == "Invalid or expired token."
    mock_supabase_service.get_user_by_token.assert_awaited_once_with(
        test_token)


@pytest.mark.asyncio
async def test_get_current_user_service_unavailable(mock_supabase_service):
    """
    Given SupabaseService is not initialized,
    When get_current_user is called,
    Then it should raise HTTPException 503.
    """
    # To simulate service unavailable, set the internal client to None
    mock_supabase_service._supabase_client = None
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer", credentials="any_token")

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials)

    assert exc_info.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert exc_info.value.detail == "Authentication service is not available."
    mock_supabase_service.get_user_by_token.assert_not_awaited()

# Test cases for get_current_user_ws


@pytest.mark.asyncio
async def test_get_current_user_ws_success(mock_supabase_service):
    """
    Given a WebSocket with a valid token,
    When get_current_user_ws is called,
    Then it should return the user data.
    """
    test_token = "valid_ws_token"
    test_user_data = {"id": "ws_user_id", "email": "ws@example.com"}
    mock_websocket = MagicMock(spec=WebSocket)
    mock_websocket.query_params.get.return_value = test_token
    mock_websocket.close = AsyncMock()

    mock_supabase_service.get_user_by_token.return_value = test_user_data

    user = await get_current_user_ws(mock_websocket)

    mock_websocket.query_params.get.assert_called_once_with("token")
    mock_supabase_service.get_user_by_token.assert_awaited_once_with(
        test_token)
    assert user == test_user_data
    mock_websocket.close.assert_not_awaited()


@pytest.mark.asyncio
async def test_get_current_user_ws_missing_token(mock_supabase_service):
    """
    Given a WebSocket with no token in query parameters,
    When get_current_user_ws is called,
    Then it should close the WebSocket and return None.
    """
    mock_websocket = MagicMock(spec=WebSocket)
    mock_websocket.query_params.get.return_value = None
    mock_websocket.close = AsyncMock()

    user = await get_current_user_ws(mock_websocket)

    mock_websocket.query_params.get.assert_called_once_with("token")
    mock_websocket.close.assert_awaited_once_with(
        code=status.WS_1008_POLICY_VIOLATION, reason="Missing authentication token."
    )
    mock_supabase_service.get_user_by_token.assert_not_awaited()
    assert user is None


@pytest.mark.asyncio
async def test_get_current_user_ws_invalid_token(mock_supabase_service):
    """
    Given a WebSocket with an invalid token,
    When get_current_user_ws is called,
    Then it should close the WebSocket and return None.
    """
    test_token = "invalid_ws_token"
    mock_websocket = MagicMock(spec=WebSocket)
    mock_websocket.query_params.get.return_value = test_token
    mock_websocket.close = AsyncMock()

    mock_supabase_service.get_user_by_token.return_value = None

    user = await get_current_user_ws(mock_websocket)

    mock_websocket.query_params.get.assert_called_once_with("token")
    mock_supabase_service.get_user_by_token.assert_awaited_once_with(
        test_token)
    mock_websocket.close.assert_awaited_once_with(
        code=status.WS_1008_POLICY_VIOLATION, reason="Invalid or expired token."
    )
    assert user is None


@pytest.mark.asyncio
async def test_get_current_user_ws_service_unavailable(mock_supabase_service):
    """
    Given SupabaseService is not initialized,
    When get_current_user_ws is called,
    Then it should close the WebSocket and return None.
    """
    # To simulate service unavailable, set the internal client to None
    mock_supabase_service._supabase_client = None
    mock_websocket = MagicMock(spec=WebSocket)
    mock_websocket.close = AsyncMock()

    user = await get_current_user_ws(mock_websocket)

    mock_websocket.close.assert_awaited_once_with(
        code=status.WS_1011_INTERNAL_ERROR, reason="Auth service unavailable."
    )
    mock_supabase_service.get_user_by_token.assert_not_awaited()
    assert user is None
