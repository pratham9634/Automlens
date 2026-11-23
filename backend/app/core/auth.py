"""Authentication and multi-tenancy dependency using Clerk JWTs."""

import json
from typing import Any
import urllib.request

from fastapi import Depends, Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt import PyJWKClient

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

logger = get_logger("auth")
security = HTTPBearer(auto_error=False)

# In-memory cache for PyJWKClient instance
_jwk_client: PyJWKClient | None = None


def get_jwk_client(jwks_url: str) -> PyJWKClient:
    """Return or initialize cached PyJWKClient."""
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwk_client


def verify_clerk_token(token: str, settings: Settings) -> dict[str, Any]:
    """Verify and decode a Clerk RS256 JWT token."""
    try:
        # Case 1: PEM public key provided in settings
        if settings.CLERK_PEM_PUBLIC_KEY:
            pem = settings.CLERK_PEM_PUBLIC_KEY.replace("\\n", "\n")
            return jwt.decode(
                token,
                pem,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )

        # Case 2: JWKS URL configured
        if settings.CLERK_JWKS_URL:
            jwk_client = get_jwk_client(settings.CLERK_JWKS_URL)
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                options={"verify_aud": False},
            )

        # Case 3: If no key configured, decode unverified in dev or raise
        if settings.AUTOMLENS_ENV == "development" or settings.AUTOMLENS_AUTH_DISABLED:
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Clerk public key or JWKS URL is not configured on the backend.",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please sign in again.",
        )
    except jwt.InvalidTokenError as exc:
        logger.warning("Invalid JWT token received: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(security),
    settings: Settings = Depends(get_settings),
) -> str:
    """FastAPI dependency: Returns verified Clerk user_id.
    
    If auth is disabled (local dev / isolated test), falls back to default user ID.
    Otherwise enforces valid Bearer JWT.
    """
    if credentials is None:
        # Fallback to dev user in test or development when token is not provided
        if settings.AUTOMLENS_AUTH_DISABLED or settings.AUTOMLENS_ENV in ("development", "test"):
            return settings.DEFAULT_DEV_USER_ID
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header. Sign in required.",
        )

    token = credentials.credentials
    payload = verify_clerk_token(token, settings)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing subject (user_id).",
        )

    return str(user_id)


async def get_gemini_api_key(
    x_gemini_api_key: str | None = Header(None, alias="X-Gemini-API-Key"),
    settings: Settings = Depends(get_settings),
) -> str | None:
    """Extract BYOK Gemini API Key from header or server settings fallback."""
    if x_gemini_api_key and x_gemini_api_key.strip():
        return x_gemini_api_key.strip()
    if settings.GEMINI_API_KEY:
        k = settings.GEMINI_API_KEY.strip()
        if k.startswith("AIzaSy") or (k.startswith("AQ.") and k != "AQ.InvalidKey" and len(k) > 20):
            return k
    return None


async def get_gemini_model(
    x_gemini_model: str | None = Header(None, alias="X-Gemini-Model"),
    settings: Settings = Depends(get_settings),
) -> str:
    """Extract BYOK Gemini Model from header or server settings fallback."""
    deprecated = {
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
    }
    if x_gemini_model and x_gemini_model.strip() and x_gemini_model.strip() not in deprecated:
        return x_gemini_model.strip()
    return settings.GEMINI_MODEL

