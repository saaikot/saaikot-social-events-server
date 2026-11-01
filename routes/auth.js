const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { getDB } = require("../db");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Auth route is working!");
});

// ==========================================
// Register API
// ==========================================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, photoURL } = req.body;
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
      photoURL: photoURL || "",
      createdAt: new Date() 
    };
    
    const result = await db.collection("users").insertOne(newUser);
    
    const token = jwt.sign(
      { id: result.insertedId.toString(), email: newUser.email, name: newUser.name }, 
      process.env.JWT_SECRET,
      { expiresIn: "1d" } 
    );
    
    res.status(201).json({ 
      message: "User registered successfully", 
      token, 
      user: { id: result.insertedId, name: newUser.name, email: newUser.email, photoURL: newUser.photoURL }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// Login API
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDB();

    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found!" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password!" });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name }, 
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, photoURL: user.photoURL || "" }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// ✅ Google Login API (নতুন যোগ করা হলো)
// ==========================================
router.post("/google-login", async (req, res) => {
  try {
    const db = getDB();
    const { name, email, photoURL } = req.body;

    // ১. ইউজার আগে থেকেই আছে কি না চেক
    let user = await db.collection("users").findOne({ email });

    // ২. না থাকলে নতুন ইউজার তৈরি
    if (!user) {
      const newUser = {
        name,
        email,
        photoURL: photoURL || "https://i.ibb.co/5v9Z1g4/default-avatar.png",
        password: "google-auth-user", // গুগল ইউজারদের পাসওয়ার্ড লাগবে না
        createdAt: new Date(),
      };
      const result = await db.collection("users").insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    // ৩. JWT টোকেন তৈরি
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Google login successful",
      user: { id: user._id, name: user.name, email: user.email, photoURL: user.photoURL },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ==========================================
// Protected Route Test
// ==========================================
router.get("/me", verifyToken, (req, res) => {
  res.json({ 
    message: "This is a protected route.", 
    user: req.user 
  });
});

// ==========================================
// Update Profile API
// ==========================================
router.put("/update-profile", verifyToken, async (req, res) => {
  try {
    const { name, photoURL } = req.body;
    const db = getDB();
    const usersCollection = db.collection("users");

    if (!name && !photoURL) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const updatedData = {};
    if (name) updatedData.name = name;
    if (photoURL) updatedData.photoURL = photoURL;

    // ObjectId ব্যবহার করে আপডেট
    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.user.id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const newToken = jwt.sign(
      { id: req.user.id, email: req.user.email, name: name || req.user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Profile updated successfully",
      token: newToken,
      user: { id: req.user.id, email: req.user.email, name: name || req.user.name, photoURL }
    });
  } catch (error) {
    res.status(500).json({ message: error.message }); 
  }
});

module.exports = router;