# project/backend/tests/unit/test_supabase_service.py
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from supabase import Client
from supabase_auth.errors import AuthApiError

from src.services.supabase import SupabaseService
import src.config  # Import config for direct patching


# Fixture to mock `create_client` for initialization tests.
@pytest.fixture
def mock_create_client_only(mocker):
    """
    Mocks the `create_client` function that SupabaseService's _initialize_supabase calls.
    """
    mock_client_factory = mocker.patch('src.services.supabase.create_client')
    mock_client_instance = MagicMock(spec=Client)
    mock_client_factory.return_value = mock_client_instance
    yield mock_client_factory, mock_client_instance



# Test for initialization failure (e.g., connection error)
@pytest.mark.asyncio
async def test_supabase_service_initialization_failure(mock_create_client_only):
    """
    Given an error occurs during Supabase client creation,
    When SupabaseService is initialized,
    Then it should not be initialized.
    """
    mock_create_client_factory, _ = mock_create_client_only

    # Force an exception when create_client is called by _initialize_supabase
    mock_create_client_factory.side_effect = Exception(
        "Simulated connection error")

    # Act
    service = SupabaseService()  # This call attempts to initialize

    # Assert
    assert not service.is_initialized
    # create_client should have been called
    mock_create_client_factory.assert_called_once()
    with pytest.raises(RuntimeError, match="Supabase client is not initialized."):
        _ = service.client


# Fixture for testing SupabaseService methods (sign_up, sign_in, etc.)
# This fixture needs `mocker` because it's function-scoped and performs patching.
@pytest.fixture
def mock_supabase_service_for_methods(mocker):  # Add mocker to parameters
    """
    Mocks the SupabaseService instance for method-level tests (sign_up, sign_in, get_user_by_token).
    Ensures the service is initialized with a mock client, and its auth methods are properly mocked.
    """
    # Ensure a fresh singleton for each test
    SupabaseService._instance = None
    SupabaseService._supabase_client = None

    # Temporarily patch src.config values to ensure initialization can happen
    # This is important in case `SupabaseService()` is called and initializes `_supabase_client`
    # before its methods are patched. These patches are handled by 'mocker' and are function-scoped.
    mocker.patch.object(src.config, 'SUPABASE_URL', "http://test_supabase.url")
    mocker.patch.object(src.config, 'SUPABASE_KEY', "test_supabase_key")

    service = SupabaseService()
    # The above call to `SupabaseService()` will trigger `_initialize_supabase` using the
    # `src.config` values (either from global conftest mock or the local mocker patches here).
    # Then we override `_supabase_client` with our specific `MagicMock` for precise control.
    service._supabase_client = MagicMock(spec=Client)

    # Mock the auth object and its methods.
    mock_auth = MagicMock()

    mock_auth_response_for_service = MagicMock()
    mock_auth_response_for_service.model_dump.return_value = {
        "user": {"id": "user123", "email": "test@example.com"},
        "session": {"access_token": "abc", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "def"}
    }

    mock_auth.sign_up.return_value = mock_auth_response_for_service
    mock_auth.sign_in_with_password.return_value = mock_auth_response_for_service

    mock_user_response_obj = MagicMock()
    mock_user_response_obj.user = MagicMock()
    mock_user_response_obj.user.model_dump.return_value = {
        "id": "user123", "email": "test@example.com"}
    mock_auth.get_user.return_value = mock_user_response_obj

    service._supabase_client.auth = mock_auth

    yield service


@pytest.mark.asyncio
async def test_sign_up_success(mock_supabase_service_for_methods: SupabaseService):
    mock_auth = mock_supabase_service_for_methods.client.auth
    response = await mock_supabase_service_for_methods.sign_up("test@example.com", "password123")
    mock_auth.sign_up.assert_called_once_with({
        "email": "test@example.com",
        "password": "password123"
    })
    assert response["user"]["email"] == "test@example.com"
    assert response["session"]["access_token"] == "abc"


@pytest.mark.asyncio
async def test_sign_up_auth_api_error(mock_supabase_service_for_methods: SupabaseService):
    mock_auth = mock_supabase_service_for_methods.client.auth
    mock_auth.sign_up.side_effect = AuthApiError(
        message="Duplicate user", status=400, code="400")
    with pytest.raises(AuthApiError, match="Duplicate user"):
        await mock_supabase_service_for_methods.sign_up("test@example.com", "password123")
    mock_auth.sign_up.assert_called_once()


@pytest.mark.asyncio
async def test_sign_in_success(mock_supabase_service_for_methods: SupabaseService):
    mock_auth = mock_supabase_service_for_methods.client.auth
    response = await mock_supabase_service_for_methods.sign_in("test@example.com", "password123")
    mock_auth.sign_in_with_password.assert_called_once_with({
        "email": "test@example.com",
        "password": "password123"
    })
    assert response["user"]["email"] == "test@example.com"
    assert response["session"]["access_token"] == "abc"


@pytest.mark.asyncio
async def test_sign_in_auth_api_error(mock_supabase_service_for_methods: SupabaseService):
    mock_auth = mock_supabase_service_for_methods.client.auth
    mock_auth.sign_in_with_password.side_effect = AuthApiError(
        message="Invalid credentials", status=400, code="400")
    with pytest.raises(AuthApiError, match="Invalid credentials"):
        await mock_supabase_service_for_methods.sign_in("test@example.com", "wrongpassword")
    mock_auth.sign_in_with_password.assert_called_once()


@pytest.mark.asyncio
async def test_get_user_by_token_success(mock_supabase_service_for_methods: SupabaseService):
    mock_auth = mock_supabase_service_for_methods.client.auth
    user_data = await mock_supabase_service_for_methods.get_user_by_token("valid_jwt")
    mock_auth.get_user.assert_called_once_with("valid_jwt")
    assert user_data["id"] == "user123"
    assert user_data["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_get_user_by_token_invalid(mock_supabase_service_for_methods: SupabaseService):
    mock_auth = mock_supabase_service_for_methods.client.auth
    mock_auth.get_user.side_effect = AuthApiError(
        message="Invalid JWT", status=401, code="401")
    user_data = await mock_supabase_service_for_methods.get_user_by_token("invalid_jwt")
    mock_auth.get_user.assert_called_once_with("invalid_jwt")
    assert user_data is None


@pytest.mark.asyncio
async def test_get_user_by_token_unexpected_error(mock_supabase_service_for_methods: SupabaseService):
    mock_auth = mock_supabase_service_for_methods.client.auth
    mock_auth.get_user.side_effect = Exception("Network error")
    user_data = await mock_supabase_service_for_methods.get_user_by_token("some_jwt")
    mock_auth.get_user.assert_called_once_with("some_jwt")
    assert user_data is None
