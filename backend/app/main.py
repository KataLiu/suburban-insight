from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import compare, councils, health, suburbs
from app.core.config import settings

app = FastAPI(title="Suburban Insight API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(suburbs.router)
app.include_router(compare.router)
app.include_router(councils.router)
