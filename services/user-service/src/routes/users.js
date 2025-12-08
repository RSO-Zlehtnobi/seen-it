import express from "express";
const router = express.Router();

import { 
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getUserRecommendation,
    addUserMovie,
    deleteUserMovie,
    getUserStatistics,
    getUserWatched,
    updateUserWatchedLetterboxd,
    getUserMovieRating
} from "../controllers/users.js";

router.get("/:userID", getUser);
router.post("/", createUser);
router.put("/:userID", updateUser);
router.delete("/:userID", deleteUser);
router.get("/:userID/recommendation", getUserRecommendation);
router.post("/:userID/movie", addUserMovie);
router.delete("/:userID/movie", deleteUserMovie);
router.get("/:userID/statistics", getUserStatistics);
router.get("/:userID/watched", getUserWatched);
router.put("/:userID/watched/letterboxd", updateUserWatchedLetterboxd);
router.get("/:userID/:movieID/", getUserMovieRating);

export default router; 
