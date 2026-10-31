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

module.exports = router;