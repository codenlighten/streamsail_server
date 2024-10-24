import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function connectDB() {
  if (!client.topology || !client.topology.isConnected()) {
    await client.connect();
  }
  return client.db();
}

async function performDbOperation(operation) {
  try {
    const db = await connectDB();
    return await operation(db);
  } catch (error) {
    console.error(`Error performing database operation: ${error.message}`);
    throw error;
  }
}

// Standardized database operations
const dbOperations = {
  // Standard operations for all collections
  insertOne: (collection, document) =>
    performDbOperation((db) => db.collection(collection).insertOne(document)),

  insertMany: (collection, documents) =>
    performDbOperation((db) => db.collection(collection).insertMany(documents)),

  findOne: (collection, query) =>
    performDbOperation((db) => db.collection(collection).findOne(query)),

  find: (collection, query = {}, options = {}) =>
    performDbOperation((db) =>
      db.collection(collection).find(query, options).toArray()
    ),

  updateOne: (collection, query, update, options = {}) =>
    performDbOperation((db) =>
      db.collection(collection).updateOne(query, update, options)
    ),

  deleteOne: (collection, query) =>
    performDbOperation((db) => db.collection(collection).deleteOne(query)),
};

// Collection-specific operations using standardized methods
const agents = {
  insertOne: (document) => dbOperations.insertOne("agents", document),
  findOne: (query) => dbOperations.findOne("agents", query),
  updateOne: (query, update, options) =>
    dbOperations.updateOne("agents", query, update, options),
  find: (query, options) => dbOperations.find("agents", query, options),
};

const responses = {
  insertOne: (document) => dbOperations.insertOne("responses", document),
  find: (query, options) => dbOperations.find("responses", query, options),
  findOne: (query) => dbOperations.findOne("responses", query),
  updateOne: (query, update, options) =>
    dbOperations.updateOne("responses", query, update, options),
};

const summarizations = {
  insertOne: (document) => dbOperations.insertOne("summarizations", document),
  findOne: (query) => dbOperations.findOne("summarizations", query),
  updateOne: (query, update, options) =>
    dbOperations.updateOne("summarizations", query, update, options),
  find: (query, options) => dbOperations.find("summarizations", query, options),
};

const personalities = {
  insertOne: (document) => dbOperations.insertOne("personalities", document),
  findOne: (query) => dbOperations.findOne("personalities", query),
  updateOne: (query, update, options) =>
    dbOperations.updateOne("personalities", query, update, options),
  find: (query, options) => dbOperations.find("personalities", query, options),
};

const members = {
  insertOne: (document) => dbOperations.insertOne("members", document),
  findOne: (query) => dbOperations.findOne("members", query),
  updateOne: (query, update, options) =>
    dbOperations.updateOne("members", query, update, options),
  find: (query, options) => dbOperations.find("members", query, options),
};

const messages = {
  insertOne: (document) => dbOperations.insertOne("messages", document),
  find: (query, options) => dbOperations.find("messages", query, options),
  findOne: (query) => dbOperations.findOne("messages", query),
  updateOne: (query, update, options) =>
    dbOperations.updateOne("messages", query, update, options),
};

const conversations = {
  insertOne: (document) => dbOperations.insertOne("conversations", document),
  findOne: (query) => dbOperations.findOne("conversations", query),
  updateOne: (query, update, options) =>
    dbOperations.updateOne("conversations", query, update, options),
  find: (query, options) => dbOperations.find("conversations", query, options),
};

const tweets = {
  insertOne: (document) => dbOperations.insertOne("tweets", document),
  find: (query, options) => dbOperations.find("tweets", query, options),
  insertMany: (documents) => dbOperations.insertMany("tweets", documents),
  findOne: (query) => dbOperations.findOne("tweets", query),
  updateOne: (query, update, options) =>
    dbOperations.updateOne("tweets", query, update, options),
};

const transactions = {
  insertOne: (document) => dbOperations.insertOne("transactions", document),
  find: (query, options) => dbOperations.find("transactions", query, options),
  findOne: (query) => dbOperations.findOne("transactions", query),
  updateOne: (query, update, options) =>
    dbOperations.updateOne("transactions", query, update, options),
};

const leaderboard = {
  insertOne: (document) => dbOperations.insertOne("leaderboard", document),
  findOne: (query) => dbOperations.findOne("leaderboard", query),
  updateOne: (query, update, options) =>
    dbOperations.updateOne("leaderboard", query, update, options),
  find: (query, options) => dbOperations.find("leaderboard", query, options),
};

const gamestate = {
  insertOne: (document) => dbOperations.insertOne("gamestate", document),
  findOne: (query) => dbOperations.findOne("gamestate", query),
  updateOne: (query, update, options) =>
    dbOperations.updateOne("gamestate", query, update, options),
  find: (query, options) => dbOperations.find("gamestate", query, options),
};

async function closeConnection() {
  await client.close();
}

export {
  agents,
  responses,
  summarizations,
  personalities,
  closeConnection,
  members,
  messages,
  conversations,
  tweets,
  transactions,
  leaderboard,
  gamestate,
};
