"""APAAR-SETU backend — FastAPI application entrypoint (Phase 0 scaffold)."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import assistant as assistant_router
from app.routers import auth as auth_router
from app.routers import dashboard as dashboard_router
from app.routers import institutions as institutions_router
from app.routers import reports as reports_router
from app.routers import students as students_router
from app.routers import uploads as uploads_router
from app.routers import verify as verify_router

APP_VERSION = "0.1.0"

app = FastAPI(
    title="APAAR-SETU Backend",
    description="Centralised admission and APAAR validation system for AICTE.",
    version=APP_VERSION,
)

API_PREFIX = "/api/v1"
app.include_router(auth_router.router, prefix=API_PREFIX)
app.include_router(uploads_router.router, prefix=API_PREFIX)
app.include_router(students_router.router, prefix=API_PREFIX)
app.include_router(dashboard_router.router, prefix=API_PREFIX)
app.include_router(institutions_router.router, prefix=API_PREFIX)
app.include_router(verify_router.router, prefix=API_PREFIX)
app.include_router(assistant_router.router, prefix=API_PREFIX)
app.include_router(reports_router.router, prefix=API_PREFIX)

# CORS: origins come from CORS_ORIGINS (comma separated), default = Vite dev server.
_cors_origins = [
    o.strip()
    for o in settings.cors_origins.split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
def health():
    """Liveness probe used by deployment and tests."""
    return {"status": "ok", "version": APP_VERSION}


# Optional static frontend serving for unified full-stack container
import os
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

_static_dir = Path(__file__).resolve().parent.parent / "static"
if _static_dir.exists() and (_static_dir / "index.html").exists():
    _assets_dir = _static_dir / "assets"
    if _assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        target = _static_dir / full_path
        if target.is_file():
            return FileResponse(target)
        return FileResponse(_static_dir / "index.html")

