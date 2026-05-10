"""
FastAPI Main Application: CORS configuration and router initialization.
[AI-NOTE] Entry point for production backend serving 3D React/Three.js frontend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys

from routers import router
from ml_engine import MLEngine

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ============ FASTAPI APP INITIALIZATION ============
app = FastAPI(
    title="Pipeline Intelligence API",
    description="Production backend for Intelligent Pipeline Monitor",
    version="1.0.0"
)

# ============ CORS MIDDLEWARE ============
# [AI-NOTE] Allows 3D frontend (React/Three.js) to connect without CORS blocking
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (restrict in production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ STARTUP EVENTS ============
@app.on_event("startup")
def startup():
    """
    [AI-NOTE] Runs on application startup.
    Initializes ML engine, validates dependencies.
    """
    try:
        logger.info("🚀 Pipeline Intelligence API starting...")
        
        # Verify ML models are loadable
        ml_engine = MLEngine()
        if not ml_engine.is_initialized():
            raise RuntimeError("ML models failed to initialize")
        
        logger.info("✅ ML engine initialized successfully")
        logger.info("✅ FastAPI startup complete - ready to serve requests")
    
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        sys.exit(1)


@app.on_event("shutdown")
def shutdown():
    """[AI-NOTE] Cleanup on graceful shutdown."""
    logger.info("🛑 Pipeline Intelligence API shutting down...")


# ============ ROUTER REGISTRATION ============
app.include_router(router)


# ============ ROOT ENDPOINT ============
@app.get("/")
def root():
    """[AI-NOTE] API root with metadata."""
    return {
        "api": "Pipeline Intelligence Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "operational"
    }


# ============ EXCEPTION HANDLERS ============
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    """[AI-NOTE] Graceful handling of validation errors."""
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)}
    )


# ============ METADATA ============
if __name__ == "__main__":
    import uvicorn
    
    # [AI-NOTE] Run with: uvicorn main:app --host 0.0.0.0 --port 8550 --reload
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,  # Set True for development
        log_level="info"
    )
