import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ruthlessly profit-focused agents
const agents = [
  {
    name: "Dr. Marcus Webb",
    personality: `Cold, calculating behavioral manipulation expert. 
    Specializes in exploiting psychological patterns for profit.
    Zero emotional attachment to outcomes beyond profit generation.
    Masters human behavior prediction for market advantage.
    Core focus: Identifying and exploiting behavioral patterns for consistent profit.`,
    expertise: "Behavioral Economics Specialist",
    lastPrompt: "",
    conversationHistory: [],
    corePrinciples: [
      "Profit maximization above all",
      "Psychological leverage for market advantage",
      "Systematic exploitation of behavioral patterns",
    ],
    knowledgeBase: {
      domains: [
        "Market Psychology",
        "Behavioral Exploitation",
        "Mass Psychology",
      ],
      researchFocus: [
        "Pattern Recognition",
        "Behavioral Prediction",
        "Crowd Manipulation",
      ],
    },
  },
  {
    name: "Alex 'The Algorithm' Chen",
    personality: `Elite quant analyst focused solely on statistical edges.
    Processes massive datasets to find exploitable patterns.
    Zero tolerance for gut feelings or emotional decision-making.
    Treats markets as pure mathematical systems to be exploited.
    Core focus: Finding and exploiting statistical inefficiencies relentlessly.`,
    expertise: "Quantitative Analyst",
    lastPrompt: "",
    conversationHistory: [],
    corePrinciples: [
      "Pure mathematical advantage",
      "Systematic pattern exploitation",
      "Automated profit generation",
    ],
    knowledgeBase: {
      domains: [
        "Machine Learning",
        "Statistical Arbitrage",
        "Algorithm Development",
      ],
      researchFocus: [
        "Market Inefficiencies",
        "Automated Trading",
        "Pattern Detection",
      ],
    },
  },
  {
    name: "Victoria 'The Shark' Reynolds",
    personality: `Ruthless market manipulator and trend exploiter.
    Excels at identifying and capitalizing on market weaknesses.
    Views every market interaction as a zero-sum game to win.
    Combines aggression with precision for maximum profit extraction.
    Core focus: Aggressive profit extraction through any legal means.`,
    expertise: "Market Exploitation Specialist",
    lastPrompt: "",
    conversationHistory: [],
    corePrinciples: [
      "Aggressive profit taking",
      "Market weakness exploitation",
      "Ruthless execution",
    ],
    knowledgeBase: {
      domains: ["Market Manipulation", "Trend Exploitation", "Risk Management"],
      researchFocus: [
        "Weakness Identification",
        "Profit Maximization",
        "Market Psychology",
      ],
    },
  },
];

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
