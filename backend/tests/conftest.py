# project/backend/tests/conftest.py
from src.main import app  # Import app to clear overrides
from src.services.supabase import SupabaseService
import pytest
from unittest.mock import patch
import os

# IMPORTANT: Capture the REAL os.getenv before any patching occurs.
# This prevents recursion when mocked os.getenv calls a fallback.
_real_os_getenv = os.getenv


@pytest.fixture(autouse=True, scope='session')
def mock_supabase_env_vars_globally_for_os_getenv():
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
            # For any other environment variable, call the original os.getenv captured earlier
            return _real_os_getenv(key, default)

        mock_getenv.side_effect = custom_getenv
        yield


# Now, after os.getenv is patched by the session-scoped fixture,
# we can safely import SupabaseService. When it's imported (or when its
# _initialize_supabase method runs), it will use src.config, which
# will now correctly read the mocked environment variables.


# Fixture to reset the SupabaseService singleton instance for each test
@pytest.fixture(autouse=True)
def reset_supabase_service_singleton_and_fastapi_overrides():
    """
    Resets the SupabaseService singleton and FastAPI dependency overrides before each test.
    This ensures that each test gets a clean, re-initialized SupabaseService
    instance that will pick up any active mock configurations, and a clean FastAPI state.
    """
    SupabaseService._instance = None
    SupabaseService._supabase_client = None
    # Ensure FastAPI dependency overrides are cleared for each test
    app.dependency_overrides = {}
    yield
    # Clean up after the test (already covered, but good to be explicit)
    app.dependency_overrides = {}
