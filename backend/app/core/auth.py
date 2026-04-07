"""
JWT-based authentication dependency for FastAPI routes.

Provides ``get_current_user`` — a FastAPI dependency that validates the
Bearer token from the ``Authorization`` header and returns the decoded user
payload.

PLP-562: the returned ``user_id`` is used by ToolService to scope all file
operations to a per-user workspace sandbox, so it must never be None or
inferred from any shared state.
"""

import os
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_bearer = HTTPBearer()

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")


class AuthenticatedUser:
    """Minimal representation of a verified JWT principal."""

    def __init__(self, user_id: str, email: str | None = None) -> None:
        if not user_id:
            raise ValueError("user_id must be a non-empty string")
        self.user_id = user_id
        self.email = email

    def __repr__(self) -> str:  # pragma: no cover
        return f"AuthenticatedUser(user_id={self.user_id!r})"


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> AuthenticatedUser:
    """FastAPI dependency: decode and validate the Bearer JWT, return the user.

    Raises HTTP 401 if the token is missing, invalid, or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise credentials_exception

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise credentials_exception

    return AuthenticatedUser(
        user_id=user_id,
        email=payload.get("email"),
    )


# Convenient type alias for route signatures.
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
