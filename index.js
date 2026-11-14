require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./db");
const eventRoutes = require("./routes/events");

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// Routes
app.use("/api/events", eventRoutes);

app.get("/", (req, res) => res.send("Server is running"));

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server on port ${PORT}`));
});