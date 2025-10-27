# project/backend/tests/conftest.py
from src.main import app  # Import app to clear overrides
from src.services.supabase import SupabaseService
import pytest
from unittest.mock import patch
import os

# IMPORTANT: Capture the REAL os.getenv before any patching occurs.
_real_os_getenv = os.getenv


@pytest.fixture(autouse=True, scope='session')
def mock_os_getenv_supabase_vars_globally():
    """
    Patches os.getenv for SUPABASE_URL and SUPABASE_KEY globally for the session.
    This ensures src.config (and thus SupabaseService) reads mocked values when
    they are first imported during the test session.
    """
    with patch('os.getenv') as mock_getenv:
        def custom_getenv(key, default=None):
            if key == "SUPABASE_URL":
                return "http://test_supabase.url"
            if key == "SUPABASE_KEY":
                return "test_supabase_key"
            # Fallback to real getenv for others
            return _real_os_getenv(key, default)

        mock_getenv.side_effect = custom_getenv
        yield


# Safely import after os.getenv is patched by the session-scoped fixture.


@pytest.fixture(autouse=True)
def reset_supabase_service_singleton_and_fastapi_overrides():
    """
    Resets the SupabaseService singleton and FastAPI dependency overrides before each test.
    This ensures a clean state for each test.
    """
    # Directly set the instance and client to None.
    # The next call to SupabaseService() will trigger re-initialization.
    SupabaseService._instance = None
    SupabaseService._supabase_client = None
    app.dependency_overrides = {}  # Clear FastAPI dependency overrides
    yield
    # Clean up after the test (already covered, but good to be explicit)
    app.dependency_overrides = {}
