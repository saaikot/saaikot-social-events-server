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

    // ১. ডাটা ভ্যালিডেশন (সব ফিল্ড আছে কি না)
    if (!title || !description || !eventType || !location || !eventDate) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // ২. তারিখ চেক করা (অতীতের তারিখ দেওয়া যাবে না)
    const today = new Date();
    const selectedDate = new Date(eventDate);
    if (selectedDate < today) {
      return res.status(400).json({ message: "Event date must be in the future!" });
    }

    // ৩. নতুন ইভেন্ট তৈরি করা (ইউজারের ইমেইল ও নাম সেভ করা হচ্ছে)
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
      event: newEvent
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1. Get all Upcoming Events (Public Route)

router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const today = new Date();

    // শুধু আজকের বা ভবিষ্যতের ইভেন্টগুলো খোঁজা (অতীতের ইভেন্ট বাদ যাবে)
    const events = await db.collection("events")
      .find({ eventDate: { $gte: today } })
      .sort({ eventDate: 1 }) 
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
    
    // শুধু লগইন করা ইউজারের ইমেইল দিয়ে ইভেন্ট খোঁজা
    const events = await db.collection("events")
      .find({ userEmail: req.user.email })
      .sort({ createdAt: -1 }) 
      .toArray();

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;

    // আইডি ভ্যালিড কি না চেক করা
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

    // চেক করা: ইউজার আগেই জয়েন করেছে কি না
    if (event.joinedUsers && event.joinedUsers.includes(userEmail)) {
      return res.status(400).json({ message: "You have already joined this event!" });
    }

    // ইভেন্টের joinedUsers অ্যারেতে ইউজারের ইমেইল পুশ করা
    await db.collection("events").updateOne(
      { _id: new ObjectId(id) },
      { $push: { joinedUsers: userEmail } }
    );

    res.status(200).json({ message: "Successfully joined the event!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const { id } = req.params;
    const { title, description, eventType, imageUrl, location, eventDate } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Event ID" });
    }

    // ১. ইভেন্টটা খুঁজে বের করা
    const event = await db.collection("events").findOne({ _id: new ObjectId(id) });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // ২. চেক করা: এই ইউজারই ইভেন্টটা বানিয়েছে কি না
    if (event.userEmail !== req.user.email) {
      return res.status(403).json({ message: "Forbidden: You can only update your own events" });
    }

    // ৩. ভ্যালিডেশন (যদি নতুন তারিখ দেওয়া হয়, সেটা ভবিষ্যতের হতে হবে)
    if (eventDate) {
      const selectedDate = new Date(eventDate);
      if (selectedDate < new Date()) {
        return res.status(400).json({ message: "Event date must be in the future!" });
      }
    }

    // ৪. আপডেট করা
    const updatedEvent = {
      ...(title && { title }),
      ...(description && { description }),
      ...(eventType && { eventType }),
      ...(imageUrl && { imageUrl }),
      ...(location && { location }),
      ...(eventDate && { eventDate: new Date(eventDate) }),
    };

    await db.collection("events").updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedEvent }
    );

    res.status(200).json({ message: "Event updated successfully", updatedEvent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


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

    // চেক করা: এই ইউজারই ইভেন্টটা বানিয়েছে কি না
    if (event.userEmail !== req.user.email) {
      return res.status(403).json({ message: "Forbidden: You can only delete your own events" });
    }

    await db.collection("events").deleteOne({ _id: new ObjectId(id) });

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;