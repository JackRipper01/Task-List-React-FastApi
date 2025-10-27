# project/backend/tests/conftest.py
# Ensure src.config itself is re-evaluated or its values are considered mocked
import src.config
from src.services.supabase import SupabaseService
from src.main import app
import pytest
from unittest.mock import patch, MagicMock
import os
import sys

# IMPORTANT: Do NOT import src.main, src.services.supabase, or src.config at the top level here yet.
# These modules might be imported by other parts of the test suite before
# our session-scoped patch is fully active, leading to them reading
# un-mocked environment variables.

# The session-scoped patch for os.getenv needs to be set up first.


@pytest.fixture(autouse=True, scope='session')
def mock_os_getenv_supabase_vars_globally():
    """
    Patches os.getenv for SUPABASE_URL and SUPABASE_KEY globally for the session.
    This ensures src.config (and thus SupabaseService) reads mocked values when
    they are first imported or re-initialized.
    """
    # Capture the real os.getenv before patching
    _original_getenv = os.getenv

    # Use unittest.mock.patch directly as a context manager for session scope
    with patch('os.getenv') as mock_getenv:
        def custom_getenv(key, default=None):
            if key == "SUPABASE_URL":
                return "http://test_supabase.url"
            if key == "SUPABASE_KEY":
                return "test_supabase_key"
            # Fallback to the original os.getenv for other variables
            return _original_getenv(key, default)

        mock_getenv.side_effect = custom_getenv
        yield  # The patch remains active until the session ends.


# NOW it is safe to import modules that depend on os.getenv (like src.config, src.services.supabase, src.main).
# These imports must happen AFTER the global os.getenv mock is active.


@pytest.fixture(autouse=True)
def reset_supabase_service_singleton_and_fastapi_overrides():
    """
    Resets the SupabaseService singleton and FastAPI dependency overrides before each test.
    This ensures a clean state for each test, forcing SupabaseService to re-initialize
    and pick up the current (globally mocked from session-fixture) config values.
    """
    SupabaseService._instance = None
    SupabaseService._supabase_client = None
    app.dependency_overrides = {}
    yield
    # No additional cleanup needed for app.dependency_overrides as it's reset per test.
    # The session-scoped os.getenv patch will remain active.
