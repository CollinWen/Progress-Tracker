"""
Momentum API - Backend service for progress tracking

This FastAPI application provides endpoints for:
- Google OAuth authentication
- CRUD operations on epics, directives, and logs
- Google Drive storage integration
"""
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from uuid import uuid4

# Import configuration
from config import settings

# Import models
from models.auth import SignInRequest, SignInResponse, AuthMeResponse, AuthUser, ErrorResponse
from models.momentum import (
    MomentumData,
    Epic,
    Directive,
    Log,
    CreateEpicRequest,
    UpdateEpicRequest,
    CreateDirectiveRequest,
    UpdateDirectiveRequest,
    CreateLogRequest,
)

# Import services
from services.auth_service import auth_service
from services.drive_service import DriveService

# Import middleware
from middleware.auth import get_current_user

# Configure logging
logging.basicConfig(
    level=logging.INFO if settings.debug else logging.WARNING,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Momentum API",
    description="Backend API for Momentum progress tracking app",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Health Check Endpoints
# ============================================================================


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "service": "Momentum API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "google_oauth": "configured" if settings.google_client_id else "not_configured",
    }


# ============================================================================
# Authentication Endpoints
# ============================================================================


@app.get("/auth/google/login")
async def google_login():
    """
    Initiate Google OAuth flow by redirecting to Google's authorization page.

    Returns:
        Redirect to Google OAuth consent screen
    """
    from fastapi.responses import RedirectResponse

    try:
        auth_url = auth_service.get_authorization_url()
        logger.info("Redirecting to Google OAuth")
        return RedirectResponse(url=auth_url)

    except Exception as e:
        logger.error(f"Error initiating OAuth: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate authentication"
        )


@app.get("/auth/google/callback")
async def google_callback(code: str):
    """
    Handle OAuth callback from Google, exchange code for tokens,
    and redirect to frontend with JWT.

    Args:
        code: Authorization code from Google

    Returns:
        Redirect to frontend with JWT token in URL
    """
    from fastapi.responses import RedirectResponse

    try:
        # Exchange authorization code for Google tokens
        token_data = await auth_service.exchange_code_for_tokens(code)

        # Extract user info from ID token
        user_info = token_data["user_info"]
        user = AuthUser(
            id=user_info["sub"],
            email=user_info["email"],
            name=user_info.get("name", user_info["email"]),
            picture=user_info.get("picture"),
        )

        # Create JWT session token
        session_token = auth_service.create_session_token(user_info)

        # Initialize user's Google Drive storage
        drive = DriveService(token_data["access_token"])
        file_id, momentum_data = await drive.initialize_user_storage(user.name)

        logger.info(f"User {user.id} authenticated via OAuth callback")

        # Redirect to frontend with token and file_id
        frontend_url = f"{settings.frontend_url}?token={session_token}&fileId={file_id}&user={user.name}"
        return RedirectResponse(url=frontend_url)

    except ValueError as e:
        logger.error(f"OAuth callback failed: {str(e)}")
        # Redirect to frontend with error
        error_url = f"{settings.frontend_url}?error=auth_failed&message={str(e)}"
        return RedirectResponse(url=error_url)

    except Exception as e:
        logger.error(f"Unexpected error in OAuth callback: {str(e)}")
        error_url = f"{settings.frontend_url}?error=auth_failed"
        return RedirectResponse(url=error_url)


@app.post("/auth/google/signin", response_model=SignInResponse)
async def google_signin(request: SignInRequest):
    """
    Complete Google OAuth sign-in flow.

    Args:
        request: Contains authorization code from Google

    Returns:
        JWT token, user info, and Drive file ID

    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Exchange authorization code for Google tokens
        token_data = await auth_service.exchange_code_for_tokens(request.code)

        # Extract user info from ID token
        user_info = token_data["user_info"]
        user = AuthUser(
            id=user_info["sub"],
            email=user_info["email"],
            name=user_info.get("name", user_info["email"]),
            picture=user_info.get("picture"),
        )

        # Create JWT session token
        session_token = auth_service.create_session_token(user_info)

        # Initialize user's Google Drive storage
        drive = DriveService(token_data["access_token"])
        file_id, momentum_data = await drive.initialize_user_storage(user.name)

        logger.info(f"User {user.id} signed in successfully")

        return SignInResponse(
            access_token=session_token,
            user=user,
            file_id=file_id,
        )

    except ValueError as e:
        logger.error(f"Sign-in failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected error during sign-in: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed. Please try again.",
        )


@app.post("/auth/signout")
async def signout(current_user: AuthUser = Depends(get_current_user)):
    """
    Sign out current user by invalidating their tokens.

    Args:
        current_user: Authenticated user from JWT

    Returns:
        Success message
    """
    try:
        auth_service.sign_out(current_user.id)
        logger.info(f"User {current_user.id} signed out")
        return {"message": "Signed out successfully"}

    except Exception as e:
        logger.error(f"Error during sign-out: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Sign-out failed",
        )


@app.get("/auth/me", response_model=AuthMeResponse)
async def get_me(current_user: AuthUser = Depends(get_current_user)):
    """
    Get current authenticated user information.

    Args:
        current_user: Authenticated user from JWT

    Returns:
        User information
    """
    return AuthMeResponse(user=current_user)


# ============================================================================
# Data Endpoints
# ============================================================================


@app.get("/api/data", response_model=MomentumData)
async def get_data(
    file_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Load all user data from Google Drive.

    Args:
        file_id: Google Drive file ID for data.json
        current_user: Authenticated user from JWT

    Returns:
        Complete user data (epics, logs, user profile)

    Raises:
        HTTPException: If data loading fails
    """
    try:
        # Get user's access token
        access_token = auth_service.get_user_access_token(current_user.id)
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please sign in again.",
            )

        # Load data from Drive
        drive = DriveService(access_token)
        data = await drive.load_data(file_id)

        logger.info(f"Loaded data for user {current_user.id}")
        return data

    except ValueError as e:
        logger.error(f"Error loading data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected error loading data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load data",
        )


@app.post("/api/data")
async def save_data(
    file_id: str,
    data: MomentumData,
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Save all user data to Google Drive.

    Args:
        file_id: Google Drive file ID for data.json
        data: Complete user data to save
        current_user: Authenticated user from JWT

    Returns:
        Success message

    Raises:
        HTTPException: If data saving fails
    """
    try:
        # Get user's access token
        access_token = auth_service.get_user_access_token(current_user.id)
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired. Please sign in again.",
            )

        # Save data to Drive
        drive = DriveService(access_token)
        await drive.save_data(file_id, data)

        logger.info(f"Saved data for user {current_user.id}")
        return {"message": "Data saved successfully"}

    except ValueError as e:
        logger.error(f"Error saving data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Unexpected error saving data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save data",
        )


# ============================================================================
# Epic Endpoints
# ============================================================================


@app.post("/api/epics", response_model=Epic)
async def create_epic(
    file_id: str,
    request: CreateEpicRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Create a new epic.

    Args:
        file_id: Google Drive file ID
        request: Epic data
        current_user: Authenticated user

    Returns:
        Created epic
    """
    try:
        # Get user's access token and load data
        access_token = auth_service.get_user_access_token(current_user.id)
        if not access_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        drive = DriveService(access_token)
        data = await drive.load_data(file_id)

        # Create new epic
        new_epic = Epic(
            id=str(uuid4()),
            name=request.name,
            emoji=request.emoji,
            description=request.description,
            phase=request.phase,
            created_at=datetime.utcnow().isoformat() + "Z",
            deadline=request.deadline,
            target=request.target,
            directives=[],
        )

        # Add to data and save
        data.epics.append(new_epic)
        await drive.save_data(file_id, data)

        logger.info(f"Created epic {new_epic.id} for user {current_user.id}")
        return new_epic

    except Exception as e:
        logger.error(f"Error creating epic: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.put("/api/epics/{epic_id}")
async def update_epic(
    epic_id: str,
    file_id: str,
    request: UpdateEpicRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """Update an existing epic"""
    try:
        access_token = auth_service.get_user_access_token(current_user.id)
        if not access_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        drive = DriveService(access_token)
        data = await drive.load_data(file_id)

        # Find and update epic
        epic = next((e for e in data.epics if e.id == epic_id), None)
        if not epic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Epic not found")

        # Update fields
        if request.name is not None:
            epic.name = request.name
        if request.emoji is not None:
            epic.emoji = request.emoji
        if request.description is not None:
            epic.description = request.description
        if request.phase is not None:
            epic.phase = request.phase
        if request.deadline is not None:
            epic.deadline = request.deadline
        if request.target is not None:
            epic.target = request.target

        await drive.save_data(file_id, data)
        logger.info(f"Updated epic {epic_id} for user {current_user.id}")
        return {"message": "Epic updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating epic: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.delete("/api/epics/{epic_id}")
async def delete_epic(
    epic_id: str,
    file_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """Delete an epic and all its logs"""
    try:
        access_token = auth_service.get_user_access_token(current_user.id)
        if not access_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        drive = DriveService(access_token)
        data = await drive.load_data(file_id)

        # Remove epic
        data.epics = [e for e in data.epics if e.id != epic_id]

        # Remove logs associated with epic
        data.logs = [log for log in data.logs if log.epic_id != epic_id]

        await drive.save_data(file_id, data)
        logger.info(f"Deleted epic {epic_id} for user {current_user.id}")
        return {"message": "Epic deleted successfully"}

    except Exception as e:
        logger.error(f"Error deleting epic: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Directive Endpoints
# ============================================================================


@app.post("/api/epics/{epic_id}/directives", response_model=Directive)
async def create_directive(
    epic_id: str,
    file_id: str,
    request: CreateDirectiveRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """Add a directive to an epic"""
    try:
        access_token = auth_service.get_user_access_token(current_user.id)
        if not access_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        drive = DriveService(access_token)
        data = await drive.load_data(file_id)

        # Find epic
        epic = next((e for e in data.epics if e.id == epic_id), None)
        if not epic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Epic not found")

        # Create new directive
        new_directive = Directive(
            id=str(uuid4()),
            name=request.name,
            type=request.type,
            interval=request.interval,
            created_at=datetime.utcnow().isoformat() + "Z",
        )

        epic.directives.append(new_directive)
        await drive.save_data(file_id, data)

        logger.info(f"Created directive {new_directive.id} for epic {epic_id}")
        return new_directive

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating directive: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.put("/api/epics/{epic_id}/directives/{directive_id}")
async def update_directive(
    epic_id: str,
    directive_id: str,
    file_id: str,
    request: UpdateDirectiveRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """Update a directive"""
    try:
        access_token = auth_service.get_user_access_token(current_user.id)
        if not access_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        drive = DriveService(access_token)
        data = await drive.load_data(file_id)

        # Find epic and directive
        epic = next((e for e in data.epics if e.id == epic_id), None)
        if not epic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Epic not found")

        directive = next((d for d in epic.directives if d.id == directive_id), None)
        if not directive:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Directive not found")

        # Update fields
        if request.name is not None:
            directive.name = request.name
        if request.type is not None:
            directive.type = request.type
        if request.interval is not None:
            directive.interval = request.interval

        await drive.save_data(file_id, data)
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
    file_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """Delete a directive and all its logs"""
    try:
        access_token = auth_service.get_user_access_token(current_user.id)
        if not access_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        drive = DriveService(access_token)
        data = await drive.load_data(file_id)

        # Find epic and remove directive
        epic = next((e for e in data.epics if e.id == epic_id), None)
        if not epic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Epic not found")

        epic.directives = [d for d in epic.directives if d.id != directive_id]

        # Remove logs associated with directive
        data.logs = [
            log
            for log in data.logs
            if not (log.epic_id == epic_id and log.directive_id == directive_id)
        ]

        await drive.save_data(file_id, data)
        logger.info(f"Deleted directive {directive_id} from epic {epic_id}")
        return {"message": "Directive deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting directive: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Log Endpoints
# ============================================================================


@app.post("/api/logs", response_model=Log)
async def create_log(
    file_id: str,
    request: CreateLogRequest,
    current_user: AuthUser = Depends(get_current_user),
):
    """Create a new check-in log entry"""
    try:
        access_token = auth_service.get_user_access_token(current_user.id)
        if not access_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        drive = DriveService(access_token)
        data = await drive.load_data(file_id)

        # Verify epic and directive exist
        epic = next((e for e in data.epics if e.id == request.epic_id), None)
        if not epic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Epic not found")

        directive = next((d for d in epic.directives if d.id == request.directive_id), None)
        if not directive:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Directive not found")

        # Create new log
        new_log = Log(
            id=str(uuid4()),
            epic_id=request.epic_id,
            directive_id=request.directive_id,
            timestamp=request.timestamp or datetime.utcnow().isoformat() + "Z",
            duration_minutes=request.duration_minutes,
            note=request.note,
            source=request.source,
        )

        data.logs.append(new_log)
        await drive.save_data(file_id, data)

        logger.info(f"Created log {new_log.id} for user {current_user.id}")
        return new_log

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating log: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


@app.delete("/api/logs/{log_id}")
async def delete_log(
    log_id: str,
    file_id: str,
    current_user: AuthUser = Depends(get_current_user),
):
    """Delete a log entry"""
    try:
        access_token = auth_service.get_user_access_token(current_user.id)
        if not access_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)

        drive = DriveService(access_token)
        data = await drive.load_data(file_id)

        # Remove log
        initial_count = len(data.logs)
        data.logs = [log for log in data.logs if log.id != log_id]

        if len(data.logs) == initial_count:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Log not found")

        await drive.save_data(file_id, data)
        logger.info(f"Deleted log {log_id} for user {current_user.id}")
        return {"message": "Log deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting log: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# Error Handlers
# ============================================================================


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom error response format"""
    return ErrorResponse(detail=exc.detail, error_code=None)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=settings.api_port)
