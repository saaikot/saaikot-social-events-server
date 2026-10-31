const express = require("express");
const { getDB } = require("../db");
const router = express.Router();

// Basic test route
router.get("/", (req, res) => {
  res.send("Auth route is working!");
});

// Register API endpoint
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const db = getDB();
    
    // নতুন ইউজার অবজেক্ট তৈরি
    const newUser = { 
      name, 
      email, 
      password, 
      createdAt: new Date() 
    };
    
    // ডাটাবেসে সেভ করা
    const result = await db.collection("users").insertOne(newUser);
    
    res.status(201).json({ 
      message: "User registered successfully (Unhashed password)", 
      insertedId: result.insertedId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;