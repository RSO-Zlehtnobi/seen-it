import mongoose from "mongoose";

const ImdbRatingsSchema = mongoose.Schema(
  {
    _id: {
        type: String,
        required: true,
      },
    averageRating: {
      type: Number,
      required: true,
    },
    numVotes: {
      type: Number,
      required: true,
    },
  }
);


const Rating = mongoose.model("Rating", ImdbRatingsSchema);

export default Rating;