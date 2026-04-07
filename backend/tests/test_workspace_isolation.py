"""
Tests for PLP-562: per-user workspace isolation.

Key assertions:
  1. Two users with different JWTs cannot read each other's workspace files.
  2. Path traversal attempts (e.g. "../../other_user/secret.txt") are blocked.
  3. Writing / reading / listing all operate inside the correct user sandbox.
"""

import os
import tempfile
from pathlib import Path

import jwt
import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Minimal imports — unit-level tests do not start the full ASGI app
# ---------------------------------------------------------------------------
from app.tools.policy import WorkspacePolicy
from app.tools.service import ToolService

_JWT_SECRET = "test-secret-do-not-use-in-production"
_JWT_ALG = "HS256"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def workspace_dir(tmp_path: Path) -> Path:
    return tmp_path / "workspaces"


@pytest.fixture()
def policy(workspace_dir: Path) -> WorkspacePolicy:
    return WorkspacePolicy(base_workspace_dir=str(workspace_dir))


@pytest.fixture()
def svc(policy: WorkspacePolicy) -> ToolService:
    return ToolService(policy=policy)


def _make_token(user_id: str) -> str:
    return jwt.encode({"sub": user_id}, _JWT_SECRET, algorithm=_JWT_ALG)


# ---------------------------------------------------------------------------
# WorkspacePolicy unit tests
# ---------------------------------------------------------------------------

class TestWorkspacePolicy:
    def test_separate_roots_per_user(self, policy: WorkspacePolicy) -> None:
        root_a = policy.workspace_root_for("user-alice")
        root_b = policy.workspace_root_for("user-bob")
        assert root_a != root_b
        assert "user-alice" in str(root_a)
        assert "user-bob" in str(root_b)

    def test_roots_created_on_demand(self, policy: WorkspacePolicy) -> None:
        root = policy.workspace_root_for("user-carol")
        assert root.is_dir()

    def test_path_traversal_blocked(self, policy: WorkspacePolicy) -> None:
        with pytest.raises(PermissionError):
            policy.safe_path("user-alice", "../../user-bob/secret.txt")

    def test_empty_user_id_rejected(self, policy: WorkspacePolicy) -> None:
        with pytest.raises(ValueError):
            policy.workspace_root_for("")

    def test_slash_in_user_id_rejected(self, policy: WorkspacePolicy) -> None:
        with pytest.raises(ValueError):
            policy.workspace_root_for("evil/../admin")

    def test_safe_path_within_sandbox(self, policy: WorkspacePolicy) -> None:
        p = policy.safe_path("user-alice", "subdir/file.txt")
        assert "user-alice" in str(p)
        assert "subdir/file.txt" in str(p)


# ---------------------------------------------------------------------------
# ToolService unit tests
# ---------------------------------------------------------------------------

class TestToolService:
    def test_write_and_read(self, svc: ToolService) -> None:
        svc.write_file("alice", "hello.txt", "Hello, Alice!")
        assert svc.read_file("alice", "hello.txt") == "Hello, Alice!"

    def test_user_a_cannot_read_user_b_file(self, svc: ToolService) -> None:
        svc.write_file("alice", "secret.txt", "alice's secret")
        svc.write_file("bob", "secret.txt", "bob's secret")

        # Each user reads their own content.
        assert svc.read_file("alice", "secret.txt") == "alice's secret"
        assert svc.read_file("bob", "secret.txt") == "bob's secret"

        # Bob cannot reach Alice's file via path traversal.
        with pytest.raises(PermissionError):
            svc.read_file("bob", "../alice/secret.txt")

    def test_list_files_scoped_to_user(self, svc: ToolService) -> None:
        svc.write_file("alice", "a.txt", "a")
        svc.write_file("alice", "b.txt", "b")
        svc.write_file("bob", "c.txt", "c")

        alice_files = svc.list_files("alice")
        bob_files = svc.list_files("bob")

        assert set(alice_files) == {"a.txt", "b.txt"}
        assert set(bob_files) == {"c.txt"}

    def test_delete_file(self, svc: ToolService) -> None:
        svc.write_file("alice", "to_delete.txt", "gone")
        svc.delete_file("alice", "to_delete.txt")
        with pytest.raises(FileNotFoundError):
            svc.read_file("alice", "to_delete.txt")

    def test_delete_cannot_target_other_user(self, svc: ToolService) -> None:
        svc.write_file("alice", "mine.txt", "mine")
        with pytest.raises(PermissionError):
            svc.delete_file("bob", "../alice/mine.txt")

    def test_file_info(self, svc: ToolService) -> None:
        svc.write_file("alice", "info.txt", "data")
        info = svc.file_info("alice", "info.txt")
        assert info["is_file"] is True
        assert info["size"] == 4

    def test_workspace_roots_are_distinct(self, svc: ToolService, workspace_dir: Path) -> None:
        root_alice = svc.workspace_root("alice")
        root_bob = svc.workspace_root("bob")
        assert root_alice != root_bob
        assert root_alice.parent == root_bob.parent == workspace_dir.resolve()


# ---------------------------------------------------------------------------
# API-level (route) integration tests
# ---------------------------------------------------------------------------

@pytest.fixture()
def client(workspace_dir: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """TestClient with per-test isolated workspace and JWT secret."""
    monkeypatch.setenv("TOOL_WORKSPACE_BASE", str(workspace_dir))
    monkeypatch.setenv("JWT_SECRET", _JWT_SECRET)
    monkeypatch.setenv("JWT_ALGORITHM", _JWT_ALG)

    # Import app *after* env vars are set so dependencies pick them up.
    import importlib
    import app.core.auth as auth_mod
    import app.tools.policy as policy_mod
    import app.api.routes.tools as routes_mod

    importlib.reload(auth_mod)
    importlib.reload(policy_mod)
    importlib.reload(routes_mod)

    from app.main import app as fastapi_app
    # Rebuild route dependencies with fresh modules.
    fastapi_app.dependency_overrides = {}

    return TestClient(fastapi_app)


def _auth_headers(user_id: str) -> dict:
    return {"Authorization": f"Bearer {_make_token(user_id)}"}


class TestToolRoutes:
    def test_unauthenticated_request_rejected(self, client: TestClient) -> None:
        r = client.get("/v1/tools/files")
        # HTTPBearer raises 403 in older Starlette and 401 in newer — accept both.
        assert r.status_code in (401, 403)

    def test_write_and_read_own_file(self, client: TestClient) -> None:
        r = client.post(
            "/v1/tools/files",
            json={"path": "hello.txt", "content": "hi"},
            headers=_auth_headers("alice"),
        )
        assert r.status_code == 201

        r = client.get(
            "/v1/tools/files/read",
            params={"path": "hello.txt"},
            headers=_auth_headers("alice"),
        )
        assert r.status_code == 200
        assert r.json()["content"] == "hi"

    def test_cross_user_isolation(self, client: TestClient) -> None:
        """Alice writes a file; Bob cannot read it even with a valid JWT."""
        client.post(
            "/v1/tools/files",
            json={"path": "private.txt", "content": "alice-only"},
            headers=_auth_headers("alice"),
        )

        # Bob reads his own workspace — file does not exist there.
        r = client.get(
            "/v1/tools/files/read",
            params={"path": "private.txt"},
            headers=_auth_headers("bob"),
        )
        assert r.status_code == 404

    def test_path_traversal_via_api_blocked(self, client: TestClient) -> None:
        """Bob cannot traverse to Alice's workspace via the API."""
        client.post(
            "/v1/tools/files",
            json={"path": "secret.txt", "content": "alice-secret"},
            headers=_auth_headers("alice"),
        )

        r = client.get(
            "/v1/tools/files/read",
            params={"path": "../alice/secret.txt"},
            headers=_auth_headers("bob"),
        )
        # Either 403 (traversal blocked) or 404 (sandbox miss) is acceptable.
        assert r.status_code in (403, 404)

    def test_list_files_scoped(self, client: TestClient) -> None:
        client.post(
            "/v1/tools/files",
            json={"path": "a.txt", "content": "a"},
            headers=_auth_headers("alice"),
        )
        client.post(
            "/v1/tools/files",
            json={"path": "b.txt", "content": "b"},
            headers=_auth_headers("bob"),
        )

        r_alice = client.get("/v1/tools/files", headers=_auth_headers("alice"))
        r_bob = client.get("/v1/tools/files", headers=_auth_headers("bob"))

        assert r_alice.status_code == 200
        assert r_bob.status_code == 200
        assert set(r_alice.json()["files"]) == {"a.txt"}
        assert set(r_bob.json()["files"]) == {"b.txt"}

    def test_delete_own_file(self, client: TestClient) -> None:
        client.post(
            "/v1/tools/files",
            json={"path": "del.txt", "content": "bye"},
            headers=_auth_headers("alice"),
        )
        r = client.delete(
            "/v1/tools/files",
            params={"path": "del.txt"},
            headers=_auth_headers("alice"),
        )
        assert r.status_code == 200

    def test_expired_token_rejected(self, client: TestClient) -> None:
        expired = jwt.encode(
            {"sub": "alice", "exp": 0},  # exp in the past
            _JWT_SECRET,
            algorithm=_JWT_ALG,
        )
        r = client.get(
            "/v1/tools/files",
            headers={"Authorization": f"Bearer {expired}"},
        )
        assert r.status_code == 401
