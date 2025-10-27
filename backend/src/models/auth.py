# project/src/models/auth.py

from pydantic import BaseModel, Field


class UserCredentials(BaseModel):
    """
    Base model for user authentication credentials.
    """
    # FIX: Use json_schema_extra for example
    email: str = Field(..., description="User's email address.",
                       json_schema_extra={"example": "user@example.com"})
    password: str = Field(..., description="User's password.", json_schema_extra={
                          "example": "StrongPassword123!"})


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
