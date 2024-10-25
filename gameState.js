// server/gameState.js
import { members } from "./mongo.js";

export const persistGameState = async (gameState) => {
  try {
    // Store the current game state in MongoDB
    await members.updateOne(
      { type: "gameState" },
      { $set: { state: gameState } },
      { upsert: true }
    );
  } catch (error) {
    console.error("Failed to persist game state:", error);
  }
};

export const loadGameState = async () => {
  try {
    const savedState = await members.findOne({ type: "gameState" });
    return (
      savedState?.state || {
        mysterypull: { participants: [], leaderboard: {} },
        echospins: { participants: [], leaderboard: {} },
        echodrop: { participants: [], leaderboard: {} },
        emojiracer: { participants: [], leaderboard: {} },
        dumpsterdive: { participants: [], leaderboard: {} },
      }
    );
  } catch (error) {
    console.error("Failed to load game state:", error);
    return null;
  }
};
