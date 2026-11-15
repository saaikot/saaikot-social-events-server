import "dotenv/config";
import express from "express";
import cors from "cors";
import eventRoutes from "./routes/events.js"; 

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.use("/api/events", eventRoutes);

app.get("/", (req, res) => res.send("Server is running perfectly! 🚀"));

export default app;

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server on port ${PORT}`));
}