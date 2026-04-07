"""
ToolService — per-user workspace operations.

PLP-562 fix: every public method now requires *user_id* and resolves all
paths through ``WorkspacePolicy.safe_path``.  The old behaviour of resolving
paths against a single shared ``workspace_root`` has been removed.
"""

import os
from pathlib import Path
from typing import Any

from .policy import WorkspacePolicy


class ToolService:
    """Provides file-system operations scoped to an individual user's sandbox."""

    def __init__(self, policy: WorkspacePolicy | None = None) -> None:
        self._policy = policy or WorkspacePolicy()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _resolve(self, user_id: str, path: str) -> Path:
        """Resolve *path* relative to *user_id*'s workspace root."""
        return self._policy.safe_path(user_id, path)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def workspace_root(self, user_id: str) -> Path:
        """Return (and create if necessary) the workspace root for *user_id*."""
        return self._policy.workspace_root_for(user_id)

    def read_file(self, user_id: str, path: str) -> str:
        """Read *path* from *user_id*'s workspace and return its text content."""
        target = self._resolve(user_id, path)
        if not target.is_file():
            raise FileNotFoundError(f"File not found in workspace: {path!r}")
        return target.read_text(encoding="utf-8")

    def write_file(self, user_id: str, path: str, content: str) -> None:
        """Write *content* to *path* inside *user_id*'s workspace."""
        target = self._resolve(user_id, path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")

    def delete_file(self, user_id: str, path: str) -> None:
        """Delete *path* from *user_id*'s workspace."""
        target = self._resolve(user_id, path)
        if not target.exists():
            raise FileNotFoundError(f"File not found in workspace: {path!r}")
        target.unlink()

    def list_files(self, user_id: str, subdir: str = "") -> list[str]:
        """List all files under *subdir* within *user_id*'s workspace.

        Returns paths relative to the user's workspace root.
        """
        root = self.workspace_root(user_id)
        if subdir:
            base = self._resolve(user_id, subdir)
        else:
            base = root

        if not base.is_dir():
            return []

        return [
            str(p.relative_to(root))
            for p in base.rglob("*")
            if p.is_file()
        ]

    def file_info(self, user_id: str, path: str) -> dict[str, Any]:
        """Return metadata for *path* in *user_id*'s workspace."""
        target = self._resolve(user_id, path)
        if not target.exists():
            raise FileNotFoundError(f"File not found in workspace: {path!r}")
        stat = target.stat()
        return {
            "path": path,
            "size": stat.st_size,
            "is_file": target.is_file(),
            "is_dir": target.is_dir(),
        }
