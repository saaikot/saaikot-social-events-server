const express = require("express");
const { getDB } = require("../db");
const verifyToken = require("../middleware/verifyToken");
const { ObjectId } = require("mongodb");
const router = express.Router();

// 1. Create Event
router.post("/", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const { title, description, eventType, imageUrl, location, eventDate } = req.body;
    
    if (new Date(eventDate) < new Date()) {
      return res.status(400).json({ message: "Date must be in future" });
    }

    const newEvent = {
      title, description, eventType, imageUrl, location,
      eventDate: new Date(eventDate),
      userEmail: req.user.email,
      userName: req.user.name,
      joinedUsers: [],
      createdAt: new Date(),
    };

    const result = await db.collection("events").insertOne(newEvent);
    res.status(201).json({ message: "Event created", id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Get All Upcoming Events
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

// 3. Get Recent 6 Events (Home Page)
router.get("/recent", async (req, res) => {
  try {
    const db = getDB();
    const today = new Date();
    const events = await db.collection("events")
      .find({ eventDate: { $gte: today } })
      .sort({ eventDate: 1 })
      .limit(6)
      .toArray();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get My Events (For Manage Page)
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

// 5. Get Single Event
router.get("/:id", async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Event ID" });
    }

    const event = await db.collection("events").findOne({ _id: new ObjectId(id) });
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Join Event
router.post("/:id/join", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const userEmail = req.user.email;

    // ✅ সার্ভার টার্মিনালে দেখার জন্য লগ
    console.log(`[JOIN ATTEMPT] User: ${userEmail}, Event: ${id}`);

    if (!userEmail) {
      console.log("[JOIN ERROR] No email found in token");
      return res.status(401).json({ message: "User email not found in token" });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Event ID" });
    }

    const event = await db.collection("events").findOne({ _id: new ObjectId(id) });
    if (!event) return res.status(404).json({ message: "Event not found" });
    
    // ✅ চেক করা হচ্ছে অলরেডি জয়েন করা আছে কি না
    if (event.joinedUsers && event.joinedUsers.includes(userEmail)) {
      console.log("[JOIN ERROR] User already joined");
      return res.status(400).json({ message: "You have already joined this event" });
    }

    // ✅ ইভেন্টে ইউজারকে পুশ করা হচ্ছে
    await db.collection("events").updateOne(
      { _id: new ObjectId(id) },
      { $push: { joinedUsers: userEmail } }
    );
    
    console.log("[JOIN SUCCESS] User added to joinedUsers");
    res.status(200).json({ message: "Joined successfully" });
  } catch (error) {
    console.error("[JOIN EXCEPTION]", error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Update Event
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { title, description, eventType, imageUrl, location, eventDate } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Event ID" });
    }

    const event = await db.collection("events").findOne({ _id: new ObjectId(id) });
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.userEmail !== req.user.email) {
      return res.status(403).json({ message: "Not authorized to update" });
    }

    const updatedData = {
      title, description, eventType, imageUrl, location,
      eventDate: new Date(eventDate),
    };

    await db.collection("events").updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );
    
    res.status(200).json({ message: "Event updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Delete Event
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Event ID" });
    }

    const event = await db.collection("events").findOne({ _id: new ObjectId(id) });
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.userEmail !== req.user.email) {
      return res.status(403).json({ message: "Not authorized to delete" });
    }

    await db.collection("events").deleteOne({ _id: new ObjectId(id) });
    res.status(200).json({ message: "Event deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;