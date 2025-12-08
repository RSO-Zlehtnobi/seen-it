from pydantic import BaseModel, Field
from typing import Optional


# Pydantic model (validation + response schema)
class LetterboxdIdModel(BaseModel):
    id: str = Field(..., alias="_id")
    tmdbId: str  
    
    class Config:
        allow_population_by_field_name = True