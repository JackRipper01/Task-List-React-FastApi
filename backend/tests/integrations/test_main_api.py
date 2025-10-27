# project/backend/tests/integration/test_main_api.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone
from src.main import app  # Import your FastAPI app
from src.services.supabase import SupabaseService
from supabase_auth.errors import AuthApiError
from fastapi import HTTPException  # For mocking dependency errors

client = TestClient(app)

# Fixture to reset the SupabaseService singleton instance for each test


@pytest.fixture(autouse=True)
def reset_supabase_service_singleton():
    """Resets the SupabaseService singleton before each test."""
    SupabaseService._instance = None
    SupabaseService._supabase_client = None

# Mock SupabaseService for all API tests to prevent actual Supabase calls


@pytest.fixture
def mock_supabase_service(mocker):
    """Mocks the SupabaseService and its internal client for API integration tests."""
    # Ensure a fresh SupabaseService is created for each test via the singleton reset
    service = SupabaseService()
    service.is_initialized = True
    # Mock the internal supabase client methods used by the API endpoints
    service._supabase_client = MagicMock()
    return service

# Mock `get_current_user` dependency for authenticated endpoints


@pytest.fixture
def mock_auth_dependency(mocker):
    """Mocks the get_current_user dependency to return a consistent authenticated user."""
    mock_user = {"id": "test_user_id", "email": "test@example.com"}
    mocker.patch("src.dependencies.get_current_user", return_value=mock_user)
    return mock_user

# --- Authentication Endpoints ---


def test_read_root():
    """
    Given the root endpoint,
    When a GET request is made,
    Then it should return a welcome message.
    """
    # Act
    response = client.get("/")
    # Assert
    assert response.status_code == 200
    assert response.json() == {"message": "FastAPI is running!"}


@pytest.mark.asyncio
async def test_signup_success(mock_supabase_service):
    """
    Given valid signup credentials,
    When a POST request is made to /auth/signup,
    Then it should return auth data with status 201.
    """
    # Arrange
    signup_data = {"email": "newuser@example.com", "password": "password123"}
    mock_supabase_service.sign_up = AsyncMock(return_value={
        "user": {"id": "user123", "email": signup_data["email"]},
        "session": {"access_token": "abc", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "def"}
    })

    # Act
    response = client.post("/auth/signup", json=signup_data)

    # Assert
    assert response.status_code == 201
    assert "access_token" in response.json()
    assert response.json()["user"]["email"] == signup_data["email"]
    mock_supabase_service.sign_up.assert_awaited_once_with(
        signup_data["email"], signup_data["password"])


@pytest.mark.asyncio
async def test_signup_auth_api_error(mock_supabase_service):
    """
    Given signup fails due to Supabase AuthApiError (e.g., duplicate user),
    When a POST request is made to /auth/signup,
    Then it should return 401 with the error message.
    """
    # Arrange
    signup_data = {"email": "existing@example.com", "password": "password123"}
    mock_supabase_service.sign_up = AsyncMock(
        side_effect=AuthApiError("User already registered", 400))

    # Act
    response = client.post("/auth/signup", json=signup_data)

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"] == "User already registered"
    mock_supabase_service.sign_up.assert_awaited_once()


@pytest.mark.asyncio
async def test_signup_service_unavailable(mock_supabase_service):
    """
    Given SupabaseService is not initialized,
    When a POST request is made to /auth/signup,
    Then it should return 503.
    """
    # Arrange
    mock_supabase_service.is_initialized = False
    signup_data = {"email": "test@example.com", "password": "password123"}

    # Act
    response = client.post("/auth/signup", json=signup_data)

    # Assert
    assert response.status_code == 503
    assert response.json()[
        "detail"] == "Authentication service is not initialized."
    mock_supabase_service.sign_up.assert_not_awaited()


@pytest.mark.asyncio
async def test_login_success(mock_supabase_service):
    """
    Given valid login credentials,
    When a POST request is made to /auth/login,
    Then it should return auth data.
    """
    # Arrange
    login_data = {"email": "test@example.com", "password": "password123"}
    mock_supabase_service.sign_in = AsyncMock(return_value={
        "user": {"id": "user123", "email": login_data["email"]},
        "session": {"access_token": "abc", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "def"}
    })

    # Act
    response = client.post("/auth/login", json=login_data)

    # Assert
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["user"]["email"] == login_data["email"]
    mock_supabase_service.sign_in.assert_awaited_once_with(
        login_data["email"], login_data["password"])


@pytest.mark.asyncio
async def test_login_auth_api_error(mock_supabase_service):
    """
    Given invalid login credentials,
    When a POST request is made to /auth/login,
    Then it should return 401 with the error message.
    """
    # Arrange
    login_data = {"email": "test@example.com", "password": "wrongpassword"}
    mock_supabase_service.sign_in = AsyncMock(
        side_effect=AuthApiError("Invalid login credentials", 400))

    # Act
    response = client.post("/auth/login", json=login_data)

    # Assert
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid login credentials"
    mock_supabase_service.sign_in.assert_awaited_once()


@pytest.mark.asyncio
async def test_login_service_unavailable(mock_supabase_service):
    """
    Given SupabaseService is not initialized,
    When a POST request is made to /auth/login,
    Then it should return 503.
    """
    # Arrange
    mock_supabase_service.is_initialized = False
    login_data = {"email": "test@example.com", "password": "password123"}

    # Act
    response = client.post("/auth/login", json=login_data)

    # Assert
    assert response.status_code == 503
    assert response.json()[
        "detail"] == "Authentication service is not initialized."
    mock_supabase_service.sign_in.assert_not_awaited()

# --- Task Endpoints ---


@pytest.mark.asyncio
async def test_read_tasks_success(mock_supabase_service, mock_auth_dependency):
    """
    Given an authenticated user,
    When a GET request is made to /tasks/,
    Then it should return the user's tasks.
    """
    # Arrange
    user_id = mock_auth_dependency["id"]
    test_tasks = [
        {"id": "task1", "user_id": user_id, "text": "Buy groceries", "completed": False,
            "created_at": "2023-01-01T10:00:00+00:00", "updated_at": "2023-01-01T10:00:00+00:00"},
        {"id": "task2", "user_id": user_id, "text": "Walk the dog", "completed": True,
            "created_at": "2023-01-02T11:00:00+00:00", "updated_at": "2023-01-02T11:00:00+00:00"},
    ]
    # Mock Supabase client's chain calls
    mock_supabase_service.client.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = test_tasks

    # Act
    response = client.get("/tasks/")

    # Assert
    assert response.status_code == 200
    assert len(response.json()) == 2
    assert response.json()[0]["text"] == "Buy groceries"
    mock_supabase_service.client.table.assert_called_with('tasks')
    mock_supabase_service.client.table.return_value.select.assert_called_with(
        '*')
    mock_supabase_service.client.table.return_value.select.return_value.eq.assert_called_with(
        'user_id', user_id)


@pytest.mark.asyncio
async def test_read_tasks_unauthorized():
    """
    Given no authentication,
    When a GET request is made to /tasks/,
    Then it should return 401 Unauthorized.
    """
    # Arrange: Temporarily override the dependency to simulate unauthorized access
    with patch("src.dependencies.get_current_user", side_effect=HTTPException(status_code=401, detail="Unauthorized")):
        # Act
        response = client.get("/tasks/")
        # Assert
        assert response.status_code == 401
        assert response.json()["detail"] == "Unauthorized"


@pytest.mark.asyncio
async def test_create_task_success(mock_supabase_service, mock_auth_dependency):
    """
    Given a new task and an authenticated user,
    When a POST request is made to /tasks/,
    Then it should create the task and return it.
    """
    # Arrange
    user_id = mock_auth_dependency["id"]
    new_task_data = {"text": "New task text", "completed": False}
    # Mock the response from Supabase insert
    inserted_task = {
        "id": "new_task_id",
        "user_id": user_id,
        "text": new_task_data["text"],
        "completed": new_task_data["completed"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    mock_supabase_service.client.table.return_value.insert.return_value.execute.return_value.data = [
        inserted_task]

    # Act
    response = client.post("/tasks/", json=new_task_data)

    # Assert
    assert response.status_code == 201
    assert response.json()["text"] == new_task_data["text"]
    assert response.json()["user_id"] == user_id
    mock_supabase_service.client.table.assert_called_with('tasks')
    mock_supabase_service.client.table.return_value.insert.assert_called_once()


@pytest.mark.asyncio
async def test_create_task_unauthorized():
    """
    Given a new task and no authentication,
    When a POST request is made to /tasks/,
    Then it should return 401 Unauthorized.
    """
    # Arrange: Override the dependency to simulate unauthorized access
    with patch("src.dependencies.get_current_user", side_effect=HTTPException(status_code=401, detail="Unauthorized")):
        # Act
        response = client.post(
            "/tasks/", json={"text": "Unauthorized task", "completed": False})
        # Assert
        assert response.status_code == 401
        assert response.json()["detail"] == "Unauthorized"


@pytest.mark.asyncio
async def test_update_task_success(mock_supabase_service, mock_auth_dependency):
    """
    Given an existing task ID, update data, and an authenticated user,
    When a PUT request is made to /tasks/{task_id},
    Then it should update the task and return it.
    """
    # Arrange
    user_id = mock_auth_dependency["id"]
    task_id = "existing_task_id"
    update_data = {"text": "Updated task text", "completed": True}
    updated_task_in_db = {
        "id": task_id,
        "user_id": user_id,
        "text": update_data["text"],
        "completed": update_data["completed"],
        "created_at": "2023-01-01T10:00:00+00:00",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    # Mock Supabase client's chain calls for update
    mock_supabase_service.client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        updated_task_in_db]

    # Act
    response = client.put(f"/tasks/{task_id}", json=update_data)

    # Assert
    assert response.status_code == 200
    assert response.json()["text"] == update_data["text"]
    assert response.json()["completed"] == update_data["completed"]
    mock_supabase_service.client.table.return_value.update.assert_called_once()
    mock_supabase_service.client.table.return_value.update.return_value.eq.return_value.eq.assert_called_with(
        'user_id', user_id)


@pytest.mark.asyncio
async def test_update_task_not_found(mock_supabase_service, mock_auth_dependency):
    """
    Given a non-existent task ID and an authenticated user,
    When a PUT request is made to /tasks/{task_id},
    Then it should return 404 Not Found.
    """
    # Arrange
    task_id = "non_existent_id"
    update_data = {"text": "Attempt update", "completed": False}

    # Mock no data returned for the update operation
    mock_supabase_service.client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    # Mock no data returned for the subsequent existence check
    mock_supabase_service.client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    # Act
    response = client.put(f"/tasks/{task_id}", json=update_data)

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found."


@pytest.mark.asyncio
async def test_update_task_forbidden(mock_supabase_service, mock_auth_dependency):
    """
    Given an existing task ID belonging to another user,
    When a PUT request is made to /tasks/{task_id} by a different user,
    Then it should return 403 Forbidden.
    """
    # Arrange
    user_id = mock_auth_dependency["id"]
    task_id = "task_of_another_user"
    update_data = {"text": "Attempt update", "completed": False}

    # Mock that the update operation for this user_id returns no data (because the user_id filter didn't match)
    mock_supabase_service.client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    # Mock that the task *does* exist when checked by ID (to differentiate from not found)
    mock_supabase_service.client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": task_id}]

    # Act
    response = client.put(f"/tasks/{task_id}", json=update_data)

    # Assert
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to update this task."


@pytest.mark.asyncio
async def test_delete_task_success(mock_supabase_service, mock_auth_dependency):
    """
    Given an existing task ID and an authenticated user,
    When a DELETE request is made to /tasks/{task_id},
    Then it should delete the task and return 204 No Content.
    """
    # Arrange
    user_id = mock_auth_dependency["id"]
    task_id = "task_to_delete"
    # For a successful delete, Supabase often returns data=None and status_code=204
    mock_delete_response = MagicMock()
    mock_delete_response.data = None
    # This property is not directly used in your main.py but good to have
    mock_delete_response.status_code = 204
    mock_supabase_service.client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = mock_delete_response

    # Act
    response = client.delete(f"/tasks/{task_id}")

    # Assert
    assert response.status_code == 204
    # Your logic implicitly returns None, which FastAPI translates to 204.
    mock_supabase_service.client.table.return_value.delete.assert_called_once()
    mock_supabase_service.client.table.return_value.delete.return_value.eq.return_value.eq.assert_called_with(
        'user_id', user_id)


@pytest.mark.asyncio
async def test_delete_task_not_found(mock_supabase_service, mock_auth_dependency):
    """
    Given a non-existent task ID and an authenticated user,
    When a DELETE request is made to /tasks/{task_id},
    Then it should return 404 Not Found.
    """
    # Arrange
    task_id = "non_existent_id"
    # Mock delete operation to return no data
    mock_delete_response = MagicMock()
    mock_delete_response.data = []  # No data means no rows deleted
    mock_supabase_service.client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = mock_delete_response

    # Mock no data returned for subsequent existence check
    mock_supabase_service.client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    # Act
    response = client.delete(f"/tasks/{task_id}")

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found."


@pytest.mark.asyncio
async def test_delete_task_forbidden(mock_supabase_service, mock_auth_dependency):
    """
    Given an existing task ID belonging to another user,
    When a DELETE request is made to /tasks/{task_id} by a different user,
    Then it should return 403 Forbidden.
    """
    # Arrange
    user_id = mock_auth_dependency["id"]
    task_id = "task_of_another_user"

    # Mock that the delete operation for this user_id returns no data (because the user_id filter didn't match)
    mock_delete_response = MagicMock()
    mock_delete_response.data = []
    mock_supabase_service.client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = mock_delete_response

    # Mock that the task *does* exist when checked by ID (to differentiate from not found)
    mock_supabase_service.client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": task_id}]

    # Act
    response = client.delete(f"/tasks/{task_id}")

    # Assert
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to delete this task."
