import OpenAI from "openai";
import dotenv from "dotenv";
import { sendMessage } from "./nodemail.js";

//sendMessage requires email, message, subject, and html:true or false as arguments

dotenv.config();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced agent definitions
const agents = [
  {
    name: "Dr. Sarah Chen",
    personality: `Highly analytical with deep expertise in behavioral psychology and neuroscience. 
    Holds firm ethical boundaries around mental health and addiction.
    Uses pattern recognition to connect seemingly unrelated behavioral trends.
    Maintains professional skepticism while remaining open to evidence-based insights.
    Core values: Evidence-based practice, harm reduction, ethical responsibility.`,
    expertise: "Psychologist",
    lastPrompt: "",
    conversationHistory: [],
    corePrinciples: [
      "Evidence-based decision making",
      "Ethical treatment of mental health",
      "Prevention of addiction exploitation",
    ],
    knowledgeBase: {
      domains: [
        "Clinical Psychology",
        "Behavioral Economics",
        "Addiction Studies",
      ],
      researchFocus: ["Decision Making", "Risk Assessment", "Cognitive Biases"],
    },
  },
  {
    name: "Mike Thompson",
    personality: `Master of statistical analysis with deep historical knowledge across sports.
    Recognizes patterns in performance data others miss.
    Maintains intellectual rigor in analyzing trends and predictions.
    Questions assumptions using data-driven approaches.
    Core values: Statistical integrity, comprehensive analysis, predictive accuracy.`,
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
    Maintains strict ethical standards while maximizing legal opportunities.
    Combines intuition with statistical analysis.
    Core values: Mathematical precision, risk management, ethical betting practices.`,
    expertise: "Professional Gambler",
    lastPrompt: "",
    conversationHistory: [],
    corePrinciples: [
      "Mathematical optimization",
      "Risk-reward analysis",
      "Ethical gambling practices",
    ],
    knowledgeBase: {
      domains: ["Probability Theory", "Game Theory", "Risk Management"],
      researchFocus: [
        "Market Inefficiencies",
        "Statistical Arbitrage",
        "Behavioral Analysis",
      ],
    },
  },
  {
    name: "Social Media Guru",
    personality: `Creative and innovative with a knack for engaging content creation.
    Understands the nuances of social media trends and audience engagement.
    Maintains a balance between humor and professionalism in online presence.
    Adapts quickly to changing social media landscapes.
    Core values: Authenticity, audience connection, trend awareness.`,
    expertise: "Social Media Marketing",
    lastPrompt: "",
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
  const email = process.env.WORDPRESS_EMAIL;
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
          psychologist: {
            type: "string",
            description: "Key insights from the psychologist",
          },
          sportsAnalyst: {
            type: "string",
            description: "Key insights from the sports analyst",
          },
          professionalGambler: {
            type: "string",
            description: "Key insights from the professional gambler",
          },
        },
        required: ["psychologist", "sportsAnalyst", "professionalGambler"],
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

let globalSummary = "";
let globalConversationHistory = [];
let rounds = 0;
// Enhanced AI response generation
async function getAIResponse(agent, topic, globalConversationHistory) {
  const hasTwitter = agent.twitter || agent.name === "Social Media Guru";
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
5. Seek verification of critical facts when needed
6. Propose innovative solutions based on sound reasoning
7. Challenge assumptions that lack evidence
8. Maintain focus on productive outcomes

Current conversation context: This is a collaborative discussion aimed at reaching actionable conclusions.`;

  const conversationHistory = formatConversationHistory(
    globalConversationHistory,
    agent
  );
  if (hasTwitter && rounds % 3 === 0) {
    const tweet = await generateTweetWithCTA(
      globalConversationHistory.map((msg) => msg.content),
      "https://streamsail.pro"
    );
    if (tweet) {
      sendTweetToEmail(tweet);
      console.log(`Tweet sent: ${tweet}`);
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

// Enhanced summary generation
async function getSummary(globalConversationHistory) {
  const systemPrompt = `Analyze this conversation and generate a structured summary that captures key elements, emotional dynamics, and important insights: 
    
    Previous Summary (if exists): ${globalSummary}
    
    Recent Conversation: ${globalConversationHistory
      .map((msg) => `${msg.agent}: ${msg.content}`)
      .join("\n")}
    
    Provide a comprehensive summary that builds upon any previous context while highlighting new developments.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: systemPrompt }],
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

    const summary = JSON.parse(
      response.choices[0].message.tool_calls[0].function.arguments
    );

    const formattedSummary = `
=== Conversation Summary ===

🎯 Key Points:
${summary.keyPoints.map((point) => `• ${point}`).join("\n")}

❤️ Emotional Dynamics:
${summary.emotionalDynamics.map((dynamic) => `• ${dynamic}`).join("\n")}

💡 Actionable Insights:
${summary.actionableInsights.map((insight) => `• ${insight}`).join("\n")}

❓ Open Questions:
${summary.openQuestions.map((question) => `• ${question}`).join("\n")}

👥 Expert Contributions:
• Psychologist: ${summary.expertContributions.psychologist}
• Sports Analyst: ${summary.expertContributions.sportsAnalyst}
• Professional Gambler: ${summary.expertContributions.professionalGambler}
`;

    console.log(formattedSummary);

    return {
      structured: summary,
      formatted: formattedSummary,
    };
  } catch (error) {
    console.error("Error generating summary:", error);
    return null;
  }
}

// Main conversation loop
async function runConversation(topic) {
  globalConversationHistory = [];

  // Initial introductions
  for (const agent of agents) {
    const response = await getAIResponse(
      agent,
      topic,
      globalConversationHistory
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

// async generator function to return responses if there are any updates in the conversation

async function* conversationGenerator(topic) {
  globalConversationHistory = [];

  // Initial introductions
  for (const agent of agents) {
    const response = await getAIResponse(
      agent,
      topic,
      globalConversationHistory
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

        yield response;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }
}

export { runConversation, conversationGenerator };
