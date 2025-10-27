# project/backend/tests/conftest.py
from src.services.supabase import SupabaseService
from src.main import app
import pytest
from unittest.mock import patch
import os
import sys

# Patch os.getenv using unittest.mock.patch.
# This needs to be applied before `src.config` is loaded.
# To ensure this, we must prevent `src.main` (which imports `src.config`)
# from being imported at the top-level of conftest.py.
# We'll import `app` and `SupabaseService` later.


@pytest.fixture(autouse=True, scope='session')
def mock_os_getenv_supabase_vars_globally():
    """
    Patches os.getenv for SUPABASE_URL and SUPABASE_KEY globally for the session.
    This ensures src.config (and thus SupabaseService) reads mocked values when
    they are first imported during the test session or re-initialized.
    """
    # Capture the real os.getenv before patching
    _original_getenv = os.getenv

    # Use unittest.mock.patch as a context manager for session scope
    with patch('os.getenv') as mock_getenv:
        def custom_getenv(key, default=None):
            if key == "SUPABASE_URL":
                return "http://test_supabase.url"
            if key == "SUPABASE_KEY":
                return "test_supabase_key"
            # Fallback to the original os.getenv for other variables
            return _original_getenv(key, default)

        mock_getenv.side_effect = custom_getenv
        yield


# Import `app` and `SupabaseService` AFTER the session-scoped `os.getenv` mock is active.
# This ensures that when src.config is loaded (via src.main or SupabaseService),
# it picks up the mocked environment variables.


@pytest.fixture(autouse=True)
def reset_supabase_service_singleton_and_fastapi_overrides():
    """
    Resets the SupabaseService singleton and FastAPI dependency overrides before each test.
    This ensures a clean state for each test, forcing SupabaseService to re-initialize
    and pick up the current (possibly mocked) config values.
    """
    SupabaseService._instance = None
    SupabaseService._supabase_client = None
    app.dependency_overrides = {}
    yield
    # No additional cleanup needed for app.dependency_overrides as it's reset per test.
