const express = require("express");
const { getDB } = require("../db");
const verifyToken = require("../middleware/verifyToken");

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

module.exports = router;