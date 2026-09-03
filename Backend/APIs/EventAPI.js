import exp from "express";
import { EventModel } from "../models/EventModel.js";

export const eventApp = exp.Router();

//create orgainzer - admin only
eventApp.post(
  "/create",
  isAuthenticated,
  authorizedRoles("organizer", "admin"),
  async (req, res) => {
    try {
      const event = new EventModel({
        ...req.body,
        organizeer: req.user.id,
        status: "published",
      });
      await event.save();
      res.status(201).json({ message: "Event Created", event });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Faailed to create event", error: err.message });
    }
  },
);

//get all events
eventApp.get("/all", async (req, res) => {
  try {
    const { category, city, search } = req.query;
    const filter = { status: "published" };

    if (category) filter.category = category;
    if (city) filter.city = city;
    if (search) filter.name = { $regex: search, $options: "i" };

    const events = await EventModel.find(filter)
      .populate("organizer", "name email")
      .sort({ startTime: 1 });
    res.status(200).json({ events });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch events", error: err.message });
  }
});

//get event by id
eventApp.get("/:id", async (req, res) => {
  try {
    const event = await EventModel.findById(req.params.id).populate(
      "organizer",
      "name email",
    );
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json({ event });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch event", error: err.message });
  }
});
