import subprocess
import json
from fastapi import HTTPException

from src.database.mongo import letterboxd_collection


# ----------------------------------------
# Helper: run a Python script and parse JSON
# ----------------------------------------
def run_script(script_path: str, args: list[str]):
    try:
        result = subprocess.run(
            ["python3", script_path] + args,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            # stderr from the script is included in error
            raise HTTPException(status_code=500, detail=result.stderr)

        return json.loads(result.stdout)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ----------------------------------------
# Mapping Letterboxd slug -> TMDB ID
# Returns: dict { slug -> tmdbId }
# ----------------------------------------
async def map_letterboxd_to_tmdb(ids: list[str]) -> dict[str, int]:
    if not ids:
        return {}

    # 1) Find all existing mappings in Mongo
    cursor = letterboxd_collection.find({"_id": {"$in": ids}})

    existing: dict[str, int] = {}
    async for doc in cursor:
        existing[doc["_id"]] = doc["tmdbId"]

    # 2) Figure out which IDs are missing
    missing = [slug for slug in ids if slug not in existing]

    # 3) If any are missing, call the scraper
    if missing:
        scraped_ids = run_script("src/scripts/letterboxd_tmdb.py", missing)
        # scraped_ids is assumed to be aligned with `missing`

        for slug, tmdb_id in zip(missing, scraped_ids):
            if not tmdb_id:
                # don’t store null/empty mappings
                continue

            await letterboxd_collection.update_one(
                {"_id": slug},
                {"$set": {"_id": slug, "tmdbId": tmdb_id}},
                upsert=True,
            )
            existing[slug] = tmdb_id

    # existing now has only valid slug -> tmdbId entries
    return existing


# ----------------------------------------
# WATCHLIST: returns TMDB IDs list (no nulls)
# ----------------------------------------
async def get_watchlist(username: str):
    # script returns e.g.: ["speak-no-evil-2022", "the-last-duel-2021", ...]
    slugs = run_script("src/scripts/letterboxd_watchlist.py", [username])

    mapping = await map_letterboxd_to_tmdb(slugs)

    # keep original order, skip slugs that didn’t map
    tmdb_ids = [mapping[slug] for slug in slugs if slug in mapping]
    return tmdb_ids


# ----------------------------------------
# WATCHED MOVIES: returns [{ movieId, rating }]
# ----------------------------------------
async def get_watched_movies(username: str):
    # script returns: [{ "movie_id": "...", "rating": 4 }, ...]
    data = run_script("src/scripts/letterboxd_watched.py", [username])

    slugs = [item["movie_id"] for item in data]
    mapping = await map_letterboxd_to_tmdb(slugs)

    result = []
    for item in data:
        slug = item["movie_id"]
        rating = item["rating"]
        tmdb_id = mapping.get(slug)

        if tmdb_id is None:
            # skip unrsolved mappings
            continue

        result.append({
            "movieId": tmdb_id,
            "rating": rating,
        })

    return result


# ----------------------------------------
# Manual mapping endpoint: ids -> tmdbIds (no nulls)
# ----------------------------------------
async def get_movie_ids(ids: list[str]):
    mapping = await map_letterboxd_to_tmdb(ids)
    # keep order, skip missing
    return [mapping[slug] for slug in ids if slug in mapping]
