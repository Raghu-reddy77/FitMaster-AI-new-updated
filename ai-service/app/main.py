"""
FitMaster AI – Python AI & Analytics Microservice
FastAPI entry point providing endpoints for nutrition gap prediction,
recommendations ranking, and server-side Matplotlib chart generation.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import predict, analytics

app = FastAPI(
    title="FitMaster AI – Machine Learning & Nutrition Microservice",
    description="Academic AI/ML microservice powering nutrition gap analysis, personalized food recommendations, and Matplotlib data analytics.",
    version="1.0.0"
)

# Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check Endpoint
@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "FitMaster AI Python Microservice",
        "runtime": "FastAPI + Uvicorn",
        "ai_frameworks": {
            "scikit_learn": "enabled",
            "matplotlib": "enabled",
            "pandas": "enabled"
        }
    }

# Root Welcome
@app.get("/", tags=["System"])
async def root():
    return {
        "message": "Welcome to FitMaster AI Microservice API",
        "docs_url": "/docs",
        "health_check": "/health"
    }

# Include routers
app.include_router(predict.router)
app.include_router(analytics.router)

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("AI_HOST", "0.0.0.0")
    port = int(os.getenv("AI_PORT", 8000))
    print(f"[FitMaster AI]: Starting FastAPI Microservice on http://{host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
