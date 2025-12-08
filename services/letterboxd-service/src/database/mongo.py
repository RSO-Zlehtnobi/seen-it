from motor.motor_asyncio import AsyncIOMotorClient
import os

# Mongo connection URL (replace if needed)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://letterboxd-db:27017")

# Database name
DB_NAME = os.getenv("DB_NAME", "letterboxd")

# Create async Mongo client
client = AsyncIOMotorClient(MONGO_URI)

# Access database
db = client[DB_NAME]

# Access collection
letterboxd_collection = db["letterboxd_ids"]
