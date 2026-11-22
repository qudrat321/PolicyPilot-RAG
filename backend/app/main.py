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

# Configure CORS for React frontend (Vercel, Cloudflare Pages, Localhost, or Wildcard)
raw_cors = settings.cors_origins.strip()
if raw_cors == "*" or not raw_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    allowed_list = [origin.strip() for origin in raw_cors.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_list,
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
from fastapi.responses import FileResponse

BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
if not FRONTEND_DIST.exists():
    FRONTEND_DIST = Path("frontend/dist")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon_ico():
    fav_path = FRONTEND_DIST / "favicon.ico"
    if fav_path.exists():
        return FileResponse(fav_path)
    pub_path = BASE_DIR / "frontend" / "public" / "favicon.ico"
    if pub_path.exists():
        return FileResponse(pub_path)
    return FileResponse(fav_path)

@app.get("/favicon.svg", include_in_schema=False)
async def favicon_svg():
    fav_svg = FRONTEND_DIST / "favicon.svg"
    if fav_svg.exists():
        return FileResponse(fav_svg, media_type="image/svg+xml")
    pub_svg = BASE_DIR / "frontend" / "public" / "favicon.svg"
    if pub_svg.exists():
        return FileResponse(pub_svg, media_type="image/svg+xml")
    return FileResponse(fav_svg, media_type="image/svg+xml")

if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
