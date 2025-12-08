import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import movieRoutes from "./routes/movies.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// -------------------------------------------
// MongoDB connection
// -------------------------------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Movie Service: Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// -------------------------------------------
// Routes
// -------------------------------------------
app.use("/movies", movieRoutes);

app.get("/", (req, res) => {
  res.send("Movie Service is running");
});

// -------------------------------------------
// Start Server
// -------------------------------------------
const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Movie Service listening on port ${PORT}`);
});
