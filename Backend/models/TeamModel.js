import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        name: { type: String, required: true },
        email: { type: String, required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // set only if they have an account
      },
    ],
  },
  { timestamps: true },
);

export const TeamModel = mongoose.model("Team", teamSchema);
