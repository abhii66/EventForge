import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  type: { type: String, enum: ["individual", "team"], required: true },

  // the account that owns this registration — the attendee, or the team leader for team registrations
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },

  status: {
    type: String,
    enum: ["confirmed", "waitlisted", "cancelled"],
    default: "confirmed",
  },
  // higher = promoted first from the waitlist; ties fall back to registeredAt (FIFO)
  priorityScore: { type: Number, default: 0 },

  registeredAt: { type: Date, default: Date.now },
});

// waitlist scan on cancel, and "my registrations"
registrationSchema.index({ event: 1, status: 1 });
registrationSchema.index({ user: 1, status: 1 });

export const RegistrationModel = mongoose.model(
  "Registration",
  registrationSchema,
);
