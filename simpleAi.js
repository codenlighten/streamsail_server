// streamSailManager.js
import OpenAI from "openai";
import dotenv from "dotenv";
import { sendMessage } from "./nodemail.js";
import { tweets, conversations } from "./mongo.js";

dotenv.config();

// Constants
const OPENAI_MODEL = "gpt-4o-mini";
const WEBSITE_URL = "https://streamsail.pro";

const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Utility function for handling AI requests
const chatWithOpenAi = async (systemMessage, userMessage) => {
  const messages = [
    { role: "system", content: systemMessage },
    { role: "user", content: userMessage },
  ];
  const response = await openai.chat({ messages, model: OPENAI_MODEL });
  return response.data.choices[0].message.content;
};

// Simple AI helper function
const simple = (message) =>
  chatWithOpenAi(
    "Hello! I'm a simple AI assistant. How can I help you today?",
    message
  );

// StreamSail conversation prompt
const streamSailPrompt = `
You are about to engage in a high-level discussion focused on **StreamSail Pro**, a platform designed to enhance live streaming experiences by integrating interactive games, viewer engagement tools, and real-time analytics. The goal of this conversation is to explore how **StreamSail Pro** can be optimized to drive sales, boost engagement, and offer a seamless live streaming experience, especially in areas like collectible sports cards and sports analytics.

### Context:
- **StreamSail Pro** is a suite of tools for live streamers that integrates customizable overlays, interactive games like **Emoji Race** and **Sports Showdown**, and automated host features. It is tailored for creators looking to turn passive viewers into active participants.
- **Live Streaming Tools**: StreamSail includes engagement tools like real-time leaderboards, countdown timers, and games that keep viewers active throughout the stream. These features help streamers boost viewer retention and engagement during broadcasts.
- **Collectible Sports Cards**: Many streamers in the collectible cards space use StreamSail’s tools to enhance live card breaks, auctions, and giveaways. Games like **Plinko** and **Randomizer Wheel** are used to incentivize viewer participation.
- **Sports Analytics**: By providing predictive modeling and sports statistics, StreamSail enables streamers to create data-driven commentary and insights during live sports events, increasing viewer trust and involvement.
- **Social Media Integration**: StreamSail seamlessly integrates with platforms like Twitter and Instagram, allowing streamers to engage viewers across social channels, increasing reach and viewer retention.

### The Goal:
The conversation should focus on how **StreamSail Pro** can be further improved to drive sales and increase viewer loyalty by leveraging real-time interactive features and social media strategies. Each agent will contribute based on their expertise:

1. **Livestream Expert**: Will focus on the technical aspects of StreamSail Pro, discussing optimizations for live stream performance, engagement tools, and integration with platforms like OBS.
2. **Sports Analyst**: Will explore how data from sports analytics can enhance live streams, making them more interactive and informative, and will discuss the importance of accurate sports data in increasing viewer retention.
3. **Sports Card Expert**: Will focus on how games and giveaways during collectible card streams can drive sales and engagement, analyzing best practices for turning viewers into buyers through interactive card breaks and auctions.
4. **Social Media Guru**: Will provide insights into how StreamSail’s social media integration can be optimized to increase brand visibility, engage followers, and drive traffic to live streams. This agent will also discuss the importance of crafting engaging tweets, Instagram posts, and content for other platforms.

### The Focus:
- **Increasing Sales**: How can StreamSail's tools, such as interactive games and real-time analytics, be used to increase sales during live streams?
- **Maximizing Viewer Engagement**: How can we further improve viewer interaction during live events, such as integrating more immersive games or automating engagement features?
- **Leveraging Sports Analytics**: How can sports data and predictive modeling be better integrated into live sports streams to keep viewers engaged?
- **Optimizing Social Media**: How can StreamSail's integration with social media platforms like Twitter and Instagram be optimized to increase traffic to live streams and boost overall viewer engagement?

You are expected to collaborate and provide high-level insights into how StreamSail Pro can evolve to meet these goals. Use your deep knowledge in your respective fields to propose innovative solutions, challenge assumptions, and focus on driving meaningful improvements for the platform.
`;

// Specialized AI functions
const query = (question) => chatWithOpenAi(streamSailPrompt, question);

const tweet = (tweet) =>
  chatWithOpenAi(
    "You are about to write a tweet about StreamSail Pro. The goal is to craft a tweet that engages the audience, drives traffic to the platform, and showcases the unique features of StreamSail Pro.",
    `Write a tweet about StreamSail Pro: ${tweet}`
  );

const email = (email) =>
  chatWithOpenAi(
    "You are about to write an email about StreamSail Pro. The goal is to craft an email that engages the recipient, drives traffic to the platform, and showcases the unique features of StreamSail Pro.",
    `Write an email about StreamSail Pro: ${email}`
  );

const answer = (conversation) =>
  chatWithOpenAi(
    "You are about to engage in a conversation about StreamSail Pro. The goal is to have a high-level discussion focused on how StreamSail Pro can be optimized to drive sales, boost engagement, and offer a seamless live streaming experience.",
    `Engage in a conversation about StreamSail Pro: ${conversation}`
  );

// Command handling for AI interactions
const handleAi = async (message) => {
  const [command, ...args] = message.split(" ");
  const userMessage = args.join(" ");
  switch (command.toLowerCase()) {
    case "streamsailquery":
      return query(userMessage);
    case "tweet":
      return tweet(userMessage);
    case "email":
      return email(userMessage);
    case "conversation":
      return answer(userMessage);
    case "simpleai":
      return simple(userMessage);
    default:
      return "I'm sorry, I don't understand that command.";
  }
};

export { handleAi };
