//dotenv.config();
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();
const url = process.env.MONGO_URI;
const dbName = "streamsail";

// Store the database connection
let _db;

export const mongoConnect = async () => {
  if (_db) {
    // Return the existing connection if already established
    return _db;
  }
  try {
    const client = await MongoClient.connect(url);
    _db = client.db(dbName);
    console.log("Database connection established");
    return _db;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
};

export const connectCollection = async (collection) => {
  const db = await mongoConnect();
  const collect = db.collection(collection);
  // console.log(`Connected to collection: ${collection}`);
  return collect;
};
