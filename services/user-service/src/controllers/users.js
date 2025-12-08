import axios from "axios";
import User from "../models/user.model.js";


// ----------------------
// Get User
// ----------------------
export const getUser = async (req, res) => {
  try {
    const id = req.params.userID;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving user" });
  }
};

// ----------------------
// Create User
// ----------------------
export const createUser = async (req, res) => {
  try {
    const { userId, username, email } = req.body;
    let user = await User.findById(userId);

    if (user) {
      return res.status(400).json({ message: "User already exists." });
    }

    user = new User({ _id: userId, username, email, letterboxd: "" });
    await user.save();

    res.status(200).json({
      "status-code": 200,
      message: "User added successfully",
    });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({
      "status-code": 500,
      message: "An error occurred while adding the user",
    });
  }
};

// ----------------------
// Update User
// ----------------------
export const updateUser = async (req, res) => {
  try {
    const userId = req.params.userID;
    let user = await User.findById(userId);

    if (!user)
      return res.status(404).send({
        "status-code": 404,
        message: "User not found",
      });

    Object.keys(req.body).forEach((key) => {
      if (req.body[key] !== undefined) user[key] = req.body[key];
    });

    await user.save();

    res.status(200).send({
      "status-code": 200,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send({
      "status-code": 500,
      message: "Internal Server Error",
    });
  }
};

// ----------------------
// Delete User
// ----------------------
export const deleteUser = async (req, res) => {
  const userId = req.body.userId;

  try {
    const mongoResult = await User.deleteOne({ _id: userId });
    if (mongoResult.deletedCount === 0) {
      return res.status(404).send({
        "status-code": 404,
        message: "User not found in database",
      });
    }

    res.status(200).send({
      "status-code": 200,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).send({
      "status-code": 500,
      message: "An error occurred while deleting user",
      error: err.message,
    });
  }
};

// ----------------------
// Recommendations (Python)
// ----------------------
export const getUserRecommendation = async (req, res) => {
  // try {
  //   const userId = req.params.userID;

  //   const options = { args: [userId] };

  //   let movieIds = [];
  //   await PythonShell.run("data_processing/user_recommendation.py", options).then(
  //     (data) => {
  //       movieIds = JSON.parse(data[0]);
  //     }
  //   );

  //   const movies = await Movie.find({ _id: { $in: movieIds } });
  //   res.send(movies);
  // } catch (error) {
  //   console.error("Error fetching recommendations:", error);
  //   res.status(500).send({ error: "Internal Server Error" });
  // }
};

// ----------------------
// Add Watched Movie
// ----------------------
export const addUserMovie = async (req, res) => {
  const { movieId, userId, rating } = req.body;

  let user = await User.findById(userId);
  if (!user) user = new User({ _id: userId, username: "asd" });

  const movie = user.watched.find((m) => m._id === movieId);
  if (movie) movie.rating = rating;
  else user.watched.push({ _id: movieId, rating });

  await user.save();

  res.status(200).send({
    "status-code": 200,
    message: "Movie added Successfully",
  });
};

// ----------------------
// Delete Watched Movie
// ----------------------
export const deleteUserMovie = async (req, res) => {
  const { movieId, userId } = req.body;

  let user = await User.findById(userId);
  if (!user) user = new User({ _id: userId, username: "asd" });

  user.watched.pull({ _id: movieId });
  await user.save();

  res.status(200).send({
    "status-code": 200,
    message: "Movie removed Successfully",
  });
};

// ----------------------
// User Statistics
// ----------------------
export const getUserStatistics = async (req, res) => {
  try {
    const userId = req.params.userID;
    let user = await User.findById(userId);

    if (!user) {
      return res.status(404).send({
        status: 404,
        message: "User not found",
      });
    }

    // ------------------------------------
    // Fetch movie details from movie-service
    // ------------------------------------
    const movieIds = user.watched.map(m => m._id);

    const movieResponse = await axios.post(
      "http://movie-service:3002/movies/batch",
      { ids: movieIds }
    );

    const movies = movieResponse.data; // Array of movie objects

    // ------------------------------------
    // Genre counts
    // ------------------------------------
    const genreCounts = {};
    movies.forEach(movie => {
      const genres = (movie.genres || "").split(",").map(g => g.trim());
      genres.forEach(g => {
        if (!g) return;
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });

    // ------------------------------------
    // Year counts
    // ------------------------------------
    const yearCounts = {};
    movies.forEach(movie => {
      if (movie.release_date) {
        const year = new Date(movie.release_date).getFullYear();
        yearCounts[year] = (yearCounts[year] || 0) + 1;
      }
    });

    const years = Object.keys(yearCounts).map(Number);
    const startYear = Math.min(...years);
    const endYear = Math.max(...years);

    for (let y = startYear; y <= endYear; y++) {
      if (!yearCounts[y]) yearCounts[y] = 0;
    }

    // ------------------------------------
    // Average rating
    // ------------------------------------
    const validRatings = user.watched.filter(m => m.rating > 0);
    const averageRating =
      validRatings.length > 0
        ? (
            validRatings.reduce((sum, m) => sum + m.rating, 0) /
            validRatings.length
          ).toFixed(2)
        : "0.00";

    // ------------------------------------
    // Countries
    // ------------------------------------
    const countriesSet = new Set();
    movies.forEach(movie => {
      const countries = (movie.production_countries || "").split(",").map(c => c.trim());
      countries.forEach(c => c && countriesSet.add(c));
    });

    // ------------------------------------
    // Languages
    // ------------------------------------
    const languagesCounts = {};
    movies.forEach(movie => {
      const langs = (movie.spoken_languages || "").split(",").map(l => l.trim());
      langs.forEach(l => {
        if (!l) return;
        languagesCounts[l] = (languagesCounts[l] || 0) + 1;
      });
    });

    // ------------------------------------
    // Average rating by year
    // ------------------------------------
    const ratingsByYear = {};

    for (const watched of user.watched) {
      if (watched.rating > 0) {
        const movie = movies.find(m => m._id === watched._id);
        if (movie?.release_date) {
          const year = new Date(movie.release_date).getFullYear();
          if (!ratingsByYear[year]) ratingsByYear[year] = { sum: 0, count: 0 };
          ratingsByYear[year].sum += watched.rating;
          ratingsByYear[year].count++;
        }
      }
    }

    const averageRatingsByYear = {};
    for (let y = startYear; y <= endYear; y++) {
      const data = ratingsByYear[y] || { sum: 0, count: 0 };
      averageRatingsByYear[y] = (data.sum / (data.count || 1)).toFixed(2);
    }

    // ------------------------------------
    // Average rating by genre
    // ------------------------------------
    const ratingsByGenre = {};

    for (const watched of user.watched) {
      if (watched.rating > 0) {
        const movie = movies.find(m => m._id === watched._id);
        if (movie?.genres) {
          const genres = movie.genres.split(",").map(g => g.trim());
          genres.forEach(g => {
            if (!ratingsByGenre[g]) ratingsByGenre[g] = { sum: 0, count: 0 };
            ratingsByGenre[g].sum += watched.rating;
            ratingsByGenre[g].count++;
          });
        }
      }
    }

    const averageRatingsByGenres = {};
    for (const g in ratingsByGenre) {
      const data = ratingsByGenre[g];
      averageRatingsByGenres[g] = (data.sum / (data.count || 1)).toFixed(2);
    }

    // ------------------------------------
    // Total Hours
    // ------------------------------------
    const hours = Math.floor(
      movies.reduce((sum, m) => sum + (m.runtime || 0) / 60, 0)
    );

    const result = {
      films: movies.length,
      hours,
      averageRating,
      averageRatingYears: averageRatingsByYear,
      averageRatingGenres: averageRatingsByGenres,
      countries: countriesSet.size,
      languages: languagesCounts,
      genres: genreCounts,
      years: yearCounts,
    };

    res.status(200).json(result);
  } catch (err) {
    console.error("Error in getUserStatistics:", err);
    res.status(500).send({ error: "Internal Server Error" });
  }
};


// ----------------------
// Get User Watched List
// ----------------------
export const getUserWatched = async (req, res) => {
  try {
    const userId = req.params.userID;
    let user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // user.watched already contains: { _id: movieId, rating }
    const watched = user.watched.map((entry) => ({
      movieId: entry._id,
      rating: entry.rating,
    }));

    res.json({ watched });
  } catch (error) {
    console.error("Error retrieving user movies:", error);
    res.status(500).send({
      "status-code": 500,
      message: "Internal Server Error",
    });
  }
};


// ----------------------
// Letterboxd Import
// ----------------------
export const updateUserWatchedLetterboxd = async (req, res) => {
  const username = req.body.letterboxd;

  const movies = await fetchLetterboxdWatched(username);
  console.log("Fetched movies:", movies);

  if (!Array.isArray(movies)) {
    return res.status(500).send({
      "status-code": 500,
      message: "Letterboxd service returned invalid data",
    });
  }

  const userId = req.params.userID;
  let user = await User.findById(userId);
  if (!user) user = new User({ _id: userId, username: "asd" });

  for (const m of movies) {
    const exists = user.watched.some((wm) => wm._id === m.movieId);
    if (!exists && m.movieId) {
      user.watched.push({ _id: m.movieId, rating: m.rating });
    }
  }

  await user.save();

  res.status(200).send({
    "status-code": 200,
    message: "Movies added Successfully",
  });
};


// ----------------------
// Get Rating of One Movie
// ----------------------
export const getUserMovieRating = async (req, res) => {
  const { userID, movieID } = req.params;

  const user = await User.findById(userID);
  if (!user) return res.send(null);

  const movie = user.watched.find((m) => m._id === movieID);
  res.send(movie ? `${movie.rating}` : null);
};

// ----------------------
// Helper: Letterboxd Scraper
// ----------------------
async function fetchLetterboxdWatched(username) {
  try {
    const response = await axios.get(
      `http://letterboxd-service:3003/letterboxd/watched/${username}`
    );

    // Service already returns: { movieId, rating }
    return response.data;

  } catch (error) {
    console.error("Error calling letterboxd-service:", error.message);
    return [];
  }
}