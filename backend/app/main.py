from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="MatchCota API",
    description="API per connectar protectores amb adoptants",
    version="0.1.0"
)

# CORS - permetre requests des del frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "MatchCota API",
        "version": "0.1.0",
        "status": "running"
    }

@app.get("/api/v1/health")
async def health():
    return {"status": "healthy"}
