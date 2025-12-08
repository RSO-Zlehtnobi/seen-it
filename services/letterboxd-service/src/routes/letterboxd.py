from fastapi import APIRouter
from src.controllers.letterboxd_controller import (
    get_watchlist,
    get_watched_movies,
    get_movie_ids
)

router = APIRouter(prefix="/letterboxd")

@router.get("/watchlist/{username}")
async def route_watchlist(username: str):
    # get_watchlist is async -> MUST await
    return await get_watchlist(username)

@router.get("/watched/{username}")
async def route_watched(username: str):
    return await get_watched_movies(username)

@router.post("/map")
async def route_map(body: dict):
    slugs = body.get("ids", [])
    return await get_movie_ids(slugs)
