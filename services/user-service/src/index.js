import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import userRoutes from "./routes/users.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// ---- MongoDB connection ----
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("User DB connected"))
  .catch((err) => console.error("MongoDB error:", err));

// ---- Routes ----
app.use("/users", userRoutes);

app.get("/", (req, res) => {
  res.send("User Service is running");
});

// ---- Start server ----
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));
