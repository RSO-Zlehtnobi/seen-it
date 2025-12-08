from src.database.mongo import letterboxd_collection
from src.models.letterboxd.model import LetterboxdIdModel

async def save_mapping(slug: str, movie_id: int):
    doc = {"_id": slug, "tmdbId": movie_id}
    await letterboxd_collection.update_one(
        {"_id": slug},
        {"$set": doc},
        upsert=True
    )

async def get_mapping(slug: str):
    doc = await letterboxd_collection.find_one({"_id": slug})
    if doc:
        return LetterboxdIdModel(**doc)
    return None

async def bulk_save(slugs: list[str], ids: list[int]):
    ops = []
    for s, mid in zip(slugs, ids):
        ops.append(
            {"_id": s, "movieId": mid}
        )
    for doc in ops:
        await letterboxd_collection.update_one(
            {"_id": doc["_id"]},
            {"$set": doc},
            upsert=True
        )
    return True
