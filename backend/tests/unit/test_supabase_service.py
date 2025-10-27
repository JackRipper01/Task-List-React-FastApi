# project/backend/tests/unit/test_supabase_service.py
import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from supabase import Client
from supabase_auth.errors import AuthApiError

# Adjust import path based on your project structure
from src.services.supabase import SupabaseService


# Fixture to reset the SupabaseService singleton instance for each test
# (This fixture is already present in conftest.py and autoused)
# @pytest.fixture(autouse=True)
# def reset_supabase_service_singleton():
#     """Resets the SupabaseService singleton before each test."""
#     SupabaseService._instance = None
#     SupabaseService._supabase_client = None


# Mock SupabaseService's internal `create_client` call
@pytest.fixture
def mock_supabase_create_client_factory(mocker):
    """
    Mocks the `create_client` function that SupabaseService's _initialize_supabase calls.
    It returns a tuple of (mock_create_client_factory, mock_client_instance)
    to allow assertion on the call and control the returned client.
    """
    # Use mocker.patch for easier cleanup
    mock_client_factory = mocker.patch('src.services.supabase.create_client')
    mock_client_instance = MagicMock(spec=Client)
    mock_client_factory.return_value = mock_client_instance
    yield mock_client_factory, mock_client_instance


# Fixture to mock config values for initialization tests specifically.
# This fixture's patches will take precedence over the global os.getenv patch
# from conftest.py *for the duration of the test that uses this fixture*.
@pytest.fixture
def mock_config_for_init_tests(mocker):
    # These values are what create_client should receive.
    mocker.patch('src.config.SUPABASE_URL',
                 'http://test_supabase.url_from_fixture')
    mocker.patch('src.config.SUPABASE_KEY', 'test_supabase_key_from_fixture')


def test_supabase_service_initialization_success_fixed(
        mock_supabase_create_client_factory, mock_config_for_init_tests):
    """
    Given Supabase URL and Key are set (by explicit config patch from fixture),
    When SupabaseService is initialized,
    Then the Supabase client should be created successfully with the mocked values.
    """
    # Arrange
    mock_create_client_factory, mock_client_instance = mock_supabase_create_client_factory

    # Act
    service = SupabaseService()  # This will trigger _initialize_supabase()

    # Assert
    assert service.is_initialized
    assert service.client == mock_client_instance
    mock_create_client_factory.assert_called_once_with(
        'http://test_supabase.url_from_fixture', 'test_supabase_key_from_fixture'
    )


def test_supabase_service_initialization_missing_env_fixed(
        mock_supabase_create_client_factory, mocker):
    """
    Given Supabase URL or Key is missing (by explicit config patch),
    When SupabaseService is initialized,
    Then it should not be initialized and create_client should not be called.
    """
    # Arrange
    mock_create_client_factory, _ = mock_supabase_create_client_factory

    # Patch config variables to be None for this test
    mocker.patch('src.config.SUPABASE_URL', None)
    mocker.patch('src.config.SUPABASE_KEY', None)

    # Act
    service = SupabaseService()  # This will trigger _initialize_supabase()

    # Assert
    assert not service.is_initialized
    # create_client should NOT be called
    mock_create_client_factory.assert_not_called()
    with pytest.raises(RuntimeError, match="Supabase client is not initialized."):
        _ = service.client


@pytest.mark.asyncio
async def test_supabase_service_initialization_failure(
        mock_supabase_create_client_factory, mocker):
    """
    Given an error occurs during Supabase client creation,
    When SupabaseService is initialized,
    Then it should not be initialized.
    """
    # Arrange
    mock_create_client_factory, _ = mock_supabase_create_client_factory

    # Force an exception when create_client is called by _initialize_supabase
    mock_create_client_factory.side_effect = Exception(
        "Simulated connection error")

    # Ensure config values are present so it *tries* to initialize
    mocker.patch('src.config.SUPABASE_URL',
                 'http://test_supabase.url_init_failure')
    mocker.patch('src.config.SUPABASE_KEY', 'test_supabase_key_init_failure')

    # Act
    service = SupabaseService()  # This call attempts to initialize

    # Assert
    assert not service.is_initialized
    # create_client should have been called
    mock_create_client_factory.assert_called_once()
    with pytest.raises(RuntimeError, match="Supabase client is not initialized."):
        _ = service.client


@pytest.fixture
def mock_supabase_service_for_methods(mocker):
    """
    Mocks the SupabaseService instance for method-level tests (sign_up, sign_in, get_user_by_token).
    Ensures the service is initialized with a mock client, and its auth methods are properly mocked.
    """
    # Ensure a fresh singleton for each test
    SupabaseService._instance = None
    SupabaseService._supabase_client = None

    service = SupabaseService()
    # Explicitly set _supabase_client to a MagicMock to simulate it being initialized successfully
    service._supabase_client = MagicMock(spec=Client)  # The root client

    # Mock the auth object and its methods. These methods are sync in supabase-py client.
    mock_auth = MagicMock()

    # For sign_up and sign_in_with_password:
    mock_auth.sign_up = MagicMock()
    mock_auth.sign_in_with_password = MagicMock()

    # For get_user: returns an object that has a .user attribute, and .user has .model_dump()
    mock_user_response_obj = MagicMock()
    mock_user_response_obj.user = MagicMock()
    mock_user_response_obj.user.model_dump.return_value = {}  # Default empty
    mock_auth.get_user = MagicMock(
        return_value=mock_user_response_obj)  # Set return_value here

    service._supabase_client.auth = mock_auth

    yield service


@pytest.mark.asyncio
async def test_sign_up_success(mock_supabase_service_for_methods):
    """
    Given valid email and password,
    When sign_up is called,
    Then it should return user and session data.
    """
    # Arrange
    mock_auth = mock_supabase_service_for_methods.client.auth

    # The mock for `client.auth.sign_up` (a MagicMock) needs a return_value that has .model_dump()
    mock_auth_response_for_service = MagicMock()
    mock_auth_response_for_service.model_dump.return_value = {
        "user": {"id": "user123", "email": "test@example.com"},
        "session": {"access_token": "abc", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "def"}
    }
    mock_auth.sign_up.return_value = mock_auth_response_for_service

    # Act
    response = await mock_supabase_service_for_methods.sign_up("test@example.com", "password123")

    # Assert: assert `assert_called_once_with` on the inner sync mock
    mock_auth.sign_up.assert_called_once_with({
        "email": "test@example.com",
        "password": "password123"
    })
    assert response["user"]["email"] == "test@example.com"
    assert response["session"]["access_token"] == "abc"


@pytest.mark.asyncio
async def test_sign_up_auth_api_error(mock_supabase_service_for_methods):
    """
    Given sign_up fails with an AuthApiError,
    When sign_up is called,
    Then it should raise the AuthApiError.
    """
    # Arrange
    mock_auth = mock_supabase_service_for_methods.client.auth
    # Fix: Pass message, status, and code explicitly as keyword arguments
    mock_auth.sign_up.side_effect = AuthApiError(
        message="Duplicate user", status=400, code="400")

    # Act & Assert
    with pytest.raises(AuthApiError, match="Duplicate user"):
        await mock_supabase_service_for_methods.sign_up("test@example.com", "password123")
    mock_auth.sign_up.assert_called_once()


@pytest.mark.asyncio
async def test_sign_in_success(mock_supabase_service_for_methods):
    """
    Given valid email and password,
    When sign_in is called,
    Then it should return user and session data.
    """
    # Arrange
    mock_auth = mock_supabase_service_for_methods.client.auth

    # The mock for `client.auth.sign_in_with_password` needs a return_value that has .model_dump()
    mock_auth_response_for_service = MagicMock()
    mock_auth_response_for_service.model_dump.return_value = {
        "user": {"id": "user123", "email": "test@example.com"},
        "session": {"access_token": "abc", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "def"}
    }
    mock_auth.sign_in_with_password.return_value = mock_auth_response_for_service

    # Act
    response = await mock_supabase_service_for_methods.sign_in("test@example.com", "password123")

    # Assert: assert `assert_called_once_with` on the inner sync mock
    mock_auth.sign_in_with_password.assert_called_once_with({
        "email": "test@example.com",
        "password": "password123"
    })
    assert response["user"]["email"] == "test@example.com"
    assert response["session"]["access_token"] == "abc"


@pytest.mark.asyncio
async def test_sign_in_auth_api_error(mock_supabase_service_for_methods):
    """
    Given sign_in fails with an AuthApiError,
    When sign_in is called,
    Then it should raise the AuthApiError.
    """
    # Arrange
    mock_auth = mock_supabase_service_for_methods.client.auth
    # Fix: Pass message, status, and code explicitly as keyword arguments
    mock_auth.sign_in_with_password.side_effect = AuthApiError(
        message="Invalid credentials", status=400, code="400")

    # Act & Assert
    with pytest.raises(AuthApiError, match="Invalid credentials"):
        await mock_supabase_service_for_methods.sign_in("test@example.com", "wrongpassword")
    mock_auth.sign_in_with_password.assert_called_once()


@pytest.mark.asyncio
async def test_get_user_by_token_success(mock_supabase_service_for_methods):
    """
    Given a valid token,
    When get_user_by_token is called,
    Then it should return the user's data.
    """
    # Arrange
    mock_auth = mock_supabase_service_for_methods.client.auth

    # The mock for `client.auth.get_user` needs a return_value that has .user.model_dump()
    mock_user_response_obj = MagicMock()
    mock_user_response_obj.user = MagicMock()
    mock_user_response_obj.user.model_dump.return_value = {
        "id": "user123", "email": "test@example.com"}
    mock_auth.get_user.return_value = mock_user_response_obj

    # Act
    user_data = await mock_supabase_service_for_methods.get_user_by_token("valid_jwt")

    # Assert: assert `assert_called_once_with` on the inner sync mock
    mock_auth.get_user.assert_called_once_with(
        "valid_jwt")
    assert user_data["id"] == "user123"
    assert user_data["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_get_user_by_token_invalid(mock_supabase_service_for_methods):
    """
    Given an invalid token,
    When get_user_by_token is called,
    Then it should return None.
    """
    # Arrange
    mock_auth = mock_supabase_service_for_methods.client.auth
    # Fix: Pass message, status, and code explicitly as keyword arguments
    mock_auth.get_user.side_effect = AuthApiError(
        message="Invalid JWT", status=401, code="401")

    # Act
    user_data = await mock_supabase_service_for_methods.get_user_by_token("invalid_jwt")

    # Assert: assert `assert_called_once_with` on the inner sync mock
    mock_auth.get_user.assert_called_once_with(
        "invalid_jwt")
    assert user_data is None


@pytest.mark.asyncio
async def test_get_user_by_token_unexpected_error(mock_supabase_service_for_methods):
    """
    Given an unexpected error during token validation,
    When get_user_by_token is called,
    Then it should return None.
    """
    # Arrange
    mock_auth = mock_supabase_service_for_methods.client.auth
    mock_auth.get_user.side_effect = Exception(
        "Network error")

    # Act
    user_data = await mock_supabase_service_for_methods.get_user_by_token("some_jwt")

    # Assert: assert `assert_called_once_with` on the inner sync mock
    mock_auth.get_user.assert_called_once_with(
        "some_jwt")
    assert user_data is None
