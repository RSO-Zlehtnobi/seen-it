from fastapi import FastAPI
from src.routes.letterboxd import router as letterboxd_router

app = FastAPI(title="Letterboxd Service")

app.include_router(letterboxd_router)

@app.get("/")
def root():
    return {"message": "Letterboxd Service Running"}
