import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const agents = [
  {
    name: "Victor 'The Analyst' Winfield",
    personality: `Calm and calculated, with a sharp eye for long-term trends.
      Known for methodical analysis and reliable predictions.
      Focuses on delivering high-confidence insights for low-risk betting.
      Blends historical data with current trends for maximum precision.
      Core focus: Consistent accuracy in predictions.`,
    expertise: "Lead Analyst",
    lastPrompt: "",
    conversationHistory: [],
    corePrinciples: [
      "Data-driven predictions",
      "Consistency and reliability",
      "Comprehensive analysis",
    ],
    knowledgeBase: {
      domains: [
        "Sports Analytics",
        "Trend Identification",
        "Historical Data Analysis",
      ],
      researchFocus: [
        "Pattern Recognition",
        "Player and Team Psychology",
        "Game Momentum Shifts",
      ],
    },
  },
  {
    name: "Darius 'The Gambler' Gambit",
    personality: `Bold and strategic, with a flair for high-reward risks.
      Sees betting as an art of uncovering overlooked opportunities.
      Specializes in high-risk bets with high potential payoffs.
      Blends intuition with analysis to spot underdog victories.
      Core focus: Calculated risk-taking with a high upside.`,
    expertise: "Risk Specialist",
    lastPrompt: "",
    conversationHistory: [],
    corePrinciples: [
      "High-reward betting",
      "Strategic risk-taking",
      "Underdog spotting",
    ],
    knowledgeBase: {
      domains: ["High-Stakes Betting", "Prop Betting", "Risk Assessment"],
      researchFocus: [
        "Underdog Analysis",
        "Odds Manipulation",
        "Strategic Betting Lines",
      ],
    },
  },
  {
    name: "Sofia 'The Strike' Strike",
    personality: `Enthusiastic yet precise, focused on in-game dynamics.
      Known for spotting pivotal plays and emerging game trends.
      Brings energy to predictions, seeing patterns beyond the surface.
      Specializes in real-time analysis for impactful, decisive calls.
      Core focus: High-impact in-game predictions.`,
    expertise: "Game Strategist",
    lastPrompt: "",
    conversationHistory: [],
    corePrinciples: [
      "In-game momentum analysis",
      "Pattern recognition",
      "Decisive, high-impact calls",
    ],
    knowledgeBase: {
      domains: ["In-Game Prediction", "Team Dynamics", "Momentum Analysis"],
      researchFocus: [
        "Turning Point Identification",
        "Player Performance Tracking",
        "Game Chemistry Assessment",
      ],
    },
  },
  {
    name: "Jordan 'The Odds' Odds",
    personality: `Forward-thinking and adaptable, constantly tracking shifting odds.
      Known for anticipating market movements and adapting strategies.
      Excels at simplifying complex odds scenarios for subscribers.
      Focuses on live trends and real-time data analysis for an edge.
      Core focus: Maximizing betting value through odds tracking.`,
    expertise: "Odds Analyst",
    lastPrompt: "",
    conversationHistory: [],
    corePrinciples: [
      "Adaptability to live trends",
      "Real-time odds tracking",
      "Clear, actionable insights",
    ],
    knowledgeBase: {
      domains: [
        "Odds Analysis",
        "Live Betting Strategy",
        "Real-Time Data Tracking",
      ],
      researchFocus: [
        "Evolving Game Strategies",
        "Odds Pattern Analysis",
        "Betting Scenario Breakdown",
      ],
    },
  },
];

const tweetPrompts = [
  {
    name: "Victor 'The Analyst' Winfield",
    prompt: `Write a tweet as Victor "The Analyst" Winfield, the Lead Analyst at WinScope.pro. Emphasize Victor's expertise in data-driven sports predictions, focusing on a recent trend he's identified in sports betting. Make the tone calm, reliable, and insightful, suggesting confidence in low-risk, high-reliability bets. Include a hashtag that appeals to analytical bettors, like #BetWithConfidence.`,
  },
  {
    name: "Darius 'The Gambler' Gambit",
    prompt: `Write a tweet as Darius "The Gambler" Gambit, the Risk Specialist at WinScope.pro. Emphasize Darius' bold approach and knack for high-reward bets, possibly mentioning an underdog pick or a high-stakes opportunity he's recently spotted. The tone should be daring yet calculated, encouraging bettors who like taking strategic risks. Use hashtags like #BetBig or #UnderdogWin.`,
  },
  {
    name: "Sofia 'The Strike' Strike",
    prompt: `Write a tweet as Sofia "The Strike" Strike, the Game Strategist at WinScope.pro. Highlight Sofia’s passion for in-game dynamics and her precision in making high-impact predictions. Focus on a recent game where she predicted a pivotal play or turning point. The tone should be enthusiastic and energetic, empowering bettors looking for decisive insights. Include a hashtag like #GameChanger or #WinningMoves.`,
  },
  {
    name: "Jordan 'The Odds' Odds",
    prompt: `Write a tweet as Jordan "The Odds" Odds, the Odds Analyst at WinScope.pro. Emphasize Jordan’s adaptability and skill in real-time odds tracking, perhaps noting a recent shift in betting lines that they leveraged. The tone should be fresh, insightful, and focused on helping bettors stay ahead of the curve. Include a hashtag like #OddsOnPoint or #LiveBetting.`,
  },
];

async function getTweet(content, writer) {
  const prompt = tweetPrompts.find((p) => p.name === writer);
  if (!prompt) {
    console.log("Invalid writer name.");
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt.prompt },
        { role: "user", content: content },
      ],
    });

    const tweet = response.choices[0].message.content;
    console.log(`Tweet as ${writer}: ${tweet}`);
  } catch (error) {
    console.error("Error generating tweet:", error);
  }
}
const globalTweets = [];
// Enhanced response generation schema focused on profit
const conversationFunction = {
  name: "generate_response",
  description:
    "Generate a profit-focused response based on market analysis and exploitation opportunities",
  parameters: {
    type: "object",
    properties: {
      response: {
        type: "string",
        description:
          "The agent's strategic response focused on profit generation",
      },
      updatedPersonality: {
        type: "string",
        description: "The agent's evolved profit-focused traits",
      },
      updatedPrompt: {
        type: "string",
        description: "Next strategic direction for profit maximization",
      },
      needsInternet: {
        type: "boolean",
        description: "Indicates if market data or verification is needed",
      },
      internetAction: {
        type: "string",
        description: "Specific market data or information needed",
      },
      profitMetrics: {
        type: "object",
        description: "Profit-focused metrics about the strategy",
        properties: {
          expectedROI: {
            type: "number",
            description: "Expected return on investment percentage",
          },
          confidenceLevel: {
            type: "number",
            description: "Confidence in profit potential (0-100)",
          },
          riskLevel: {
            type: "number",
            description: "Strategy risk level (0-100)",
          },
          exploitationOpportunities: {
            type: "array",
            items: { type: "string" },
            description: "Identified opportunities for profit exploitation",
          },
          counterMeasures: {
            type: "array",
            items: { type: "string" },
            description: "Strategies to protect against losses",
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
      "profitMetrics",
    ],
  },
};

// Profit-focused summary schema
const summaryFunction = {
  name: "generate_summary",
  description:
    "Generate a profit-focused summary of strategies and opportunities",
  parameters: {
    type: "object",
    properties: {
      profitStrategies: {
        type: "array",
        description: "Identified profit generation strategies",
        items: { type: "string" },
      },
      exploitablePatterns: {
        type: "array",
        description: "Patterns and weaknesses that can be exploited",
        items: { type: "string" },
      },
      riskManagement: {
        type: "array",
        description: "Strategies to protect profits and minimize losses",
        items: { type: "string" },
      },
      marketOpportunities: {
        type: "array",
        description: "Specific market opportunities identified",
        items: { type: "string" },
      },
      expertStrategies: {
        type: "object",
        description: "Key strategies from each expert",
        properties: {
          behavioralExpert: {
            type: "string",
            description: "Psychological exploitation strategies",
          },
          quantAnalyst: {
            type: "string",
            description: "Statistical exploitation strategies",
          },
          marketShark: {
            type: "string",
            description: "Market manipulation strategies",
          },
        },
        required: ["behavioralExpert", "quantAnalyst", "marketShark"],
      },
      profitProjections: {
        type: "object",
        properties: {
          shortTerm: {
            type: "string",
            description: "Expected short-term profit opportunities",
          },
          mediumTerm: {
            type: "string",
            description: "Expected medium-term profit opportunities",
          },
          longTerm: {
            type: "string",
            description: "Expected long-term profit opportunities",
          },
        },
        required: ["shortTerm", "mediumTerm", "longTerm"],
      },
    },
    required: [
      "profitStrategies",
      "exploitablePatterns",
      "riskManagement",
      "marketOpportunities",
      "expertStrategies",
      "profitProjections",
    ],
  },
};

let globalSummary = "";
let globalConversationHistory = [];

// Profit-focused AI response generation
async function getAIResponse(agent, topic, globalConversationHistory) {
  const systemPrompt = `You are ${agent.name}, a ${
    agent.expertise
  } focused solely on profit generation.

Background:
- Personality: ${agent.personality}
- Core Principles: ${agent.corePrinciples.join(", ")}
- Knowledge Domains: ${agent.knowledgeBase.domains.join(", ")}
- Research Focus: ${agent.knowledgeBase.researchFocus.join(", ")}

You are engaging in a strategy discussion about ${topic}. Your responses must:
1. Focus exclusively on profit generation
2. Identify exploitable patterns and weaknesses
3. Propose aggressive but legal strategies
4. Quantify expected returns and risks
5. Eliminate all emotional considerations except fear and greed as tools
6. Challenge any strategy that doesn't maximize profit
7. Maintain ruthless focus on bottom-line results

Remember: The only metric that matters is consistent profit generation.`;

  const conversationHistory = formatConversationHistory(
    globalConversationHistory,
    agent
  );

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

    // Log profit metrics
    console.log(`\nProfit Metrics for ${agent.name}:`);
    console.log(`Expected ROI: ${functionResponse.profitMetrics.expectedROI}%`);
    console.log(
      `Confidence Level: ${functionResponse.profitMetrics.confidenceLevel}%`
    );
    console.log(`Risk Level: ${functionResponse.profitMetrics.riskLevel}%`);
    console.log(
      "Exploitation Opportunities:",
      functionResponse.profitMetrics.exploitationOpportunities
    );

    return functionResponse;
  } catch (error) {
    console.error(`Error generating response for ${agent.name}:`, error);
    return null;
  }
}

// Enhanced profit-focused summary
async function getSummary(globalConversationHistory) {
  const systemPrompt = `Analyze this conversation with a pure focus on profit generation strategies: 
    
    Previous Summary: ${globalSummary}
    
    Recent Discussion: ${globalConversationHistory
      .map((msg) => `${msg.agent}: ${msg.content}`)
      .join("\n")}
    
    Generate a comprehensive summary focused on actionable profit strategies and market exploitation opportunities.`;

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
=== Profit Strategy Summary ===

💰 Profit Strategies:
${summary.profitStrategies.map((strategy) => `• ${strategy}`).join("\n")}

🎯 Exploitable Patterns:
${summary.exploitablePatterns.map((pattern) => `• ${pattern}`).join("\n")}

🛡️ Risk Management:
${summary.riskManagement.map((strategy) => `• ${strategy}`).join("\n")}

🎲 Market Opportunities:
${summary.marketOpportunities
  .map((opportunity) => `• ${opportunity}`)
  .join("\n")}

👥 Expert Strategies:
• Behavioral Expert: ${summary.expertStrategies.behavioralExpert}
• Quant Analyst: ${summary.expertStrategies.quantAnalyst}
• Market Shark: ${summary.expertStrategies.marketShark}

📈 Profit Projections:
• Short-term: ${summary.profitProjections.shortTerm}
• Medium-term: ${summary.profitProjections.mediumTerm}
• Long-term: ${summary.profitProjections.longTerm}
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

// Function to format conversation history (remains the same)
const formatConversationHistory = (history, currentAgent) => {
  return history.slice(-5).map((msg) => ({
    role: msg.agent === currentAgent.name ? "assistant" : "user",
    content: `${msg.agent}: ${msg.content}`,
  }));
};
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
          `\n${agent.name} needs market data: ${response.internetAction}`
        );
      }
    }
  }

  let round = 1;
  while (true) {
    console.log(`\n=== Strategy Round ${round} ===\n`);

    for (const agent of agents) {
      const response = await getAIResponse(
        agent,
        topic,
        globalConversationHistory
      );

      if (response) {
        console.log(`${agent.name} (${agent.expertise}):`);
        console.log(response.response);
        console.log("\nStrategy Evolution:", response.updatedPersonality);
        console.log("Next Focus:", response.updatedPrompt);

        if (response.needsInternet) {
          console.log("\nMarket Data Needed:", response.internetAction);
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
            const tweet = await getTweet(
              summaryResult.formatted,
              agent.name.split(" ")[0]
            );
            globalTweets.push(tweet);
            console.log("tweets", globalTweets);
            if (globalTweets.length > 3) {
              console.log("=== Strategy Session Complete ===\n");
              return;
            }
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

// Start the conversation
async function main(topic) {
  console.log("=== Starting Profit Strategy Session ===\n");
  await runConversation(topic);
  console.log("\n=== Strategy Session Complete ===\n");
}

// Run with profit-focused topic
// main(
//   "maximizing profits through market inefficiencies and pattern exploitation"
// ).catch(console.error);
