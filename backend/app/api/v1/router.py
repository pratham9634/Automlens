"""Aggregate router for API version 1."""

from fastapi import APIRouter

from app.api.v1.routes import (
    audit,
    datasets,
    decision_engine,
    explanations,
    exports,
    predictions,
    profiling,
    projects,
    training,
)

api_router = APIRouter()
api_router.include_router(projects.router)
api_router.include_router(datasets.router)
api_router.include_router(profiling.router)
api_router.include_router(decision_engine.router)
api_router.include_router(training.router)
api_router.include_router(predictions.router)
api_router.include_router(explanations.router)
api_router.include_router(audit.router)
api_router.include_router(exports.router)
