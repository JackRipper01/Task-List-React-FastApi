# project/src/services/supabase.py

import logging
from typing import Dict, Any, Optional

from supabase import create_client, Client
from supabase_auth.errors import AuthApiError

from config import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger(__name__)


class SupabaseService:
    """
    Service for interacting with Supabase, primarily for authentication.
    Designed as a singleton to maintain a single Supabase client instance.
    """
    _instance: Optional['SupabaseService'] = None
    _supabase_client: Optional[Client] = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(SupabaseService, cls).__new__(cls)
            cls._instance._initialize_supabase()
        return cls._instance

    def _initialize_supabase(self):
        """Initializes the Supabase client if not already done."""
        if not self._supabase_client:
            if not SUPABASE_URL or not SUPABASE_KEY:
                logger.error(
                    "SUPABASE_URL or SUPABASE_KEY not found in environment variables. "
                    "Supabase functionality will be disabled."
                )
                self._supabase_client = None
                return

            try:
                self._supabase_client = create_client(
                    SUPABASE_URL, SUPABASE_KEY)
                logger.info("Supabase client initialized successfully.")
            except Exception as e:
                logger.error(
                    f"Failed to initialize Supabase client. Error: {e}", exc_info=True
                )
                self._supabase_client = None

    @property
    def is_initialized(self) -> bool:
        """Checks if the Supabase client has been successfully initialized."""
        return self._supabase_client is not None

    @property
    def client(self) -> Client:
        """Returns the Supabase client instance, raising an error if not initialized."""
        if not self.is_initialized:
            raise RuntimeError("Supabase client is not initialized.")
        return self._supabase_client

    async def sign_up(self, email: str, password: str) -> Dict[str, Any]:
        """
        Registers a new user with email and password using Supabase Auth.

        Args:
            email (str): The user's email.
            password (str): The user's password.

        Returns:
            Dict[str, Any]: The user and session data returned by Supabase.

        Raises:
            AuthApiError: If Supabase returns an authentication error.
            RuntimeError: If Supabase client is not initialized.
            Exception: For other unexpected errors.
        """
        if not self.is_initialized:
            raise RuntimeError("Supabase client is not initialized.")
        try:
            # Supabase sign_up by default sends a confirmation email.
            # You can disable this in your Supabase project settings if needed for local testing.
            response = self.client.auth.sign_up(
                {
                    "email": email,
                    "password": password
                }
            )
            logger.info(f"User {email} successfully attempted to sign up.")
            # The response from sign_up may or may not contain a session, depending on
            # your Supabase "Email Confirmation" setting.
            # If email confirmation is required, `session` will be None until confirmed.
            return response.model_dump()  # For pydantic v2. Use .dict() for pydantic v1
        except AuthApiError as e:
            logger.warning(
                f"Supabase Auth error during sign-up for {email}: {e.message}")
            raise e
        except Exception as e:
            logger.error(
                f"Unexpected error during sign-up for {email}: {e}", exc_info=True)
            raise e

    async def sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """
        Logs in an existing user with email and password using Supabase Auth.

        Args:
            email (str): The user's email.
            password (str): The user's password.

        Returns:
            Dict[str, Any]: The user and session data returned by Supabase.

        Raises:
            AuthApiError: If Supabase returns an authentication error.
            RuntimeError: If Supabase client is not initialized.
            Exception: For other unexpected errors.
        """
        if not self.is_initialized:
            raise RuntimeError("Supabase client is not initialized.")
        try:
            response = self.client.auth.sign_in_with_password(
                {
                    "email": email,
                    "password": password
                }
            )
            logger.info(f"User {email} successfully signed in.")
            return response.model_dump()  # For pydantic v2. Use .dict() for pydantic v1
        except AuthApiError as e:
            logger.warning(
                f"Supabase Auth error during sign-in for {email}: {e.message}")
            raise e
        except Exception as e:
            logger.error(
                f"Unexpected error during sign-in for {email}: {e}", exc_info=True)
            raise e

    # THIS IS THE METHOD THAT WAS LIKELY MISSING OR MALFORMED
    async def get_user_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validates a JWT and retrieves the user data.

        Args:
            token (str): The JWT access token.

        Returns:
            Optional[Dict[str, Any]]: The user's data if the token is valid, otherwise None.
        """
        if not self.is_initialized:
            raise RuntimeError("Supabase client is not initialized.")

        try:
            # The get_user method in supabase-py validates the token and returns the user
            response = self.client.auth.get_user(token)
            logger.info(
                f"Successfully validated token for user: {response.user.email}")
            return response.user.model_dump()  # Return user data as a dict
        except AuthApiError as e:
            logger.warning(f"Token validation failed: {e.message}")
            return None
        except Exception as e:
            logger.error(
                f"Unexpected error during token validation: {e}", exc_info=True)
            return None
