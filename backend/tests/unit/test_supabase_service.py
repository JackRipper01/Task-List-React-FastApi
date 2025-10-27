# project/backend/tests/unit/test_supabase_service.py
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from supabase import Client
from supabase_auth.errors import AuthApiError

# Adjust import path based on your project structure
from src.services.supabase import SupabaseService

# Mock environment variables for testing


@pytest.fixture(autouse=True)
def mock_env_vars(mocker):
    """Mocks Supabase environment variables for all tests in this file."""
    mocker.patch.dict('os.environ', {
        'SUPABASE_URL': 'http://test_supabase.url',
        'SUPABASE_KEY': 'test_supabase_key'
    })

# Reset the singleton instance for each test to ensure isolation


@pytest.fixture(autouse=True)
def reset_supabase_service_singleton():
    """Resets the SupabaseService singleton before each test."""
    SupabaseService._instance = None
    SupabaseService._supabase_client = None


@patch('src.services.supabase.create_client')
def test_supabase_service_initialization_success(mock_create_client):
    """
    Given Supabase URL and Key are set,
    When SupabaseService is initialized,
    Then the Supabase client should be created successfully.
    """
    # Arrange
    mock_client_instance = MagicMock(spec=Client)
    mock_create_client.return_value = mock_client_instance

    # Act
    service = SupabaseService()

    # Assert
    assert service.is_initialized
    assert service.client == mock_client_instance
    mock_create_client.assert_called_once_with(
        'http://test_supabase.url', 'test_supabase_key')


@patch('src.services.supabase.create_client')
def test_supabase_service_initialization_missing_env(mock_create_client, mocker):
    """
    Given Supabase URL or Key is missing,
    When SupabaseService is initialized,
    Then it should not be initialized and create_client should not be called.
    """
    # Arrange
    mocker.patch.dict('os.environ', clear=True)  # Clear all env vars
    # Ensure no Supabase env vars are set
    mocker.patch.dict('os.environ', {'SOME_OTHER_VAR': 'value'})

    # Act
    service = SupabaseService()

    # Assert
    assert not service.is_initialized
    mock_create_client.assert_not_called()
    with pytest.raises(RuntimeError, match="Supabase client is not initialized."):
        _ = service.client


@patch('src.services.supabase.create_client')
def test_supabase_service_initialization_failure(mock_create_client):
    """
    Given an error occurs during Supabase client creation,
    When SupabaseService is initialized,
    Then it should not be initialized.
    """
    # Arrange
    mock_create_client.side_effect = Exception("Connection error")

    # Act
    service = SupabaseService()

    # Assert
    assert not service.is_initialized
    mock_create_client.assert_called_once()
    with pytest.raises(RuntimeError, match="Supabase client is not initialized."):
        _ = service.client


@pytest.mark.asyncio
@patch('src.services.supabase.SupabaseService.client')
async def test_sign_up_success(mock_client_property):
    """
    Given valid email and password,
    When sign_up is called,
    Then it should return user and session data.
    """
    # Arrange
    mock_auth = MagicMock()
    mock_client_property.auth = mock_auth
    mock_auth.sign_up.return_value.model_dump.return_value = {
        "user": {"id": "user123", "email": "test@example.com"},
        "session": {"access_token": "abc", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "def"}
    }
    service = SupabaseService()

    # Act
    response = await service.sign_up("test@example.com", "password123")

    # Assert
    mock_auth.sign_up.assert_awaited_once_with({
        "email": "test@example.com",
        "password": "password123"
    })
    assert response["user"]["email"] == "test@example.com"
    assert response["session"]["access_token"] == "abc"


@pytest.mark.asyncio
@patch('src.services.supabase.SupabaseService.client')
async def test_sign_up_auth_api_error(mock_client_property):
    """
    Given sign_up fails with an AuthApiError,
    When sign_up is called,
    Then it should raise the AuthApiError.
    """
    # Arrange
    mock_auth = MagicMock()
    mock_client_property.auth = mock_auth
    mock_auth.sign_up.side_effect = AuthApiError("Duplicate user", 400)
    service = SupabaseService()

    # Act & Assert
    with pytest.raises(AuthApiError, match="Duplicate user"):
        await service.sign_up("test@example.com", "password123")
    mock_auth.sign_up.assert_awaited_once()


@pytest.mark.asyncio
@patch('src.services.supabase.SupabaseService.client')
async def test_sign_in_success(mock_client_property):
    """
    Given valid email and password,
    When sign_in is called,
    Then it should return user and session data.
    """
    # Arrange
    mock_auth = MagicMock()
    mock_client_property.auth = mock_auth
    mock_auth.sign_in_with_password.return_value.model_dump.return_value = {
        "user": {"id": "user123", "email": "test@example.com"},
        "session": {"access_token": "abc", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "def"}
    }
    service = SupabaseService()

    # Act
    response = await service.sign_in("test@example.com", "password123")

    # Assert
    mock_auth.sign_in_with_password.assert_awaited_once_with({
        "email": "test@example.com",
        "password": "password123"
    })
    assert response["user"]["email"] == "test@example.com"
    assert response["session"]["access_token"] == "abc"


@pytest.mark.asyncio
@patch('src.services.supabase.SupabaseService.client')
async def test_sign_in_auth_api_error(mock_client_property):
    """
    Given sign_in fails with an AuthApiError,
    When sign_in is called,
    Then it should raise the AuthApiError.
    """
    # Arrange
    mock_auth = MagicMock()
    mock_client_property.auth = mock_auth
    mock_auth.sign_in_with_password.side_effect = AuthApiError(
        "Invalid credentials", 400)
    service = SupabaseService()

    # Act & Assert
    with pytest.raises(AuthApiError, match="Invalid credentials"):
        await service.sign_in("test@example.com", "wrongpassword")
    mock_auth.sign_in_with_password.assert_awaited_once()


@pytest.mark.asyncio
@patch('src.services.supabase.SupabaseService.client')
async def test_get_user_by_token_success(mock_client_property):
    """
    Given a valid token,
    When get_user_by_token is called,
    Then it should return the user's data.
    """
    # Arrange
    mock_auth = MagicMock()
    mock_user_response = MagicMock()
    mock_user_response.user.model_dump.return_value = {
        "id": "user123", "email": "test@example.com"}
    mock_auth.get_user.return_value = mock_user_response
    mock_client_property.auth = mock_auth
    service = SupabaseService()

    # Act
    user_data = await service.get_user_by_token("valid_jwt")

    # Assert
    mock_auth.get_user.assert_awaited_once_with("valid_jwt")
    assert user_data["id"] == "user123"
    assert user_data["email"] == "test@example.com"


@pytest.mark.asyncio
@patch('src.services.supabase.SupabaseService.client')
async def test_get_user_by_token_invalid(mock_client_property):
    """
    Given an invalid token,
    When get_user_by_token is called,
    Then it should return None.
    """
    # Arrange
    mock_auth = MagicMock()
    mock_auth.get_user.side_effect = AuthApiError("Invalid JWT", 401)
    mock_client_property.auth = mock_auth
    service = SupabaseService()

    # Act
    user_data = await service.get_user_by_token("invalid_jwt")

    # Assert
    mock_auth.get_user.assert_awaited_once_with("invalid_jwt")
    assert user_data is None


@pytest.mark.asyncio
@patch('src.services.supabase.SupabaseService.client')
async def test_get_user_by_token_unexpected_error(mock_client_property):
    """
    Given an unexpected error during token validation,
    When get_user_by_token is called,
    Then it should return None.
    """
    # Arrange
    mock_auth = MagicMock()
    mock_auth.get_user.side_effect = Exception("Network error")
    mock_client_property.auth = mock_auth
    service = SupabaseService()

    # Act
    user_data = await service.get_user_by_token("some_jwt")

    # Assert
    mock_auth.get_user.assert_awaited_once_with("some_jwt")
    assert user_data is None
