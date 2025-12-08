import express from "express";

import {
    getMovies,
    getRandomMovie,
    getHomeMovies,
    getImdbRating,
    getMoviesWithFilters
} from "../controllers/movies.js";

const router = express.Router();

// POST
router.post("/", getMovies);

// GET
router.get("/random", getRandomMovie);
router.get("/home", getHomeMovies);
router.get("/imdb/:imdbID", getImdbRating);
router.get("/find/:filters", getMoviesWithFilters);

export default router;
