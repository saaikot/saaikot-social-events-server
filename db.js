import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

export const connectDB = async () => {
  if (db) return db;
  try {
    await client.connect();
    db = client.db("social-events");
    console.log("MongoDB Connected Successfully!");
    return db;
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    throw error;
  }
};

export const getDB = () => db;