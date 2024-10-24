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

const agents = {
  insertAgent: (agent) =>
    performDbOperation((db) => db.collection("agents").insertOne(agent)),
  findAgent: (query) =>
    performDbOperation((db) => db.collection("agents").findOne(query)),
  updateAgent: (query, update) =>
    performDbOperation((db) =>
      db.collection("agents").updateOne(query, update)
    ),
};

const responses = {
  insertResponse: (response) =>
    performDbOperation((db) => db.collection("responses").insertOne(response)),
  findResponses: (query, options) =>
    performDbOperation((db) =>
      db.collection("responses").find(query, options).toArray()
    ),
};

const summarizations = {
  updateSummarization: (query, update, options) =>
    performDbOperation((db) =>
      db.collection("summarizations").updateOne(query, update, options)
    ),
  findSummarization: (query) =>
    performDbOperation((db) => db.collection("summarizations").findOne(query)),
};

const personalities = {
  updatePersonality: (query, update, options) =>
    performDbOperation((db) =>
      db.collection("personalities").updateOne(query, update, options)
    ),
  findPersonality: (query) =>
    performDbOperation((db) => db.collection("personalities").findOne(query)),
};

const members = {
  insertMember: (member) =>
    performDbOperation((db) => db.collection("members").insertOne(member)),
  findMember: (query) =>
    performDbOperation((db) => db.collection("members").findOne(query)),
  updateMember: (query, update) =>
    performDbOperation((db) =>
      db.collection("members").updateOne(query, update)
    ),
};

const messages = {
  insertMessage: (message) =>
    performDbOperation((db) => db.collection("messages").insertOne(message)),
  findMessages: (query, options) =>
    performDbOperation((db) =>
      db.collection("messages").find(query, options).toArray()
    ),
};

const conversations = {
  insertConversation: (conversation) =>
    performDbOperation((db) =>
      db.collection("conversations").insertOne(conversation)
    ),
  findConversation: (query) =>
    performDbOperation((db) => db.collection("conversations").findOne(query)),
  updateConversation: (query, update) =>
    performDbOperation((db) =>
      db.collection("conversations").updateOne(query, update)
    ),
};

const tweets = {
  insertTweet: (tweet) =>
    performDbOperation((db) => db.collection("tweets").insertOne(tweet)),
  findTweets: (query, options) =>
    performDbOperation((db) =>
      db.collection("tweets").find(query, options).toArray()
    ),
};

const transactions = {
  insertTransaction: (transaction) =>
    performDbOperation((db) =>
      db.collection("transactions").insertOne(transaction)
    ),
  findTransactions: (query, options) =>
    performDbOperation((db) =>
      db.collection("transactions").find(query, options).toArray()
    ),
};

async function closeConnection() {
  await client.close();
}

const leaderboard = {
  updateLeaderboard: (query, update, options) =>
    performDbOperation((db) =>
      db.collection("leaderboard").updateOne(query, update, options)
    ),
  findLeaderboard: (query) =>
    performDbOperation((db) => db.collection("leaderboard").findOne(query)),
};

const gamestate = {
  updateGameState: (query, update, options) =>
    performDbOperation((db) =>
      db.collection("gamestate").updateOne(query, update, options)
    ),
  findGameState: (query) =>
    performDbOperation((db) => db.collection("gamestate").findOne(query)),
};

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
