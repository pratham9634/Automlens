"""Unit tests for BYOK Gemini API key and Model selection headers."""

import pytest

from app.core.auth import get_gemini_api_key, get_gemini_model
from app.core.config import Settings


@pytest.mark.asyncio
async def test_get_gemini_model_custom_header():
    """Test extracting custom X-Gemini-Model header."""
    settings = Settings(GEMINI_MODEL="gemini-2.0-flash")
    result = await get_gemini_model(x_gemini_model="gemini-1.5-pro", settings=settings)
    assert result == "gemini-1.5-pro"


@pytest.mark.asyncio
async def test_get_gemini_model_fallback_default():
    """Test fallback to settings.GEMINI_MODEL when header is missing or empty."""
    settings = Settings(GEMINI_MODEL="gemini-2.0-flash")

    res_none = await get_gemini_model(x_gemini_model=None, settings=settings)
    assert res_none == "gemini-2.0-flash"

    res_empty = await get_gemini_model(x_gemini_model="   ", settings=settings)
    assert res_empty == "gemini-2.0-flash"


@pytest.mark.asyncio
async def test_get_gemini_api_key_extraction():
    """Test extracting X-Gemini-API-Key and fallback."""
    settings = Settings(GEMINI_API_KEY="AIzaSyDefaultKey")

    # Custom header takes precedence
    res_custom = await get_gemini_api_key(x_gemini_api_key="AIzaSyCustomKey", settings=settings)
    assert res_custom == "AIzaSyCustomKey"

    # Fallback with valid AIzaSy server key
    res_fallback = await get_gemini_api_key(x_gemini_api_key=None, settings=settings)
    assert res_fallback == "AIzaSyDefaultKey"

    # Fallback with invalid server key returns None
    invalid_settings = Settings(GEMINI_API_KEY="AQ.InvalidKey")
    res_invalid = await get_gemini_api_key(x_gemini_api_key=None, settings=invalid_settings)
    assert res_invalid is None

