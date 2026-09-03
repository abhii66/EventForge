import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    venue: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: date,
      requierd: true,
    },
    registrationType: {
      type: String,
      enum: ["individual", "team"],
      default: "individual",
    },
    teamSize: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 1 },
    },
    capacity: {
      type: Number,
      required: true,
    },
    registeredCount: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["draft", "published", "ongoing", "completed", "cancelled"],
      default: "draft",
    },
  },
  { timestamps: true },
);

export const EventModel = mongoose.model("Event", eventSchema);
