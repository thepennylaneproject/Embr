"""
Tool API routes.

PLP-562 fix: every handler now extracts the authenticated ``current_user``
from the JWT (via the ``CurrentUser`` dependency) and passes ``user_id`` to
``ToolService``.  No operation is permitted without a valid identity, and all
file-system access is scoped to the per-user sandbox directory enforced by
``WorkspacePolicy``.

The shared-workspace anti-pattern (resolving paths from a single policy
``workspace_root`` without any user_id segment) has been removed.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.auth import CurrentUser
from app.tools.policy import WorkspacePolicy
from app.tools.service import ToolService

router = APIRouter(prefix="/tools", tags=["tools"])

# ---------------------------------------------------------------------------
# Dependency: ToolService
# ---------------------------------------------------------------------------

def _get_tool_service(policy: Annotated[WorkspacePolicy, Depends(WorkspacePolicy)]) -> ToolService:
    return ToolService(policy=policy)

ToolServiceDep = Annotated[ToolService, Depends(_get_tool_service)]


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class WriteFileRequest(BaseModel):
    path: str
    content: str


class FileInfoResponse(BaseModel):
    path: str
    size: int
    is_file: bool
    is_dir: bool


class ListFilesResponse(BaseModel):
    files: list[str]


class ReadFileResponse(BaseModel):
    path: str
    content: str


# ---------------------------------------------------------------------------
# Handlers — all require authentication; all scope I/O to current_user
# ---------------------------------------------------------------------------

@router.get("/files", response_model=ListFilesResponse)
def list_files(
    current_user: CurrentUser,
    svc: ToolServiceDep,
    subdir: str = "",
) -> ListFilesResponse:
    """List files in the authenticated user's workspace."""
    files = svc.list_files(user_id=current_user.user_id, subdir=subdir)
    return ListFilesResponse(files=files)


@router.get("/files/info", response_model=FileInfoResponse)
def get_file_info(
    path: str,
    current_user: CurrentUser,
    svc: ToolServiceDep,
) -> FileInfoResponse:
    """Return metadata for a file in the authenticated user's workspace."""
    try:
        info = svc.file_info(user_id=current_user.user_id, path=path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    return FileInfoResponse(**info)


@router.get("/files/read", response_model=ReadFileResponse)
def read_file(
    path: str,
    current_user: CurrentUser,
    svc: ToolServiceDep,
) -> ReadFileResponse:
    """Read a file from the authenticated user's workspace."""
    try:
        content = svc.read_file(user_id=current_user.user_id, path=path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    return ReadFileResponse(path=path, content=content)


@router.post("/files", status_code=status.HTTP_201_CREATED)
def write_file(
    body: WriteFileRequest,
    current_user: CurrentUser,
    svc: ToolServiceDep,
) -> dict:
    """Write (create or overwrite) a file in the authenticated user's workspace."""
    try:
        svc.write_file(
            user_id=current_user.user_id,
            path=body.path,
            content=body.content,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    return {"status": "ok", "path": body.path}


@router.delete("/files")
def delete_file(
    path: str,
    current_user: CurrentUser,
    svc: ToolServiceDep,
) -> dict:
    """Delete a file from the authenticated user's workspace."""
    try:
        svc.delete_file(user_id=current_user.user_id, path=path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    return {"status": "ok", "path": path}
