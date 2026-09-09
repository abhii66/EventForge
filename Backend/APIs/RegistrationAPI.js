import exp from "express";
import { EventModel } from "../models/EventModel.js";
import { RegistrationModel } from "../models/RegistrationModel.js";
import { TeamModel } from "../models/TeamModel.js";
import { isAuthenticated } from "../middleware/verifyToken.js";
import { issueTicket } from "./TicketAPI.js";

export const registerApp = exp.Router();

// shared capacity claim, used by both individual and team registration
async function claimSeat(eventId) {
  return EventModel.findOneAndUpdate(
    { _id: eventId, $expr: { $lt: ["$registeredCount", "$capacity"] } },
    { $inc: { registeredCount: 1 } },
    { new: true },
  );
}

//individual registration
registerApp.post("/:eventId", isAuthenticated, async (req, res) => {
  try {
    const { eventId } = req.params;

    const claimed = await claimSeat(eventId);
    const status = claimed ? "confirmed" : "waitlisted";

    const registration = new RegistrationModel({
      event: eventId,
      type: "individual",
      user: req.user.id,
      status,
    });
    await registration.save();

    if (status === "confirmed") await issueTicket(registration._id);

    res.status(201).json({ message: `Registration ${status}`, registration });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
});

//team registration
registerApp.post("/team/:eventId", isAuthenticated, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { teamName, members } = req.body; // members: [{ name, email }]

    const event = await EventModel.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.registrationType !== "team") {
      return res
        .status(400)
        .json({ message: "This event does not accept team registrations" });
    }

    const size = members.length + 1; // +1 for the leader
    if (size < event.teamSize.min || size > event.teamSize.max) {
      return res
        .status(400)
        .json({
          message: `Team size must be between ${event.teamSize.min} and ${event.teamSize.max}`,
        });
    }

    const team = await TeamModel.create({
      name: teamName,
      event: eventId,
      leader: req.user.id,
      members,
    });

    const claimed = await claimSeat(eventId);
    const status = claimed ? "confirmed" : "waitlisted";

    const registration = await RegistrationModel.create({
      event: eventId,
      type: "team",
      team: team._id,
      status,
    });

    if (status === "confirmed") await issueTicket(registration._id);

    res
      .status(201)
      .json({ message: `Team registration ${status}`, registration, team });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Team registration failed", error: err.message });
  }
});

//cancel + auto-promote next waitlisted registration
registerApp.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const registration = await RegistrationModel.findById(req.params.id);
    if (!registration)
      return res.status(404).json({ message: "Registration not found" });
    if (registration.status === "cancelled")
      return res.status(400).json({ message: "Already cancelled" });

    const wasConfirmed = registration.status === "confirmed";
    registration.status = "cancelled";
    await registration.save();

    if (wasConfirmed) {
      await EventModel.findByIdAndUpdate(registration.event, {
        $inc: { registeredCount: -1 },
      });

      const nextInLine = await RegistrationModel.findOne({
        event: registration.event,
        status: "waitlisted",
      }).sort({ registeredAt: 1 });

      if (nextInLine) {
        nextInLine.status = "confirmed";
        await nextInLine.save();
        await EventModel.findByIdAndUpdate(registration.event, {
          $inc: { registeredCount: 1 },
        });
        await issueTicket(nextInLine._id);
      }
    }

    res.json({ message: "Registration cancelled" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Cancellation failed", error: err.message });
  }
});

//logged-in user's own registrations
registerApp.get("/my", isAuthenticated, async (req, res) => {
  try {
    const registrations = await RegistrationModel.find({
      user: req.user.id,
    }).populate("event", "title startTime venue");
    res.json(registrations);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch registrations", error: err.message });
  }
});
