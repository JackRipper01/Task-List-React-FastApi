# project/src/models/auth.py

from pydantic import BaseModel, Field


class UserCredentials(BaseModel):
    """
    Base model for user authentication credentials.
    """
    email: str = Field(..., example="user@example.com",
                       description="User's email address.")
    password: str = Field(..., example="StrongPassword123!",
                          description="User's password.")


class AuthResponse(BaseModel):
    """
    Model for the authentication response, containing user and session information.
    """
    access_token: str = Field(...,
                              description="JWT access token for the authenticated user.")
    token_type: str = Field("Bearer", description="Type of the token.")
    expires_in: int = Field(...,
                            description="Time in seconds until the token expires.")
    refresh_token: str = Field(...,
                               description="Token to refresh the access token.")
    # Can be more detailed later
    user: dict = Field(..., description="Details of the authenticated user.")
    # Can be more detailed later
    session: dict = Field(..., description="Details of the user's session.")
