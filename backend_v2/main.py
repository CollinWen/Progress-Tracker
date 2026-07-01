"""
Momentum API v2 - Firebase/Firestore Backend

This FastAPI application provides the same REST API as v1 but uses Firebase/Firestore
for data storage instead of Google Drive.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List

# Import configuration
from config import settings

# Import models
from models.momentum import (
    MomentumData,
    Epic,
    Directive,
    Log,
    Run,
    CreateEpicRequest,
    UpdateEpicRequest,
    CreateDirectiveRequest,
    UpdateDirectiveRequest,
    CreateLogRequest,
    ApiKey,
    CreateApiKeyRequest,
    CreateApiKeyResponse,
)

# Import services
from services.firestore_service import firestore_service
from skills_catalog import get_catalog

# Agent MCP server (mounted at /mcp, deployed alongside this API)
from mcp_server.server import mcp as momentum_mcp, authed_mcp_app

# Import middleware
from middleware.auth import get_current_user, AuthUser

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.debug else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# The mounted MCP app needs its session manager running for the life of the process.
# Mounted sub-apps don't get their lifespan run automatically, so we wire it here.
@asynccontextmanager
async def lifespan(_: FastAPI):
    async with momentum_mcp.session_manager.run():
        yield


# Create FastAPI app
app = FastAPI(
    title="Momentum API v2",
    description="Firebase-based backend API for Momentum progress tracking app",
    version="2.0.0",
    lifespan=lifespan,
)

# Configure CORS
allow_origins = settings.origins_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the agent MCP endpoint alongside the API, behind the API-key gate.
app.mount("/mcp", authed_mcp_app)


# ============================================================================
# Health Check Endpoints
# ============================================================================


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "service": "Momentum API v2", "version": "2.0.0"}


@app.get("/debug/cors")
async def debug_cors():
    return {"origins": settings.origins_list, "raw": settings.allowed_origins}


@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        from services.firebase_service import firebase_service
        db = firebase_service.db
        db_status = "connected" if db else "not initialized"
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {
        "status": "healthy",
        "environment": settings.environment,
        "backend": "firebase",
        "db": db_status,
    }


# ============================================================================
# Data Endpoints (for backwards compatibility)
# ============================================================================


@app.get("/api/data", response_model=MomentumData)
async def get_data(current_user: AuthUser = Depends(get_current_user)):
    """
    Get all user data (backwards compatible with v1 API).

    Returns:
        Complete user data in MomentumData format

    Raises:
        HTTPException: If data loading fails
    """
    try:
        data = await firestore_service.get_all_data(current_user.uid)
        logger.info(f"Loaded data for user {current_user.uid}")
        return data

    except Exception as e:
        logger.error(f"Error loading data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load data"
        )


# Note: POST /api/data is not needed with Firestore since all updates happen
# via individual epic/directive/checkin endpoints


# ============================================================================
# Epic Endpoints
# ============================================================================


@app.get("/api/epics", response_model=List[Epic])
async def list_epics(current_user: AuthUser = Depends(get_current_user)):
    """Get all epics for the current user."""
    try:
        epics = await firestore_service.get_epics(current_user.uid)
        return epics
    except Exception as e:
        logger.error(f"Error listing epics: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.post("/api/epics", response_model=Epic)
async def create_epic(
    request: CreateEpicRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """Create a new epic."""
    try:
        epic = await firestore_service.create_epic(current_user.uid, request)
        logger.info(f"Created epic {epic.id} for user {current_user.uid}")
        return epic

    except Exception as e:
        logger.error(f"Error creating epic: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.get("/api/epics/{epic_id}", response_model=Epic)
async def get_epic(
    epic_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """Get a single epic by ID."""
    try:
        epic = await firestore_service.get_epic(current_user.uid, epic_id)
        if not epic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Epic not found")
        return epic

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting epic: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.put("/api/epics/{epic_id}")
async def update_epic(
    epic_id: str,
    request: UpdateEpicRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """Update an existing epic."""
    try:
        success = await firestore_service.update_epic(current_user.uid, epic_id, request)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Epic not found")

        logger.info(f"Updated epic {epic_id} for user {current_user.uid}")
        return {"message": "Epic updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating epic: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.delete("/api/epics/{epic_id}")
async def delete_epic(
    epic_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """Delete an epic and all its directives and checkins."""
    try:
        await firestore_service.delete_epic(current_user.uid, epic_id)
        logger.info(f"Deleted epic {epic_id} for user {current_user.uid}")
        return {"message": "Epic deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting epic: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Directive Endpoints
# ============================================================================


@app.get("/api/epics/{epic_id}/directives", response_model=List[Directive])
async def list_directives(
    epic_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """Get all directives for an epic."""
    try:
        directives = await firestore_service.get_directives(current_user.uid, epic_id)
        return directives

    except Exception as e:
        logger.error(f"Error listing directives: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.post("/api/epics/{epic_id}/directives", response_model=Directive)
async def create_directive(
    epic_id: str,
    request: CreateDirectiveRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """Add a directive to an epic."""
    try:
        directive = await firestore_service.create_directive(current_user.uid, epic_id, request)
        logger.info(f"Created directive {directive.id} for epic {epic_id}")
        return directive

    except Exception as e:
        logger.error(f"Error creating directive: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.put("/api/epics/{epic_id}/directives/{directive_id}")
async def update_directive(
    epic_id: str,
    directive_id: str,
    request: UpdateDirectiveRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """Update a directive."""
    try:
        success = await firestore_service.update_directive(
            current_user.uid, epic_id, directive_id, request
        )
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Directive not found")

        logger.info(f"Updated directive {directive_id} for epic {epic_id}")
        return {"message": "Directive updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating directive: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.delete("/api/epics/{epic_id}/directives/{directive_id}")
async def delete_directive(
    epic_id: str,
    directive_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """Delete a directive and all its checkins."""
    try:
        await firestore_service.delete_directive(current_user.uid, epic_id, directive_id)
        logger.info(f"Deleted directive {directive_id} from epic {epic_id}")
        return {"message": "Directive deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting directive: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# API Key Endpoints
# ============================================================================


@app.post("/api/keys", response_model=CreateApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    request: CreateApiKeyRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """Generate a new API key. The plaintext key is returned once and never stored."""
    try:
        return await firestore_service.create_api_key(current_user.uid, request.name)
    except Exception as e:
        logger.error(f"Error creating API key: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.get("/api/keys", response_model=List[ApiKey])
async def list_api_keys(current_user: AuthUser = Depends(get_current_user)):
    """List all API keys for the current user (key material is never returned)."""
    try:
        return await firestore_service.list_api_keys(current_user.uid)
    except Exception as e:
        logger.error(f"Error listing API keys: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.delete("/api/keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """Revoke an API key by ID. Agents using this key will immediately lose access."""
    try:
        found = await firestore_service.revoke_api_key(current_user.uid, key_id)
        if not found:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking API key: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Agent Endpoints (skills catalog + run history)
# ============================================================================


@app.get("/api/skills")
async def list_skills(current_user: AuthUser = Depends(get_current_user)):
    """The catalog of agent skills: what exists, what it does, and what's available."""
    return get_catalog()


@app.get("/api/runs", response_model=List[Run])
async def list_runs(
    epic_id: str = None,
    limit: int = 50,
    current_user: AuthUser = Depends(get_current_user),
):
    """List orchestrator runs for the user, newest first, optionally scoped to an epic."""
    try:
        return await firestore_service.get_runs(current_user.uid, epic_id, limit=limit)
    except Exception as e:
        logger.error(f"Error listing runs: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Check-in (Log) Endpoints
# ============================================================================


@app.get("/api/logs", response_model=List[Log])
async def list_checkins(
    epic_id: str = None,
    days: int = None,
    current_user: AuthUser = Depends(get_current_user),
):
    """Get check-ins for the user, optionally filtered by epic and/or recency."""
    try:
        checkins = await firestore_service.get_checkins(current_user.uid, epic_id, days=days)
        return checkins

    except Exception as e:
        logger.error(f"Error listing checkins: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.post("/api/logs", response_model=Log)
async def create_checkin(
    request: CreateLogRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """Create a new check-in log entry."""
    try:
        checkin = await firestore_service.create_checkin(current_user.uid, request)
        logger.info(f"Created check-in {checkin.id} for user {current_user.uid}")
        return checkin

    except Exception as e:
        logger.error(f"Error creating check-in: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.delete("/api/logs/{log_id}")
async def delete_checkin(
    log_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """Delete a check-in entry."""
    try:
        await firestore_service.delete_checkin(current_user.uid, log_id)
        logger.info(f"Deleted check-in {log_id} for user {current_user.uid}")
        return {"message": "Log deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting check-in: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
