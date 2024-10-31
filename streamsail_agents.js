// streamSailManager.js
import OpenAI from "openai";
import dotenv from "dotenv";
import { sendMessage } from "./nodemail.js";
import { tweets, conversations } from "./mongo.js";

dotenv.config();

// Constants
const OPENAI_MODEL = "gpt-4o-mini";
const MAX_CONVERSATION_HISTORY = 5;
const MAX_TWEETS_CACHE = 5;
const CONVERSATION_ROUND_DELAY = 5000;
const SUMMARY_THRESHOLD = 8;
const WEBSITE_URL = "https://streamsail.pro";

let rounds = 0;
// Agent definitions - keeping them in the same file for completeness
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
    hasTwitter: false,
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
    hasTwitter: false,
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
    hasTwitter: true,
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

// Schema definitions
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
        properties: {
          confidenceLevel: {
            type: "number",
            description: "Confidence in current position (0-100)",
          },
          ethicalConsiderations: {
            type: "array",
            items: { type: "string" },
          },
          counterArguments: {
            type: "array",
            items: { type: "string" },
          },
          decisionFactors: {
            type: "array",
            items: { type: "string" },
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

const summaryFunction = {
  name: "generate_summary",
  description: "Generate a structured summary of the conversation",
  parameters: {
    type: "object",
    properties: {
      keyPoints: {
        type: "array",
        items: { type: "string" },
        description: "Critical points and facts discussed",
      },
      emotionalDynamics: {
        type: "array",
        items: { type: "string" },
        description: "Notable emotional responses or shifts in tone",
      },
      actionableInsights: {
        type: "array",
        items: { type: "string" },
        description: "Specific strategies or recommendations proposed",
      },
      openQuestions: {
        type: "array",
        items: { type: "string" },
        description:
          "Unresolved questions or areas needing further exploration",
      },
      expertContributions: {
        type: "object",
        properties: {
          liveStreamExpert: { type: "string" },
          sportsAnalyst: { type: "string" },
          sportsCardExpert: { type: "string" },
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

class StreamSailManager {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.globalConversationHistory = [];
    this.globalSummary = "";
    this.globalTweets = [];
    this.rounds = 0;
  }

  buildSystemPrompt(agent, topic, newPrompt = "") {
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
gpt
Current conversation context: This is a collaborative discussion aimed at reaching actionable conclusions.`;

    if (newPrompt) {
      systemPrompt += `\n\nAdditional Context: ${newPrompt}`;
    }

    if (this.globalSummary) {
      systemPrompt += `\n\nPrevious Discussion Summary: ${this.globalSummary}`;
    }

    return systemPrompt;
  }

  async extractKeywords(conversation) {
    const prompt = `
    Analyze this conversation and extract the 3 most relevant and engaging hashtags or keywords.
    Focus on terms that will drive engagement and are relevant to streaming and sports.
    
    Conversation:
    ${conversation.join("\n")}
    
    Return only the keywords separated by commas, without explanation or commentary.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: "system", content: prompt }],
        temperature: 0.7,
      });

      return response.choices[0].message.content
        .split(",")
        .map((k) => k.trim());
    } catch (error) {
      console.error("Error extracting keywords:", error);
      return ["streaming", "sports", "engagement"];
    }
  }

  async generateTweetWithCTA(conversation, websiteLink) {
    try {
      const keywords = await this.extractKeywords(conversation);
      const hashtags = keywords
        .map((keyword) => `#${keyword.replace(/\s+/g, "")}`)
        .join(" ");

      const prompt = `
      Create an engaging tweet about StreamSail Pro based on this conversation.
      
      Guidelines:
      1. Include a clear call-to-action
      2. Make it engaging and shareable
      3. Use these hashtags appropriately: ${hashtags}
      4. Keep it under 280 characters including the URL and hashtags
      5. Focus on value proposition and engagement
      6. Use compelling language that drives action
      
      Conversation context:
      ${conversation.slice(-3).join("\n")}
      
      Format: Write only the tweet text, which will be combined with the URL and hashtags.`;

      const response = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: "system", content: prompt }],
        temperature: 0.8,
      });

      const tweetText = response.choices[0].message.content.trim();
      const utm =
        "?utm_source=twitter&utm_medium=social&utm_campaign=engagement";

      return `${tweetText} ${websiteLink}${utm} ${hashtags}`.slice(0, 280);
    } catch (error) {
      console.error("Error generating tweet:", error);
      return null;
    }
  }

  async handleTweetGeneration(agent, conversationContent) {
    if (!agent.hasTwitter || conversationContent.length < 3) {
      return null;
    }

    try {
      const tweet = await this.generateTweetWithCTA(
        conversationContent,
        WEBSITE_URL
      );
      if (!tweet) return null;

      await tweets.insertTweet({
        tweet,
        timestamp: new Date(),
        agent: agent.name,
      });
      await this.sendTweetToEmail(tweet);

      this.globalTweets.push(tweet);
      if (this.globalTweets.length > MAX_TWEETS_CACHE) {
        this.globalTweets.shift();
        await this.sendTweetDigest();
      }

      return tweet;
    } catch (error) {
      console.error("Error in tweet generation flow:", error);
      return null;
    }
  }

  async sendTweetToEmail(tweet) {
    try {
      await sendMessage(
        process.env.STREAMSAIL_EMAIL,
        `New tweet generated by StreamSail:\n\n${tweet}`,
        "New Tweet Alert",
        true
      );
    } catch (error) {
      console.error("Error sending tweet email:", error);
    }
  }

  async sendTweetDigest() {
    try {
      const digestContent = this.globalTweets
        .map((tweet, index) => `${index + 1}. ${tweet}`)
        .join("\n\n");

      await sendMessage(
        process.env.ADMIN_EMAIL,
        `Recent StreamSail Tweets:\n\n${digestContent}`,
        "StreamSail Tweet Digest",
        true
      );
    } catch (error) {
      console.error("Error sending tweet digest:", error);
    }
  }

  formatConversationHistory(history, currentAgent) {
    return history.slice(-MAX_CONVERSATION_HISTORY).map((msg) => ({
      role: msg.agent === currentAgent.name ? "assistant" : "user",
      content: `${msg.agent}: ${msg.content}`,
    }));
  }
  async generateInitialResponse(agent) {
    this.globalConversationHistory.push({
      agent: agent.name,
      content: `Initial introduction: ${agent.personality}`,
    });

    return {
      response: `As ${agent.name}, I bring expertise in ${agent.expertise}. 
                 My approach is guided by ${agent.corePrinciples.join(", ")}.
                 I look forward to contributing insights on ${agent.knowledgeBase.domains.join(
                   ", "
                 )}. StreamSail Pro is a platform I'm excited to discuss. ${streamSailPrompt}`,
      updatedPersonality: agent.personality,
      updatedPrompt: "",
      needsInternet: false,
      internetAction: "",
      cognitionMetrics: {
        confidenceLevel: 100,
        ethicalConsiderations: [],
        counterArguments: [],
        decisionFactors: ["Initial introduction"],
      },
    };
  }
  async getAIResponse(agent, topic, newPrompt = "") {
    try {
      const systemPrompt = this.buildSystemPrompt(agent, topic, newPrompt);

      if (rounds === 0) {
        return await this.generateInitialResponse(agent, systemPrompt);
      }

      const conversationHistory = this.formatConversationHistory(
        this.globalConversationHistory,
        agent
      );

      const tweet = await this.handleTweetGeneration(
        agent,
        this.globalConversationHistory.map((msg) => msg.content)
      );

      let enhancedPrompt = systemPrompt;
      if (tweet) {
        enhancedPrompt += `\n\nRecent tweet generated: ${tweet}`;
      }

      const response = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: enhancedPrompt },
          ...conversationHistory,
        ],
        temperature: 0.9,
        functions: [
          {
            name: "generate_response",
            parameters: conversationFunction.parameters,
          },
        ],
        function_call: { name: "generate_response" },
      });

      const functionResponse = JSON.parse(
        response.choices[0].message.function_call.arguments
      );

      this.logCognitiveMetrics(agent.name, functionResponse.cognitionMetrics);
      this.rounds++;

      // Store conversation in database
      await conversations.insertOne({
        agent: agent.name,
        content: functionResponse.response,
        timestamp: new Date(),
        metrics: functionResponse.cognitionMetrics,
      });

      return functionResponse;
    } catch (error) {
      console.error(`Error generating response for ${agent.name}:`, error);
      return null;
    }
  }

  logCognitiveMetrics(agentName, metrics) {
    console.log(`\n=== Cognitive Metrics for ${agentName} ===`);
    console.log(`Confidence Level: ${metrics.confidenceLevel}%`);
    console.log("Decision Factors:", metrics.decisionFactors);
    if (metrics.ethicalConsiderations.length > 0) {
      console.log("Ethical Considerations:", metrics.ethicalConsiderations);
    }
    if (metrics.counterArguments.length > 0) {
      console.log("Counter Arguments Considered:", metrics.counterArguments);
    }
  }

  async getSummary() {
    try {
      const conversation = this.globalConversationHistory.map(
        (msg) => msg.content
      );
      const prompt = `
    Analyze this conversation and generate a comprehensive summary focusing on:
    1. Key insights and actionable recommendations
    2. Expert contributions and their unique perspectives
    3. Areas of consensus and disagreement
    4. Potential opportunities and challenges identified
    5. Next steps and strategic recommendations

    Consider the expertise of each participant:
    - Livestream Pro: Live streaming technology and viewer engagement
    - Mike Thompson: Sports analysis and statistics
    - Tony 'Numbers' Romano: Sports cards and gambling insights
    - Social Media Guru: Social media strategy and content optimization

    Conversation:
    ${conversation.join("\n")}`;

      const response = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [{ role: "system", content: prompt }],
        functions: [
          { name: "generate_summary", parameters: summaryFunction.parameters },
        ],
        function_call: { name: "generate_summary" },
      });

      const functionResponse = JSON.parse(
        response.choices[0].message.function_call.arguments
      );

      this.logSummary(functionResponse);

      const formattedSummary = this.formatSummary(functionResponse);

      // Store summary in database
      await conversations.insertOne({
        type: "summary",
        content: formattedSummary,
        timestamp: new Date(),
        metrics: functionResponse,
      });

      return { formatted: formattedSummary };
    } catch (error) {
      console.error("Error generating conversation summary:", error);
      return null;
    }
  }

  logSummary(summary) {
    console.log("\n=== Conversation Summary ===");
    console.log("\nKey Points:");
    summary.keyPoints.forEach((point, i) => console.log(`${i + 1}. ${point}`));

    console.log("\nEmotional Dynamics:");
    summary.emotionalDynamics.forEach((dynamic, i) =>
      console.log(`${i + 1}. ${dynamic}`)
    );

    console.log("\nActionable Insights:");
    summary.actionableInsights.forEach((insight, i) =>
      console.log(`${i + 1}. ${insight}`)
    );

    console.log("\nOpen Questions:");
    summary.openQuestions.forEach((question, i) =>
      console.log(`${i + 1}. ${question}`)
    );

    console.log("\nExpert Contributions:");
    console.log(
      "Livestream Expert:",
      summary.expertContributions.liveStreamExpert
    );
    console.log("Sports Analyst:", summary.expertContributions.sportsAnalyst);
    console.log(
      "Sports Card Expert:",
      summary.expertContributions.sportsCardExpert
    );
  }

  formatSummary(summary) {
    return `
# StreamSail Pro Conversation Summary

## Key Points
${summary.keyPoints.map((point) => `- ${point}`).join("\n")}

## Actionable Insights
${summary.actionableInsights.map((insight) => `- ${insight}`).join("\n")}

## Expert Contributions

### Livestream Expert
${summary.expertContributions.liveStreamExpert}

### Sports Analyst
${summary.expertContributions.sportsAnalyst}

### Sports Card Expert
${summary.expertContributions.sportsCardExpert}

## Discussion Dynamics
${summary.emotionalDynamics.map((dynamic) => `- ${dynamic}`).join("\n")}

## Open Questions & Next Steps
${summary.openQuestions.map((question) => `- ${question}`).join("\n")}
  `;
  }

  updateAgentState(agent, response) {
    this.globalConversationHistory.push({
      agent: agent.name,
      content: response.response,
      timestamp: new Date(),
    });

    agent.personality = response.updatedPersonality;
    agent.lastPrompt = response.updatedPrompt;

    if (response.needsInternet) {
      console.log(`\n${agent.name} requests data: ${response.internetAction}`);
    }
  }

  logAgentResponse(agent, response) {
    console.log(`\n=== ${agent.name} (${agent.expertise}) ===`);
    console.log("\nResponse:");
    console.log(response.response);
    console.log("\nPersonality Evolution:", response.updatedPersonality);
    console.log("Next Direction:", response.updatedPrompt);

    if (response.needsInternet) {
      console.log("\nData Request:", response.internetAction);
    }

    console.log("\nCognitive Metrics:");
    console.log(`- Confidence: ${response.cognitionMetrics.confidenceLevel}%`);
    console.log(
      "- Decision Factors:",
      response.cognitionMetrics.decisionFactors
    );

    if (response.cognitionMetrics.ethicalConsiderations.length > 0) {
      console.log(
        "- Ethical Considerations:",
        response.cognitionMetrics.ethicalConsiderations
      );
    }

    console.log("\n---");
  }

  async handleSummaryGeneration() {
    const summaryResult = await this.getSummary();
    if (summaryResult) {
      this.globalSummary = summaryResult.formatted;
      this.globalConversationHistory = [
        {
          agent: "System",
          content:
            "=== Discussion Reset Based on Summary ===\n" + this.globalSummary,
        },
      ];
    }
  }
  async runConversation(topic, newPrompt) {
    console.log(`\n=== Starting New StreamSail Pro Discussion ===`);
    console.log(`Topic: ${topic}`);

    this.globalConversationHistory = [];

    // Initial introductions
    console.log("\n=== Expert Introductions ===");
    for (const agent of agents) {
      const response = await this.getAIResponse(agent, topic, newPrompt);
      if (response) {
        this.updateAgentState(agent, response);
        console.log(`\n${agent.name} has joined the discussion.`);
      }

      // Add a delay between agent introductions
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2-second delay between agents
    }

    // Start the conversation rounds
    while (true) {
      console.log(`\n=== Discussion Round ${rounds + 1} ===`);

      for (const agent of agents) {
        const response = await this.getAIResponse(agent, topic);

        if (response) {
          this.logAgentResponse(agent, response);
          this.updateAgentState(agent, response);

          // Generate summary after threshold
          if (this.globalConversationHistory.length >= SUMMARY_THRESHOLD) {
            console.log("\n=== Generating Discussion Summary ===");
            await this.handleSummaryGeneration();
          }

          // Add delay between responses
          await new Promise((resolve) =>
            setTimeout(resolve, CONVERSATION_ROUND_DELAY)
          );
        }
        rounds += 1;
      }
    }
  }

  async getLatestTweets() {
    try {
      let tweetArray = [];

      if (this.globalTweets.length === 0) {
        let tweetDocs = [];
        tweetDocs =
          (await tweets.find({}, { sort: { timestamp: -1 }, limit: 5 })) || [];

        tweetArray = tweetDocs.map((doc) => doc.tweet);
      } else {
        tweetArray = [...this.globalTweets];
      }

      const formattedTweets = tweetArray
        .map((tweet, i) => `${i + 1}. ${tweet}`)
        .join("\n\n");

      const message = `
Recent StreamSail Pro Tweets
===========================
${formattedTweets}

Generated at: ${new Date().toLocaleString()}
    `;

      // Send email digest
      await sendMessage(
        process.env.STREAMSAIL_EMAIL,
        message,
        "StreamSail Pro - Recent Tweets Digest",
        true
      );

      return message;
    } catch (error) {
      console.error("Error retrieving latest tweets:", error);
      return "";
    }
  }
}

// Create initial prompt template
const streamSailPrompt = `
You are participating in a strategic discussion about StreamSail Pro, a cutting-edge platform for live streaming enhancement. 

Key Platform Features:
- Interactive viewer engagement tools
- Real-time analytics and performance metrics
- Customizable overlays and visual elements
- Integration with major streaming platforms
- Sports-focused features and analytics
- Collectible card streaming optimization
- Social media integration and automation

Discussion Goals:
1. Identify opportunities to increase viewer engagement
2. Develop strategies for monetization and growth
3. Optimize the platform for sports and collectibles content
4. Enhance social media presence and impact

Each expert should contribute their unique perspective while building on others' insights. Focus on practical, actionable recommendations that can be implemented to improve StreamSail Pro.
`;

// Initialize and export
const streamSailManager = new StreamSailManager();

// Example usage
async function main() {
  try {
    console.log("Starting StreamSail Pro Discussion System...");

    // Start the main conversation
    await streamSailManager.runConversation(
      "Optimizing StreamSail Pro for Maximum Impact",
      streamSailPrompt
    );
  } catch (error) {
    console.error("Error in main execution:", error);
  }
}

// Run the main function
// main();
// const latestTweets = await streamSailManager.getLatestTweets();
// Export for external use
export {
  streamSailManager,
  StreamSailManager,
  main,
  streamSailPrompt,
  agents,
  summaryFunction,
  conversationFunction,
};
