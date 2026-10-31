const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); 
const { getDB } = require("../db");
const router = express.Router();

router.get("/", (req, res) => {
  res.send("Auth route is working!");
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const db = getDB();

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists!" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = { 
      name, 
      email, 
      password: hashedPassword,
      createdAt: new Date() 
    };
    
    const result = await db.collection("users").insertOne(newUser);
    
 
    const token = jwt.sign(
      { id: result.insertedId, email: newUser.email, name: newUser.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" } 
    );
    
    res.status(201).json({ 
      message: "User registered successfully", 
      token, 
      insertedId: result.insertedId 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Login API endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDB();

    // ১. ইউজার ডাটাবেসে আছে কি না চেক করা
    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found!" });
    }

    // ২. পাসওয়ার্ড ম্যাচ করা (ইউজারের দেওয়া পাসওয়ারড এবং ডাটাবেসের হ্যাশ করা পাসওয়ার্ড)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password!" });
    }

    // ৩. নতুন টোকেন তৈরি করা
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;