# project/backend/tests/integration/test_main_api.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone
from src.main import app  # Import your FastAPI app
from src.services.supabase import SupabaseService
from supabase_auth.errors import AuthApiError
from fastapi import HTTPException, status, Depends
# Import original dependency
from src.dependencies import get_current_user as original_get_current_user

client = TestClient(app)

# Helper function for dependencies that raise HTTPExceptions


def _raise_http_exception(status_code: int, detail: str):
    raise HTTPException(status_code=status_code, detail=detail)


# Mock SupabaseService for all API tests to prevent actual Supabase calls
@pytest.fixture
def mock_supabase_service(mocker):
    """Mocks the SupabaseService and its internal client for API integration tests."""
    service = SupabaseService()  # This will ensure _initialize_supabase is run

    # Create a mock for the internal Supabase client
    mock_supabase_client_instance = MagicMock()

    # --- Mock Auth methods (sign_up, sign_in_with_password, get_user) ---
    # These methods are synchronous in supabase-py, but SupabaseService wraps them in async def.
    # So we mock the underlying sync methods, but the service's own methods will be awaited.
    mock_auth_client = MagicMock()

    # The actual supabase-py client's auth methods return Pydantic models directly.
    # SupabaseService then calls .model_dump() on that result.
    # So, we need to mock these methods to return objects that *have* a .model_dump() method.

    # For sign_up and sign_in_with_password:
    mock_auth_client.sign_up = MagicMock()
    mock_auth_client.sign_in_with_password = MagicMock()

    # For get_user: returns an object that has a .user attribute, and .user has .model_dump()
    mock_user_response_obj_for_get_user = MagicMock()
    mock_user_response_obj_for_get_user.user = MagicMock()
    mock_user_response_obj_for_get_user.user.model_dump.return_value = {}  # Default empty
    mock_auth_client.get_user = MagicMock(
        return_value=mock_user_response_obj_for_get_user)

    mock_supabase_client_instance.auth = mock_auth_client

    # --- Mock Postgrest client chain calls (.table().select().eq().order().execute()) ---
    # We need to control the `execute()` return values dynamically based on the test.
    # So, we make `execute` itself a MagicMock that can have its `side_effect` configured.
    mock_chainable = MagicMock()
    mock_chainable.select.return_value = mock_chainable
    mock_chainable.insert.return_value = mock_chainable
    mock_chainable.update.return_value = mock_chainable
    mock_chainable.delete.return_value = mock_chainable
    mock_chainable.eq.return_value = mock_chainable
    mock_chainable.order.return_value = mock_chainable

    # Configure execute to be a MagicMock itself, so we can set its side_effect later
    mock_chainable.execute = MagicMock()

    # When client.table('tasks') is called, it should return our mock_chainable.
    mock_supabase_client_instance.table.return_value = mock_chainable

    service._supabase_client = mock_supabase_client_instance

    # Expose individual mocks for easier configuration in tests
    service._mock_auth_client = mock_auth_client
    service._mock_user_response_obj_for_get_user = mock_user_response_obj_for_get_user
    service._mock_postgrest_chainable = mock_chainable  # Expose the chainable mock
    # Expose the execute method for side_effect
    service._mock_postgrest_execute_method = mock_chainable.execute

    yield service


# Mock `get_current_user` dependency for authenticated endpoints
@pytest.fixture
def mock_auth_dependency_override():
    """
    Mocks the get_current_user dependency using FastAPI's dependency_overrides.
    This ensures that authenticated endpoints receive a consistent mocked user.
    """
    mock_user = {"id": "test_user_id", "email": "test@example.com"}

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
async def test_signup_success(mock_supabase_service):
    """
    Given valid signup credentials,
    When a POST request is made to /auth/signup,
    Then it should return auth data with status 201.
    """
    signup_data = {"email": "newuser@example.com", "password": "password123"}

    mock_auth_response_for_service = MagicMock()
    mock_auth_response_for_service.model_dump.return_value = {
        "user": {"id": "user123", "email": signup_data["email"]},
        "session": {"access_token": "abc", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "def"}
    }
    # This is mocking the *result* of the synchronous call `self.client.auth.sign_up`
    mock_supabase_service._mock_auth_client.sign_up.return_value = mock_auth_response_for_service

    response = client.post("/auth/signup", json=signup_data)

    assert response.status_code == 201
    assert "access_token" in response.json()
    assert response.json()["user"]["email"] == signup_data["email"]
    # We assert on the actual synchronous client method, not the async service method
    mock_supabase_service._mock_auth_client.sign_up.assert_called_once_with(
        {"email": signup_data["email"], "password": signup_data["password"]})


@pytest.mark.asyncio
async def test_signup_auth_api_error(mock_supabase_service):
    """
    Given signup fails due to Supabase AuthApiError (e.g., duplicate user),
    When a POST request is made to /auth/signup,
    Then it should return 401 with the error message.
    """
    signup_data = {"email": "existing@example.com", "password": "password123"}
    # Fix: Pass message, status, and code explicitly as keyword arguments
    mock_supabase_service._mock_auth_client.sign_up.side_effect = AuthApiError(
        message="User already registered", status=400, code="400")

    response = client.post("/auth/signup", json=signup_data)

    assert response.status_code == 401
    assert response.json()["detail"] == "User already registered"
    mock_supabase_service._mock_auth_client.sign_up.assert_called_once()


@pytest.mark.asyncio
async def test_signup_service_unavailable(mock_supabase_service):
    """
    Given SupabaseService is not initialized,
    When a POST request is made to /auth/signup,
    Then it should return 503.
    """
    # To simulate service unavailable, set the internal client to None
    mock_supabase_service._supabase_client = None
    signup_data = {"email": "test@example.com", "password": "password123"}

    response = client.post("/auth/signup", json=signup_data)

    assert response.status_code == 503
    assert response.json()[
        "detail"] == "Authentication service is not initialized."
    mock_supabase_service._mock_auth_client.sign_up.assert_not_called()


@pytest.mark.asyncio
async def test_login_success(mock_supabase_service):
    """
    Given valid login credentials,
    When a POST request is made to /auth/login,
    Then it should return auth data.
    """
    login_data = {"email": "test@example.com", "password": "password123"}

    mock_auth_response_for_service = MagicMock()
    mock_auth_response_for_service.model_dump.return_value = {
        "user": {"id": "user123", "email": login_data["email"]},
        "session": {"access_token": "abc", "token_type": "Bearer", "expires_in": 3600, "refresh_token": "def"}
    }
    mock_supabase_service._mock_auth_client.sign_in_with_password.return_value = mock_auth_response_for_service

    response = client.post("/auth/login", json=login_data)

    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["user"]["email"] == login_data["email"]
    mock_supabase_service._mock_auth_client.sign_in_with_password.assert_called_once_with(
        {"email": login_data["email"], "password": login_data["password"]})


@pytest.mark.asyncio
async def test_login_auth_api_error(mock_supabase_service):
    """
    Given invalid login credentials,
    When a POST request is made to /auth/login,
    Then it should return 401 with the error message.
    """
    login_data = {"email": "test@example.com", "password": "wrongpassword"}
    # Fix: Pass message, status, and code explicitly as keyword arguments
    mock_supabase_service._mock_auth_client.sign_in_with_password.side_effect = AuthApiError(
        message="Invalid login credentials", status=400, code="400")

    response = client.post("/auth/login", json=login_data)

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid login credentials"
    mock_supabase_service._mock_auth_client.sign_in_with_password.assert_called_once()


@pytest.mark.asyncio
async def test_login_service_unavailable(mock_supabase_service):
    """
    Given SupabaseService is not initialized,
    When a POST request is made to /auth/login,
    Then it should return 503.
    """
    # To simulate service unavailable, set the internal client to None
    mock_supabase_service._supabase_client = None
    login_data = {"email": "test@example.com", "password": "password123"}

    response = client.post("/auth/login", json=login_data)

    assert response.status_code == 503
    assert response.json()[
        "detail"] == "Authentication service is not initialized."
    mock_supabase_service._mock_auth_client.sign_in_with_password.assert_not_called()

# --- Task Endpoints ---


@pytest.mark.asyncio
async def test_read_tasks_success(mock_supabase_service, mock_auth_dependency_override):
    """
    Retrieve all tasks for the authenticated user.
    """
    user_id = mock_auth_dependency_override["id"]
    test_tasks = [
        {"id": "c76a1727-4402-4c28-bb73-8a03a74360e2", "user_id": user_id, "text": "Buy groceries", "completed": False,
            "created_at": "2023-01-01T10:00:00+00:00", "updated_at": "2023-01-01T10:00:00+00:00"},
        {"id": "a9d5e3f4-0b1c-4e7a-9f8d-6c5b4a3f2e1d", "user_id": user_id, "text": "Walk the dog", "completed": True,
            "created_at": "2023-01-02T11:00:00+00:00", "updated_at": "2023-01-02T11:00:00+00:00"},
    ]
    # Configure the `execute` method's return value
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
    # Fix: Dependency should raise the HTTPException, not return it.
    app.dependency_overrides[original_get_current_user] = lambda: _raise_http_exception(
        status.HTTP_401_UNAUTHORIZED, "Unauthorized")
    response = client.get("/tasks/")
    assert response.status_code == 401
    assert response.json()["detail"] == "Unauthorized"
    # Ensure overrides are cleaned up by the autouse fixture.


@pytest.mark.asyncio
async def test_create_task_success(mock_supabase_service, mock_auth_dependency_override):
    """
    Create a new task for the authenticated user.
    """
    user_id = mock_auth_dependency_override["id"]
    new_task_data = {"text": "New task text", "completed": False}
    # Use a string that is a valid UUID to avoid `invalid input syntax for type uuid` errors
    inserted_task_id = "e6e3c5d7-b8f1-4a92-9a07-8e1c3b5d7a9f"
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
    # Configure the `execute` method's return value
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
    # Fix: Dependency should raise the HTTPException, not return it.
    app.dependency_overrides[original_get_current_user] = lambda: _raise_http_exception(
        status.HTTP_401_UNAUTHORIZED, "Unauthorized")
    response = client.post(
        "/tasks/", json={"text": "Unauthorized task", "completed": False})
    assert response.status_code == 401
    assert response.json()["detail"] == "Unauthorized"


@pytest.mark.asyncio
async def test_update_task_success(mock_supabase_service, mock_auth_dependency_override):
    """
    Update an existing task for the authenticated user.
    """
    user_id = mock_auth_dependency_override["id"]
    task_id = "f8a7d6c5-e4b3-2a10-c9d8-7e6f5d4c3b2a"
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
    # Configure the `execute` method's return value
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
async def test_update_task_not_found(mock_supabase_service, mock_auth_dependency_override):
    """
    Given a non-existent task ID and an authenticated user,
    When a PUT request is made to /tasks/{task_id},
    Then it should return 404 Not Found.
    """
    user_id = mock_auth_dependency_override["id"]
    task_id = "00000000-0000-0000-0000-000000000001"  # Valid UUID but non-existent

    update_data = {"text": "Attempt update", "completed": False}

    # Simulate update finding no rows (first execute call)
    first_execute_response = MagicMock(data=[], status_code=status.HTTP_200_OK)
    # Simulate subsequent select also finding no task (second execute call)
    second_execute_response = MagicMock(
        data=[], status_code=status.HTTP_200_OK)

    # Configure execute to return different values on successive calls
    mock_supabase_service._mock_postgrest_execute_method.side_effect = [
        first_execute_response,  # for the update() call
        second_execute_response  # for the select() call
    ]

    response = client.put(f"/tasks/{task_id}", json=update_data)

    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found."
    # Check both calls occurred
    mock_supabase_service._mock_postgrest_execute_method.assert_called_with()


@pytest.mark.asyncio
async def test_update_task_forbidden(mock_supabase_service, mock_auth_dependency_override):
    """
    Given an existing task ID belonging to another user,
    When a PUT request is made to /tasks/{task_id} by a different user,
    Then it should return 403 Forbidden.
    """
    user_id = mock_auth_dependency_override["id"]
    # Valid UUID but for another user
    task_id = "00000000-0000-0000-0000-000000000002"
    update_data = {"text": "Attempt update", "completed": False}

    # Simulate update finding no rows (because user_id doesn't match)
    first_execute_response = MagicMock(data=[], status_code=status.HTTP_200_OK)
    # Simulate subsequent select finding the task (it exists, just not for this user)
    second_execute_response = MagicMock(
        data=[{"id": task_id}], status_code=status.HTTP_200_OK)

    mock_supabase_service._mock_postgrest_execute_method.side_effect = [
        first_execute_response,  # for the update() call
        second_execute_response  # for the select() call
    ]

    response = client.put(f"/tasks/{task_id}", json=update_data)

    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to update this task."
    # Check both calls occurred
    mock_supabase_service._mock_postgrest_execute_method.assert_called_with()


@pytest.mark.asyncio
async def test_delete_task_success(mock_supabase_service, mock_auth_dependency_override):
    """
    Delete a task for the authenticated user.
    """
    user_id = mock_auth_dependency_override["id"]
    task_id = "00000000-0000-0000-0000-000000000003"  # Valid UUID

    # Simulate a successful delete (no data returned, 204 status)
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
async def test_delete_task_not_found(mock_supabase_service, mock_auth_dependency_override):
    """
    Given a non-existent task ID and an authenticated user,
    When a DELETE request is made to /tasks/{task_id},
    Then it should return 404 Not Found.
    """
    user_id = mock_auth_dependency_override["id"]
    task_id = "00000000-0000-0000-0000-000000000004"  # Valid UUID but non-existent

    # Simulate delete finding no rows (first execute call)
    # Not 204 because no item was deleted
    first_execute_response = MagicMock(data=[], status_code=status.HTTP_200_OK)
    # Simulate subsequent select also finding no task (check_response)
    second_execute_response = MagicMock(
        data=[], status_code=status.HTTP_200_OK)

    mock_supabase_service._mock_postgrest_execute_method.side_effect = [
        first_execute_response,  # for the delete() call
        second_execute_response  # for the select() call
    ]

    response = client.delete(f"/tasks/{task_id}")

    assert response.status_code == 404
    assert response.json()["detail"] == "Task not found."
    mock_supabase_service._mock_postgrest_execute_method.assert_called_with()


@pytest.mark.asyncio
async def test_delete_task_forbidden(mock_supabase_service, mock_auth_dependency_override):
    """
    Given an existing task ID belonging to another user,
    When a DELETE request is made to /tasks/{task_id} by a different user,
    Then it should return 403 Forbidden.
    """
    user_id = mock_auth_dependency_override["id"]
    # Valid UUID but for another user
    task_id = "00000000-0000-0000-0000-000000000005"

    # Simulate delete finding no rows (because user_id doesn't match)
    first_execute_response = MagicMock(data=[], status_code=status.HTTP_200_OK)
    # Simulate subsequent select finding the task (it exists, just not for this user)
    second_execute_response = MagicMock(
        data=[{"id": task_id}], status_code=status.HTTP_200_OK)

    mock_supabase_service._mock_postgrest_execute_method.side_effect = [
        first_execute_response,  # for the delete() call
        second_execute_response  # for the select() call
    ]

    response = client.delete(f"/tasks/{task_id}")

    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized to delete this task."
    mock_supabase_service._mock_postgrest_execute_method.assert_called_with()
