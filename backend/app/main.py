"""Main FastAPI application entry point with CORS, routes, and health checks."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.schemas import HealthResponse
from app.api.routes import router as api_router
from app.services.vector_store import check_qdrant_health

app = FastAPI(
    title="PolicyPilot RAG API",
    description="Zero-Cost, High-Performance Public Policy Assistant",
    version="1.0.0",
)

# Enable CORS for React frontend (Vercel / Cloudflare / Localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint to probe service availability and handle cold starts."""
    return HealthResponse(
        status="ok",
        environment=settings.environment,
        qdrant_connected=check_qdrant_health(),
        qdrant_collection=settings.qdrant_collection,
    )


# Mount built React frontend static files
from pathlib import Path
from fastapi.staticfiles import StaticFiles

FRONTEND_DIST = Path("frontend/dist")
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
