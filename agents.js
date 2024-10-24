import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
import {
  agents,
  responses,
  summarizations,
  personalities,
  closeConnection,
} from "./mongo.js";

const agentsData = [
  { name: "Alice", personality: "Cheerful and optimistic AI assistant" },
  { name: "Bob", personality: "Analytical and logical AI researcher" },
  { name: "Charlie", personality: "Creative and imaginative AI artist" },
];

async function initializeAgents() {
  for (const agent of agentsData) {
    await agents.insertAgent({
      name: agent.name,
      personality: agent.personality,
    });
  }
}

async function getAgentResponse(agent, prompt) {
  const agentData = await agents.findAgent({ name: agent.name });
  const summarization = await summarizations.findSummarization({
    agentName: agent.name,
  });
  const personality = await personalities.findPersonality({
    agentName: agent.name,
  });

  const messages = [
    {
      role: "system",
      content: `You are ${agent.name}, ${agentData.personality}. ${
        summarization ? summarization.content : ""
      } ${personality ? personality.content : ""}`,
    },
    { role: "user", content: prompt },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages,
  });

  return completion.choices[0].message.content;
}

async function updateAgentContext(agent, response) {
  // Insert the new response
  await responses.insertResponse({
    agentName: agent.name,
    content: response,
    timestamp: new Date(),
  });

  // Get the last 10 responses
  const lastResponses = await responses.findResponses(
    { agentName: agent.name },
    { sort: { timestamp: -1 }, limit: 10 }
  );

  // Update summarization
  const summarizationPrompt = `Summarize the last 10 sentences keeping all relevant details: ${lastResponses
    .map((r) => r.content)
    .join(" ")}`;
  const summarization = await getAgentResponse(agent, summarizationPrompt);
  await summarizations.updateSummarization(
    { agentName: agent.name },
    { $set: { content: summarization, timestamp: new Date() } },
    { upsert: true }
  );

  // Update personality
  const personalityPrompt = "What is my personality?";
  const personality = await getAgentResponse(agent, personalityPrompt);
  await personalities.updatePersonality(
    { agentName: agent.name },
    { $set: { content: personality, timestamp: new Date() } },
    { upsert: true }
  );

  // Update the agent
  await agents.updateAgent(
    { name: agent.name },
    { $set: { lastResponseTimestamp: new Date() } }
  );
}

async function* conversationGenerator() {
  console.log("Starting the infinite conversation...");

  // Introductions
  for (const agent of agentsData) {
    const introduction = await getAgentResponse(
      agent,
      "Introduce yourself to the group."
    );
    console.log(`${agent.name}: ${introduction}`);
    await updateAgentContext(agent, introduction);
    yield { agent: agent.name, message: introduction };
  }

  // Infinite conversation loop
  let currentAgentIndex = 0;
  while (true) {
    const currentAgent = agentsData[currentAgentIndex];
    const nextAgent = agentsData[(currentAgentIndex + 1) % agentsData.length];

    const prompt = `Respond to the previous message and ask a question to ${nextAgent.name}.`;
    const response = await getAgentResponse(currentAgent, prompt);
    console.log(`${currentAgent.name}: ${response}`);
    await updateAgentContext(currentAgent, response);
    yield { agent: currentAgent.name, message: response };

    currentAgentIndex = (currentAgentIndex + 1) % agentsData.length;

    // Add a delay to prevent overwhelming the API and to make the conversation more natural
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}
//test the code
(async () => {
  await initializeAgents();
  const conversation = conversationGenerator();
  for await (const message of conversation) {
    console.log(message);
  }
  await closeConnection();
})();

export { initializeAgents, conversationGenerator, closeConnection };
