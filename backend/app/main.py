"""FastAPI application entry point."""

from fastapi import FastAPI

from app.api.routes.tools import router as tools_router

app = FastAPI(title="Tool API", version="1.0.0")

app.include_router(tools_router, prefix="/v1")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
