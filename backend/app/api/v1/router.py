"""Aggregate router for API version 1."""

from fastapi import APIRouter

from app.api.v1.routes import datasets, projects

api_router = APIRouter()
api_router.include_router(projects.router)
api_router.include_router(datasets.router)
