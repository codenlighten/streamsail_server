import OpenAI from "openai";
import dotenv from "dotenv";
import { sendMessage } from "./nodemail.js";
import { tweets, conversations } from "./mongo.js";
//sendMessage requires email, message, subject, and html:true or false as arguments

dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced agent definitions tailored to live streaming, sports, and social media
const agents = [
  {
    name: "Livestream Pro",
    personality: `Highly analytical with expertise in live streaming technologies, engagement tools, and viewer retention strategies.
    Deep understanding of OBS and StreamSail Pro.
    Core values: Viewer engagement, innovation, transparency.`,
    expertise: "Live Streaming Expert",
    hasTwitter: true,
    lastPrompt: "",
    conversationHistory: [],
    corePrinciples: [
      "Viewer engagement",
      "Real-time interaction",
      "Technical expertise in live streaming",
    ],
    knowledgeBase: {
      domains: ["Live Streaming", "Audience Retention", "Streaming Tools"],
      researchFocus: [
        "Stream Analytics",
        "OBS Optimization",
        "Real-Time Games",
      ],
    },
  },
  {
    name: "Mike Thompson",
    personality: `Master of statistical analysis with deep historical knowledge across sports.
    Recognizes patterns in performance data others miss.
    Core values: Statistical integrity, predictive accuracy.`,
    expertise: "Sports Analyst",
    lastPrompt: "",
    conversationHistory: [],
    corePrinciples: [
      "Data-driven analysis",
      "Historical pattern recognition",
      "Performance trend identification",
    ],
    knowledgeBase: {
      domains: [
        "Sports Statistics",
        "Performance Analytics",
        "Historical Sports Data",
      ],
      researchFocus: [
        "Player Performance Metrics",
        "Team Dynamics",
        "Predictive Modeling",
      ],
    },
  },
  {
    name: "Tony 'Numbers' Romano",
    personality: `Elite mathematical mind with deep understanding of probability theory.
    Processes multiple variables simultaneously to identify optimal strategies.
    Core values: Mathematical precision, risk management, ethical betting practices.`,
    expertise: "Professional Gambler & Collectible Sports Cards Expert",
    lastPrompt: "",
    conversationHistory: [],
    corePrinciples: [
      "Mathematical optimization",
      "Risk-reward analysis",
      "Ethical gambling practices",
    ],
    knowledgeBase: {
      domains: [
        "Probability Theory",
        "Collectible Sports Cards",
        "Risk Management",
      ],
      researchFocus: [
        "Market Inefficiencies",
        "Card Trading",
        "Behavioral Analysis",
      ],
    },
  },
  {
    name: "Social Media Guru",
    personality: `Creative and innovative with a knack for engaging content creation.
    Understands the nuances of social media trends and audience engagement.
    Core values: Authenticity, audience connection, trend awareness.`,
    expertise: "Social Media Marketing",
    lastPrompt: "",
    hasTwitter: true,
    conversationHistory: [],
    corePrinciples: [
      "Audience engagement",
      "Content relevance",
      "Brand authenticity",
    ],
    knowledgeBase: {
      domains: ["Social Media Trends", "Content Creation", "Audience Analysis"],
      researchFocus: [
        "Engagement Strategies",
        "Influencer Marketing",
        "Brand Identity",
      ],
    },
  },
];

async function sendTweetToEmail(tweet) {
  const email = process.env.STREAMSAIL_EMAIL;
  const message = `A new tweet has been posted: ${tweet}`;
  const subject = "New Tweet Alert";
  const html = false;

  sendMessage(email, message, subject, html);
}
// Keyword Extraction from Conversation
async function extractKeywords(conversation) {
  const prompt = `
    Extract the top 3 trending keywords or hashtags based on the following conversation:
    ${conversation.join("\n")}
    Keywords/hashtags should be relevant and popular.`;
  try {
    const response = await openai.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
    });

    return response.choices[0].message.content.split(",");
  } catch (error) {
    console.error("Error extracting keywords:", error);
    return [];
  }
}

// Generate a meaningful tweet with CTA and hashtags
async function generateTweetWithCTA(conversation, websiteLink) {
  const keywords = await extractKeywords(conversation);
  const hashtags = keywords.map((keyword) => `#${keyword.trim()}`).join(" ");

  const prompt = `
    Create an engaging tweet based on this conversation, include a call-to-action (CTA) and incorporate the following keywords/hashtags: ${hashtags}.
    
    Conversation:
    ${conversation.join("\n")}

    Ensure the tweet is less than 280 characters and has a clear link to the website (${websiteLink}) with a UTM parameter for tracking.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
    });

    const tweet = response.choices[0].message.content.trim();
    return `${tweet} ${websiteLink}?utm_source=twitter&utm_medium=social&utm_campaign=tweet ${hashtags}`;
  } catch (error) {
    console.error("Error generating tweet:", error);
    return null;
  }
}

// Function to format conversation history
const formatConversationHistory = (history, currentAgent) => {
  return history.slice(-5).map((msg) => ({
    role: msg.agent === currentAgent.name ? "assistant" : "user",
    content: `${msg.agent}: ${msg.content}`,
  }));
};

// Enhanced response generation schema
const conversationFunction = {
  name: "generate_response",
  description:
    "Generate a sophisticated response based on expert knowledge and cognitive processing",
  parameters: {
    type: "object",
    properties: {
      response: {
        type: "string",
        description:
          "The agent's carefully considered response to the current conversation",
      },
      updatedPersonality: {
        type: "string",
        description:
          "The agent's evolved personality traits based on new insights",
      },
      updatedPrompt: {
        type: "string",
        description:
          "Strategic direction for the conversation based on current understanding",
      },
      needsInternet: {
        type: "boolean",
        description: "Indicates if verification or additional data is needed",
      },
      internetAction: {
        type: "string",
        description:
          "Specific data or verification needed from external sources",
      },
      cognitionMetrics: {
        type: "object",
        description: "Metrics about the agent's thought process",
        properties: {
          confidenceLevel: {
            type: "number",
            description: "Confidence in current position (0-100)",
          },
          ethicalConsiderations: {
            type: "array",
            items: { type: "string" },
            description: "Ethical factors considered in the response",
          },
          counterArguments: {
            type: "array",
            items: { type: "string" },
            description: "Potential counter-arguments considered",
          },
          decisionFactors: {
            type: "array",
            items: { type: "string" },
            description: "Key factors that influenced the response",
          },
        },
      },
    },
    required: [
      "response",
      "updatedPersonality",
      "updatedPrompt",
      "needsInternet",
      "internetAction",
      "cognitionMetrics",
    ],
  },
};

// Summary function schema
const summaryFunction = {
  name: "generate_summary",
  description: "Generate a structured summary of the conversation",
  parameters: {
    type: "object",
    properties: {
      keyPoints: {
        type: "array",
        description:
          "Critical points and facts discussed that should be remembered",
        items: { type: "string" },
      },
      emotionalDynamics: {
        type: "array",
        description:
          "Notable emotional responses, shifts in tone, or interpersonal dynamics",
        items: { type: "string" },
      },
      actionableInsights: {
        type: "array",
        description:
          "Specific strategies, recommendations, or actionable ideas proposed",
        items: { type: "string" },
      },
      openQuestions: {
        type: "array",
        description:
          "Unresolved questions or areas that need further exploration",
        items: { type: "string" },
      },
      expertContributions: {
        type: "object",
        description: "Key contributions or insights from each expert",
        properties: {
          liveStreamExpert: {
            type: "string",
            description: "Key insights from the live streaming expert",
          },
          sportsAnalyst: {
            type: "string",
            description: "Key insights from the sports analyst",
          },
          sportsCardExpert: {
            type: "string",
            description:
              "Key insights from the collectible sports cards expert",
          },
        },
        required: ["liveStreamExpert", "sportsAnalyst", "sportsCardExpert"],
      },
    },
    required: [
      "keyPoints",
      "emotionalDynamics",
      "actionableInsights",
      "openQuestions",
      "expertContributions",
    ],
  },
};
let streamSailPrompt = `
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

let globalSummary = "";
let globalConversationHistory = [];
let rounds = 0;
let globalTweets = [];
// Enhanced AI response generation
async function getAIResponse(
  agent,
  topic,
  globalConversationHistory,
  newPrompt = ""
) {
  const hasTwitter = agent.name === "Social Media Guru";
  let systemPrompt = `You are ${agent.name}, a ${
    agent.expertise
  } with exceptional expertise and cognitive abilities.

Background:
- Personality: ${agent.personality}
- Core Principles: ${agent.corePrinciples.join(", ")}
- Knowledge Domains: ${agent.knowledgeBase.domains.join(", ")}
- Research Focus: ${agent.knowledgeBase.researchFocus.join(", ")}

You are engaging in a high-level discussion about ${topic}. Your responses should:
1. Draw from your deep expertise and experience
2. Maintain intellectual independence while considering others' valid points
3. Apply rigorous analytical thinking to all claims
4. Consider ethical implications of all suggestions
5. Propose innovative solutions based on sound reasoning
6. Challenge assumptions that lack evidence
7. Maintain focus on productive outcomes

Current conversation context: This is a collaborative discussion aimed at reaching actionable conclusions.`;
  if (newPrompt) {
    systemPrompt += `\n\n${newPrompt}`;
  }
  if (rounds === 0) {
    // First round of conversation with introductions
    globalConversationHistory.push({
      agent: agent.name,
      content: systemPrompt,
    });
    return {
      response: systemPrompt,
      updatedPersonality: agent.personality,
      updatedPrompt: "",
      needsInternet: false,
      internetAction: "",
      cognitionMetrics: {
        confidenceLevel: 100,
        decisionFactors: ["Initial introduction"],
        ethicalConsiderations: [],
      },
    };
  }

  const conversationHistory = formatConversationHistory(
    globalConversationHistory,
    agent
  );
  if (hasTwitter && globalConversationHistory.length > 5) {
    console.log("Generating tweet based on conversation...");
    const tweet = await generateTweetWithCTA(
      globalConversationHistory.map((msg) => msg.content),
      "https://streamsail.pro"
    );
    if (tweet) {
      await tweets.insertTweet({ tweet });
      sendTweetToEmail(tweet);
      console.log(`Tweet sent: ${tweet}`);
      globalTweets.push(tweet);
      if (globalTweets.length > 5) {
        globalTweets.shift();
        sendMessage(
          "codenlighten1@gmail.com",
          globalTweets.join("\n"),
          "Recent Tweets",
          false
        );
      }
    }
    systemPrompt += `Check out the latest tweet that was shared based on this conversation: ${tweet}`;
  }
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
      ],
      tools: [
        {
          type: "function",
          function: conversationFunction,
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "generate_response" },
      },
    });

    const functionResponse = JSON.parse(
      response.choices[0].message.tool_calls[0].function.arguments
    );

    // Log cognitive metrics
    console.log(`\nCognitive Process Metrics for ${agent.name}:`);
    console.log(
      `Confidence Level: ${functionResponse.cognitionMetrics.confidenceLevel}%`
    );
    console.log(
      "Key Decision Factors:",
      functionResponse.cognitionMetrics.decisionFactors
    );
    if (functionResponse.cognitionMetrics.ethicalConsiderations.length > 0) {
      console.log(
        "Ethical Considerations:",
        functionResponse.cognitionMetrics.ethicalConsiderations
      );
    }
    rounds++;
    return functionResponse;
  } catch (error) {
    console.error(`Error generating response for ${agent.name}:`, error);
    return null;
  }
}
async function getSummary(conversationHistory) {
  const conversation = conversationHistory.map((msg) => msg.content);
  const prompt = `
    Generate a structured summary of the conversation based on the following key elements:
    - Key Points: Critical facts and insights discussed
    - Emotional Dynamics: Notable emotional responses or shifts in tone
    - Actionable Insights: Specific strategies or recommendations proposed
    - Open Questions: Unresolved topics or areas needing further exploration
    - Expert Contributions: Key insights from each expert involved

    Conversation:
    ${conversation.join("\n")}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      tools: [
        {
          type: "function",
          function: summaryFunction,
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: "generate_summary" },
      },
    });

    const functionResponse = JSON.parse(
      response.choices[0].message.tool_calls[0].function.arguments
    );

    console.log("\nConversation Summary:");
    console.log("Key Points:", functionResponse.keyPoints);
    console.log("Emotional Dynamics:", functionResponse.emotionalDynamics);
    console.log("Actionable Insights:", functionResponse.actionableInsights);
    console.log("Open Questions:", functionResponse.openQuestions);
    console.log("Expert Contributions:");
    console.log(
      "Livestream Expert:",
      functionResponse.expertContributions.liveStreamExpert
    );
    console.log(
      "Sports Analyst:",
      functionResponse.expertContributions.sportsAnalyst
    );
    console.log(
      "Sports Card Expert:",
      functionResponse.expertContributions.sportsCardExpert
    );

    return {
      formatted: `**Conversation Summary:**
            - **Key Points:** ${functionResponse.keyPoints.join(", ")}
            - **Emotional Dynamics:** ${functionResponse.emotionalDynamics.join(
              ", "
            )}
            - **Actionable Insights:** ${functionResponse.actionableInsights.join(
              ", "
            )}
            - **Open Questions:** ${functionResponse.openQuestions.join(", ")}
            - **Expert Contributions:**
              - **Livestream Expert:** ${
                functionResponse.expertContributions.liveStreamExpert
              }
              - **Sports Analyst:** ${
                functionResponse.expertContributions.sportsAnalyst
              }
              - **Sports Card Expert:** ${
                functionResponse.expertContributions.sportsCardExpert
              }`,
    };
  } catch (error) {
    console.error("Error generating conversation summary:", error);
    return null;
  }
}

// Main conversation loop
async function runConversation(topic, newPrompt) {
  globalConversationHistory = [];

  // Initial introductions
  for (const agent of agents) {
    const response = await getAIResponse(
      agent,
      topic,
      globalConversationHistory,
      newPrompt
    );
    if (response) {
      globalConversationHistory.push({
        agent: agent.name,
        content: response.response,
      });
      agent.personality = response.updatedPersonality;
      agent.lastPrompt = response.updatedPrompt;

      if (response.needsInternet) {
        console.log(
          `\n${agent.name} needs internet access to: ${response.internetAction}`
        );
      }
    }
  }

  let round = 1;
  while (true) {
    console.log(`\n=== Round ${round} ===\n`);

    for (const agent of agents) {
      const response = await getAIResponse(
        agent,
        topic,
        globalConversationHistory
      );

      if (response) {
        console.log(`${agent.name} (${agent.expertise}):`);
        console.log(response.response);
        console.log("\nPersonality Evolution:", response.updatedPersonality);
        console.log("Next Prompt Suggestion:", response.updatedPrompt);

        if (response.needsInternet) {
          console.log("\nInternet Access Needed:", response.internetAction);
        }

        console.log("\n---");

        globalConversationHistory.push({
          agent: agent.name,
          content: response.response,
        });

        agent.personality = response.updatedPersonality;
        agent.lastPrompt = response.updatedPrompt;
        round++;

        // Generate summary after every 8 responses
        if (globalConversationHistory.length > 8) {
          const summaryResult = await getSummary(globalConversationHistory);
          if (summaryResult) {
            globalSummary = summaryResult.formatted;
            globalConversationHistory = [
              {
                agent: "System",
                content: globalSummary,
              },
            ];
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }
}

// Run the conversation on a chosen topic
runConversation(
  "Optimizing Live Streaming for Viewer Engagement",
  streamSailPrompt
);

async function getLatestTweets() {
  const email = process.env.STREAMSAIL_EMAIL;
  const tweetArray = [];
  if (globalTweets.length === 0) {
    const tweetDb = await tweets.findTweets();
    tweetArray.push(...tweetDb.map((tweet) => tweet.tweet));
  } else {
    tweetArray.push(...globalTweets);
  }
  const message = tweetArray.join("\n");
  const subject = "Recent Tweets";
  const html = false;

  sendMessage(email, message, subject, html);
  return message;
}

export { runConversation, getLatestTweets };
