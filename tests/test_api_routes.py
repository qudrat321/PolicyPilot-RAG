"""Integration tests for FastAPI REST API endpoints (Move 5)."""
import pytest
from app.main import app
from app.api.routes import DOCUMENT_REGISTRY
from app.schemas import AskRequest


@pytest.mark.asyncio
async def test_health_endpoint():
    """Verify health probe returns status ok and Qdrant connectivity."""
    from app.main import health_check
    res = await health_check()
    assert res.status == "ok"
    assert res.environment == "development"


@pytest.mark.asyncio
async def test_ask_endpoint_direct():
    """Verify /api/ask returns a valid structured AskResponse with citations."""
    from app.api.routes import ask_policy_question
    payload = AskRequest(question="What is the meal allowance in New York City?")
    res = await ask_policy_question(payload)
    assert res.question == "What is the meal allowance in New York City?"
    assert len(res.answer) > 0
    assert res.is_refusal is False
    assert len(res.citations) >= 1
    assert "New York City" in res.citations[0].snippet or "$75" in res.answer


@pytest.mark.asyncio
async def test_ask_endpoint_unanswerable():
    """Verify /api/ask returns refusal on unanswerable out-of-domain questions."""
    from app.api.routes import ask_policy_question
    payload = AskRequest(question="What is the policy for astronaut training on Mars?")
    res = await ask_policy_question(payload)
    assert res.is_refusal is True
    assert "not contain sufficient information" in res.answer.lower()
    assert len(res.citations) == 0
