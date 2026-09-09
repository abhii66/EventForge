import exp from "express";
import crypto from "crypto";
import { TicketModel } from "../models/TicketModel.js";
import { isAuthenticated, authorizeRoles } from "../middleware/verifyToken.js";
import QRCode from "qrcode";

export const ticketApp = exp.Router();

function sign(ticketId) {
  return crypto
    .createHmac("sha256", process.env.TICKET_SECRET)
    .update(ticketId)
    .digest("hex");
}

// called internally after a registration is confirmed — not a public route
export async function issueTicket(registrationId) {
  const ticketId = crypto.randomUUID();
  const signature = sign(ticketId);
  return TicketModel.create({
    registration: registrationId,
    ticketId,
    signature,
  });
}

//organizer scans QR, sends back { ticketId, signature }
ticketApp.post(
  "/verify",
  isAuthenticated,
  authorizeRoles("organizer", "admin"),
  async (req, res) => {
    try {
      const { ticketId, signature } = req.body;

      if (sign(ticketId) !== signature) {
        return res.status(400).json({ message: "Invalid ticket" });
      }

      const ticket = await TicketModel.findOne({ ticketId }).populate({
        path: "registration",
        populate: [{ path: "user", select: "name email" }, { path: "team" }],
      });
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });

      if (ticket.checkedIn) {
        return res.status(409).json({
          message: "Already checked in",
          checkedInAt: ticket.checkedInAt,
        });
      }

      ticket.checkedIn = true;
      ticket.checkedInAt = new Date();
      await ticket.save();

      res.json({ message: "Checked in", details: ticket.registration });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Verification failed", error: err.message });
    }
  },
);

//fetch a ticket for the frontend to render as QR
ticketApp.get("/my/:registrationId", isAuthenticated, async (req, res) => {
  try {
    const ticket = await TicketModel.findOne({
      registration: req.params.registrationId,
    });
    if (!ticket)
      return res
        .status(404)
        .json({ message: "No ticket for this registration" });
    res.json({
      ticketId: ticket.ticketId,
      signature: ticket.signature,
      checkedIn: ticket.checkedIn,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch ticket", error: err.message });
  }
});

//returns a QR code as a PNG data URL
ticketApp.get("/qr/:registrationId", isAuthenticated, async (req, res) => {
  try {
    const ticket = await TicketModel.findOne({
      registration: req.params.registrationId,
    });
    if (!ticket)
      return res
        .status(404)
        .json({ message: "No ticket for this registration" });

    const payload = JSON.stringify({
      ticketId: ticket.ticketId,
      signature: ticket.signature,
    });
    const qrDataUrl = await QRCode.toDataURL(payload);

    res.json({ qrCode: qrDataUrl, checkedIn: ticket.checkedIn });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to generate QR", error: err.message });
  }
});
