"""
Tool workspace policy.

Each authenticated user receives an isolated sandbox directory under
``base_workspace_dir/<user_id>/``.  No path traversal is permitted outside
that sandbox.

PLP-562 fix: workspace_root is now derived per-user so two distinct users on
the same deployment cannot read or write each other's files.
"""

import os
from pathlib import Path


class WorkspacePolicy:
    """Encapsulates workspace root resolution and path-safety checks."""

    def __init__(self, base_workspace_dir: str | None = None) -> None:
        self._base = Path(
            base_workspace_dir
            or os.environ.get("TOOL_WORKSPACE_BASE", "/tmp/tool_workspaces")
        ).resolve()

    @property
    def base_dir(self) -> Path:
        return self._base

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def workspace_root_for(self, user_id: str) -> Path:
        """Return the sandboxed workspace directory for *user_id*.

        The directory is created if it does not yet exist.  Raises
        ``ValueError`` if *user_id* is empty or contains path-separator
        characters (defense against trivial traversal attempts).
        """
        if not user_id or "/" in user_id or "\\" in user_id or ".." in user_id:
            raise ValueError(f"Invalid user_id for workspace resolution: {user_id!r}")

        root = (self._base / user_id).resolve()

        # Confirm the resolved path is still under _base (belt-and-suspenders).
        if not str(root).startswith(str(self._base) + os.sep):
            raise ValueError(
                f"Resolved workspace {root} escapes base directory {self._base}"
            )

        root.mkdir(parents=True, exist_ok=True)
        return root

    def safe_path(self, user_id: str, relative_path: str) -> Path:
        """Resolve *relative_path* inside the user's sandbox.

        Raises ``PermissionError`` if the resolved path would escape the
        user's workspace root (path traversal guard).
        """
        root = self.workspace_root_for(user_id)
        target = (root / relative_path).resolve()

        if not str(target).startswith(str(root) + os.sep) and target != root:
            raise PermissionError(
                f"Path {relative_path!r} resolves outside user workspace"
            )

        return target
