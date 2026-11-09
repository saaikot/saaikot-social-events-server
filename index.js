require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db");
const eventRoutes = require("./routes/events"); 
// ❌ authRoutes বাদ দেওয়া হলো, কারণ BetterAuth এখন Next.js-এ হ্যান্ডেল করবে

const app = express();

// Middleware
app.use(cors({ 
  origin: process.env.CLIENT_URL, 
  credentials: true // BetterAuth-এর কুকি/টোকেন পাঠানোর জন্য এটি জরুরি
}));
app.use(express.json());

// Routes
app.use("/api/events", eventRoutes); 

app.get("/", (req, res) => {
  res.send("Social Events Server is Running! 🚀");
});

// Start Server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});