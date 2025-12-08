import Movie from "../models/movie.model.js";
import ImdbRatings from "../models/imdb_ratings.model.js";
import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";

const tmdbApiKey = process.env.TMDB_API_KEY;

// ----------------------
// Get Movies by IDs
// ----------------------
export const getMovies = async (req, res) => {
  const { movieIds } = req.body;
  const movies = await Movie.find({ _id: { $in: movieIds } });
  res.json(movies);
};

// ----------------------
// Get Movies With Filters
// ----------------------
export const getMoviesWithFilters = async (req, res) => {
  const filters = JSON.parse(req.params.filters);
  const movies = await fetchTmdbMovies(filters, 2, filters["load_count"] * 2 - 1);
  res.json(movies);
};

// ----------------------
// Get Random Movie
// ----------------------
export const getRandomMovie = async (req, res) => {
  try {
    const params = {
      api_key: process.env.TMDB_API_KEY,
      "vote_count.gte": 500,
      sort_by: "popularity.desc",
      page: Math.floor(Math.random() * 20) + 1,
    };

    const url = `https://api.themoviedb.org/3/discover/movie?${qs.stringify(params)}`;
    
    const response = await axios.get(url);

    if (!response.data?.results?.length) {
      return res.status(500).json({ error: "No movies returned by TMDB" });
    }

    // pick a random movie from the results
    const movies = response.data.results;
    const randomMovie = movies[Math.floor(Math.random() * movies.length)];

    return res.json(randomMovie);

  } catch (err) {
    console.error("Error fetching random movie:", err.message);
    return res.status(500).json({
      error: "Failed to fetch movie from TMDB",
      details: err.message,
    });
  }
};


// ----------------------
// Get Home Movies
// ----------------------
export const getHomeMovies = async (req, res) => {
  const movies = {};
  
  movies["new_movies"] = shuffle(await fetchNewMovies("", 1));
  movies["top_rated"] = shuffle(await fetchTopRatedMovies("", 1));
  movies["trending"] = shuffle(await fetchTrendingMovies("", 1));
  
  movies["showcase"] = movies["trending"][0];
  movies["trending"].shift();
  movies["showcase"]["logo"] = await getMovieLogo(movies["showcase"].id);

  res.json(movies);
};

// ----------------------
// Get IMDb Rating
// ----------------------
export const getImdbRating = async (req, res) => {
  const movieId = req.params.imdbID;
  const movie = await ImdbRatings.findOne({ _id: movieId });
  res.json(movie);
};

// ==========================================================
// INTERNAL FUNCTIONS BELOW — these are NOT exported
// ==========================================================
async function fetchTmdbMovies(filters, numPages = 5, pageStart = 1) {
  let movies = [];

  const genreIds = filters.genres.map((genre) =>
    Object.keys(genres).find((k) => genres[k] === genre)
  );

  for (let i = pageStart; i < pageStart + numPages; i++) {
    const params = {
      api_key: tmdbApiKey,
      with_genres: genreIds.join(","),
      "vote_count.gte": 500,
      sort_by: "popularity.desc",
      page: i,
    };

    if (filters.type === "New movies") {
      params.sort_by = "primary_release_date.desc";
    }

    const uri = `https://api.themoviedb.org/3/discover/movie?${qs.stringify(params)}`;
    
    try {
      const response = await axios.get(uri);
      if (response.status === 200) movies = movies.concat(response.data.results);
    } catch (error) {
      console.error(error);
    }
  }

  return movies;
}

async function fetchNewMovies(filters, numPages = 5) {
  let movies = [];

  for (let i = 1; i <= numPages; i++) {
    const params = {
      api_key: tmdbApiKey,
      "vote_count.gte": 250,
      "user_score.gte": 5,
      sort_by: "primary_release_date.desc",
      page: i,
    };

    const uri = `https://api.themoviedb.org/3/discover/movie?${qs.stringify(params)}`;

    try {
      const response = await axios.get(uri);
      if (response.status === 200) movies = movies.concat(response.data.results);
    } catch (error) {
      console.error(error);
    }
  }

  return movies;
}

async function fetchTopRatedMovies(filters, numPages = 5) {
  let movies = [];

  for (let i = 1; i <= numPages; i++) {
    const params = { api_key: tmdbApiKey, page: i };

    const uri = `https://api.themoviedb.org/3/movie/top_rated?${qs.stringify(params)}`;

    try {
      const response = await axios.get(uri);
      if (response.status === 200) movies = movies.concat(response.data.results);
    } catch (error) {
      console.error(error);
    }
  }

  return movies;
}

async function fetchTrendingMovies(filters, numPages = 5) {
  let movies = [];

  for (let i = 1; i <= numPages; i++) {
    const params = { api_key: tmdbApiKey, page: i };

    const uri = `https://api.themoviedb.org/3/movie/popular?${qs.stringify(params)}`;

    try {
      const response = await axios.get(uri);
      if (response.status === 200) movies = movies.concat(response.data.results);
    } catch (error) {
      console.error(error);
    }
  }

  return movies;
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

async function getMovieLogo(movieId) {
  let logo = "";
  const params = { api_key: tmdbApiKey };

  const uri = `https://api.themoviedb.org/3/movie/${movieId}/images?${qs.stringify(params)}`;

  try {
    const response = await axios.get(uri);
    if (response.status === 200) {
      const logos = response.data.logos;
      let best = -1;

      for (const item of logos) {
        if (
          item.iso_639_1 === "en" &&
          item.file_path.endsWith(".png") &&
          item.vote_average > best
        ) {
          best = item.vote_average;
          logo = item.file_path;
        }
      }

      if (!logo && logos.length > 0) logo = logos[0].file_path;
    }
  } catch (error) {
    console.error(error);
  }

  return logo;
}

// ------------------------------------------------------------
// STATIC DATA (same as your original file)
// ------------------------------------------------------------

const services = {
  8: "Netflix",
  337: "Disney Plus",
  15: "Hulu",
  386: "Peacock",
  9: "Amazon Prime Video",
  2: "Apple TV",
  384: "HBO Max",
  1899: "Max",
};

const genres = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

const countries = {
  "AD": "Andorra",
  "AE": "United Arab Emirates",
  "AG": "Antigua and Barbuda",
  "AL": "Albania",
  "AO": "Angola",
  "AR": "Argentina",
  "AT": "Austria",
  "AU": "Australia",
  "AZ": "Azerbaijan",
  "BA": "Bosnia and Herzegovina",
  "BB": "Barbados",
  "BE": "Belgium",
  "BF": "Burkina Faso",
  "BG": "Bulgaria",
  "BH": "Bahrain",
  "BM": "Bermuda",
  "BO": "Bolivia",
  "BR": "Brazil",
  "BS": "Bahamas",
  "BY": "Belarus",
  "BZ": "Belize",
  "CA": "Canada",
  "CD": "Congo",
  "CH": "Switzerland",
  "CI": "Cote D'Ivoire",
  "CL": "Chile",
  "CM": "Cameroon",
  "CO": "Colombia",
  "CR": "Costa Rica",
  "CU": "Cuba",
  "CV": "Cape Verde",
  "CY": "Cyprus",
  "CZ": "Czech Republic",
  "DE": "Germany",
  "DK": "Denmark",
  "DO": "Dominican Republic",
  "DZ": "Algeria",
  "EC": "Ecuador",
  "EE": "Estonia",
  "EG": "Egypt",
  "ES": "Spain",
  "FI": "Finland",
  "FJ": "Fiji",
  "FR": "France",
  "GB": "United Kingdom",
  "GF": "French Guiana",
  "GH": "Ghana",
  "GI": "Gibraltar",
  "GP": "Guadeloupe",
  "GQ": "Equatorial Guinea",
  "GR": "Greece",
  "GT": "Guatemala",
  "GY": "Guyana",
  "HK": "Hong Kong",
  "HN": "Honduras",
  "HR": "Croatia",
  "HU": "Hungary",
  "ID": "Indonesia",
  "IE": "Ireland",
  "IL": "Israel",
  "IN": "India",
  "IQ": "Iraq",
  "IS": "Iceland",
  "IT": "Italy",
  "JM": "Jamaica",
  "JO": "Jordan",
  "JP": "Japan",
  "KE": "Kenya",
  "KR": "South Korea",
  "KW": "Kuwait",
  "LB": "Lebanon",
  "LC": "St. Lucia",
  "LI": "Liechtenstein",
  "LT": "Lithuania",
  "LU": "Luxembourg",
  "LV": "Latvia",
  "LY": "Libyan Arab Jamahiriya",
  "MA": "Morocco",
  "MC": "Monaco",
  "MD": "Moldova",
  "ME": "Montenegro",
  "MG": "Madagascar",
  "MK": "Macedonia",
  "ML": "Mali",
  "MT": "Malta",
  "MU": "Mauritius",
  "MW": "Malawi",
  "MX": "Mexico",
  "MY": "Malaysia",
  "MZ": "Mozambique",
  "NE": "Niger",
  "NG": "Nigeria",
  "NI": "Nicaragua",
  "NL": "Netherlands",
  "NO": "Norway",
  "NZ": "New Zealand",
  "OM": "Oman",
  "PA": "Panama",
  "PE": "Peru",
  "PF": "French Polynesia",
  "PG": "Papua New Guinea",
  "PH": "Philippines",
  "PK": "Pakistan",
  "PL": "Poland",
  "PS": "Palestinian Territory",
  "PT": "Portugal",
  "PY": "Paraguay",
  "QA": "Qatar",
  "RO": "Romania",
  "RS": "Serbia",
  "RU": "Russia",
  "SA": "Saudi Arabia",
  "SC": "Seychelles",
  "SE": "Sweden",
  "SG": "Singapore",
  "SI": "Slovenia",
  "SK": "Slovakia",
  "SM": "San Marino",
  "SN": "Senegal",
  "SV": "El Salvador",
  "TC": "Turks and Caicos Islands",
  "TD": "Chad",
  "TH": "Thailand",
  "TN": "Tunisia",
  "TR": "Turkey",
  "TT": "Trinidad and Tobago",
  "TW": "Taiwan",
  "TZ": "Tanzania",
  "UA": "Ukraine",
  "UG": "Uganda",
  "US": "United States of America",
  "UY": "Uruguay",
  "VA": "Holy See",
  "VE": "Venezuela",
  "XK": "Kosovo",
  "YE": "Yemen",
  "ZA": "South Africa",
  "ZM": "Zambia",
  "ZW": "Zimbabwe",
};
