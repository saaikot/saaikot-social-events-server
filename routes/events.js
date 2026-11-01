const express = require("express");
const { getDB } = require("../db");
const verifyToken = require("../middleware/verifyToken");
const { ObjectId } = require("mongodb");
const router = express.Router();

// Create Event API (Protected Route)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, description, eventType, imageUrl, location, eventDate } = req.body;
    const db = getDB();

    if (!title || !description || !eventType || !location || !eventDate) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    const today = new Date();
    const selectedDate = new Date(eventDate);
    if (selectedDate < today) {
      return res.status(400).json({ message: "Event date must be in the future!" });
    }

    const newEvent = {
      title,
      description,
      eventType,
      imageUrl: imageUrl || "https://via.placeholder.com/300",
      location,
      eventDate: selectedDate,
      userEmail: req.user.email,
      userName: req.user.name,
      createdAt: new Date(),
    };

    const result = await db.collection("events").insertOne(newEvent);
    res.status(201).json({
      message: "Event created successfully",
      insertedId: result.insertedId,
      event: newEvent,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1. Get all Upcoming Events (Public Route) — For Events Page
router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const today = new Date();
    const events = await db.collection("events")
      .find({ eventDate: { $gte: today } })
      .sort({ eventDate: 1 })
      .toArray();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ নতুন রাউট: Recent Upcoming Events (Home Page-এর জন্য, .limit() ব্যবহার করে)
router.get("/recent", async (req, res) => {
  try {
    const db = getDB();
    const today = new Date();
    const limit = parseInt(req.query.limit) || 6; // ডিফল্ট ৬টি

    const events = await db.collection("events")
      .find({ eventDate: { $gte: today } })
      .sort({ eventDate: 1 }) // নিকটতম ইভেন্ট আগে
      .limit(limit) // ✅ MongoDB .limit() অপারেটর
      .toArray();

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get Logged-in User's Own Events (Private Route)
router.get("/my-events", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const events = await db.collection("events")
      .find({ userEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get Single Event by ID
router.get("/:id", async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Event ID" });
    }

    const event = await db.collection("events").findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Join Event API (Protected Route)
router.post("/:id/join", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const userEmail = req.user.email;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Event ID" });
    }

    const event = await db.collection("events").findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const alreadyJoined = event.joinedUsers?.includes(userEmail);
    if (alreadyJoined) {
      return res.status(400).json({ message: "You have already joined this event" });
    }

    await db.collection("events").updateOne(
      { _id: new ObjectId(id) },
      { $push: { joinedUsers: userEmail } }
    );

    res.status(200).json({ message: "Joined event successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Update Event API (Protected Route, Owner only)
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { title, description, eventType, imageUrl, location, eventDate } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Event ID" });
    }

    const event = await db.collection("events").findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.userEmail !== req.user.email) {
      return res.status(403).json({ message: "You are not authorized to update this event" });
    }

    const updatedData = {
      title,
      description,
      eventType,
      imageUrl,
      location,
      eventDate: new Date(eventDate),
    };

    await db.collection("events").updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    res.status(200).json({ message: "Event updated successfully", event: updatedData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Delete Event API (Protected Route, Owner only)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Event ID" });
    }

    const event = await db.collection("events").findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.userEmail !== req.user.email) {
      return res.status(403).json({ message: "You are not authorized to delete this event" });
    }

    await db.collection("events").deleteOne({ _id: new ObjectId(id) });

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;