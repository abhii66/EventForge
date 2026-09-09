import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    registration: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Registration",
      required: true,
    },
    ticketId: { type: String, required: true, unique: true },
    signature: { type: String, required: true },
    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date },
  },
  { timestamps: true },
);

export const TicketModel = mongoose.model("Ticket", ticketSchema);
