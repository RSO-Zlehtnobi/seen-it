import mongoose from "mongoose";

const UserSchema = mongoose.Schema(
  {
    _id: {
        type: String,
        required: true,
      },
    email: {
        type: String,
        required: true,
    },
    username: {
        type: String,
        required: true,
    },
    letterboxd: {
        type: String,
        default: false,
    },
    allowWatched:{
      type: Boolean,
      default: false,
    },
    watched:[{
      _id: {
        type: String,
        required: true,
      },
      rating: {
        type: Number,
        required: true,
      },
    }],
  }
);


const User = mongoose.model("User", UserSchema);
export default User;