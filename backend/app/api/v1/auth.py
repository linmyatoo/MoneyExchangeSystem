from datetime import datetime
from typing import Any

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException, Request, status
# pyrefly: ignore [missing-import]
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
from jose.exceptions import JWTError
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.core.config import get_settings
from app.core.security import create_access_token, create_refresh_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginResponse, RefreshTokenRequest, Token, TokenPayload
from app.schemas.user import UserResponse
from app.services.audit_log_service import AuditLogService

settings = get_settings()
router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login_access_token(
    request: Request,
    db: Session = Depends(get_db), 
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )
    elif not user.is_active or user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    
    # Update last login
    user.last_login_at = datetime.utcnow()
    db.commit()

    AuditLogService.log(
        db=db,
        action="LOGIN",
        entity_type="AUTH",
        entity_id=str(user.id),
        user_id=user.id,
        request=request
    )

    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer",
        "user": user,
    }


@router.post("/logout")
def logout(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Logout user.
    """
    AuditLogService.log(
        db=db,
        action="LOGOUT",
        entity_type="AUTH",
        entity_id=str(current_user.id),
        user_id=current_user.id,
        request=request
    )
    return {"message": "Successfully logged out"}


@router.post("/refresh", response_model=Token)
def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
) -> Any:
    """
    Refresh access token using refresh token.
    """
    try:
        payload = jwt.decode(
            request.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        
        if token_data.type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
            
        user = db.query(User).filter(User.id == token_data.sub).first()
        if not user or not user.is_active or user.is_deleted:
            raise HTTPException(status_code=404, detail="User not found or inactive")
            
        return {
            "access_token": create_access_token(user.id),
            "refresh_token": create_refresh_token(user.id),
            "token_type": "bearer",
        }
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )


@router.get("/me", response_model=UserResponse)
def read_users_me(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user
