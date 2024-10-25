import OpenAI from "openai";
import dotenv from "dotenv";
import winston from "winston";

// Initialize environment variables
dotenv.config();

// Constants
const OPENAI_MODEL = "gpt-4o-mini"; // The original model name is kept for use
const DEFAULT_SYSTEM_PROMPT =
  "You are an expert at creating OpenAI function definitions. Generate appropriate function structures based on user requests. Include proper parameter types, descriptions, and requirements.";

// Initialize the OpenAI API client with API Key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set up a basic logger using winston
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Define the function generation tool
const tools = [
  {
    type: "function",
    function: {
      name: "generate_function_definition",
      description:
        "Generates an OpenAI function definition structure based on a topic or request.",
      parameters: {
        type: "object",
        properties: {
          functionName: {
            type: "string",
            description:
              "The name of the function to be generated in camelCase.",
          },
          parameters: {
            type: "object",
            description:
              "The parameters object containing all necessary parameters for the function.",
            properties: {
              type: { type: "string", enum: ["object"] },
              properties: {
                type: "object",
                description: "Dictionary of parameter definitions.",
              },
              required: {
                type: "array",
                items: { type: "string" },
                description: "List of required parameter names.",
              },
            },
            required: ["type", "properties"],
          },
        },
        required: ["functionName", "parameters"],
      },
    },
  },
];

// Function to generate structure from text prompt
async function generateFunctionStructureFromPrompt(userRequest) {
  try {
    if (!userRequest || typeof userRequest !== "string") {
      throw new Error(
        `User request must be a non-empty string. Received: ${userRequest}`
      );
    }

    logger.info(`Generating structure for request: ${userRequest}`);

    const structureResponse = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: DEFAULT_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Create a function structure for the following request: ${userRequest}`,
        },
      ],
      tools: tools,
      tool_choice: {
        type: "function",
        function: { name: "generate_function_definition" },
      },
    });

    logger.info(
      "Initial OpenAI response:",
      JSON.stringify(structureResponse, null, 2)
    );

    const toolCall = structureResponse.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      logger.error("No tool call found in the response.");
      throw new Error("No tool call found in the response.");
    }

    logger.info("Tool call arguments:", toolCall.function.arguments);

    const functionDefinition = JSON.parse(toolCall.function.arguments);
    return enhanceFunctionDefinition(functionDefinition);
  } catch (error) {
    logger.error(
      "Error generating function structure from prompt:",
      error.message
    );
    logger.debug("Error details:", error.stack);
    throw error;
  }
}

// Function to enhance existing function definition
async function enhanceFunctionDefinition(functionDefinition) {
  try {
    logger.info(
      "Enhancing function definition:",
      JSON.stringify(functionDefinition, null, 2)
    );

    if (!functionDefinition?.functionName || !functionDefinition?.parameters) {
      throw new Error("Invalid function definition structure.");
    }

    const descriptionResponse = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Generate a clear, concise description for the given function structure.",
        },
        {
          role: "user",
          content: `Generate a description for this function: ${JSON.stringify(
            functionDefinition
          )}`,
        },
      ],
    });

    logger.info(
      "Description response:",
      JSON.stringify(descriptionResponse, null, 2)
    );

    const description = descriptionResponse.choices[0]?.message?.content;
    if (!description) {
      throw new Error("No description generated.");
    }

    const result = {
      type: "function",
      function: {
        name: functionDefinition.functionName,
        description: description.trim(),
        parameters: functionDefinition.parameters,
        strict: true,
      },
    };

    logger.info("Enhanced function result:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    logger.error("Error enhancing function definition:", error.message);
    logger.debug("Error details:", error.stack);
    throw error;
  }
}

// Main function that handles both text prompts and function definitions
async function main(input) {
  try {
    if (!input) {
      throw new Error("Input is required.");
    }

    logger.info("Processing input of type:", typeof input);

    if (Array.isArray(input)) {
      logger.info("Processing array of", input.length, "functions");
      const results = await Promise.all(
        input.map(async (functionDef) => {
          logger.info("\nEnhancing function:", functionDef.functionName);
          try {
            const result = await enhanceFunctionDefinition(functionDef);
            logger.info(
              "Successfully enhanced function:",
              functionDef.functionName
            );
            return result;
          } catch (error) {
            logger.error(
              "Failed to enhance function:",
              functionDef.functionName,
              error
            );
            return null;
          }
        })
      );
      const filteredResults = results.filter(Boolean);
      logger.info(
        "Processed",
        filteredResults.length,
        "functions successfully"
      );
      return filteredResults;
    }

    if (typeof input === "string") {
      logger.info("\nGenerating function for prompt:", input);
      return await generateFunctionStructureFromPrompt(input);
    }

    if (typeof input === "object" && input !== null) {
      logger.info("\nEnhancing single function:", input.functionName);
      return await enhanceFunctionDefinition(input);
    }

    throw new Error("Invalid input type.");
  } catch (error) {
    logger.error("Error in main function:", error.message);
    logger.debug("Error details:", error.stack);
    throw error;
  }
}

// Export the main function and its supporting functions
export { main, generateFunctionStructureFromPrompt, enhanceFunctionDefinition };

// Example usage with proper error handling
const examplesFunctions = [
  {
    functionName: "send2FACode",
    parameters: {
      type: "object",
      properties: {
        recipientEmail: {
          type: "string",
          description: "The email address of the recipient.",
        },
        code: {
          type: "string",
          description: "The 2FA code to send.",
        },
      },
      required: ["recipientEmail", "code"],
    },
  },
  {
    functionName: "sendMessage",
    parameters: {
      type: "object",
      properties: {
        recipientEmail: {
          type: "string",
          description: "The email address of the recipient.",
        },
        message: {
          type: "string",
          description: "The message to send.",
        },
        subject: {
          type: "string",
          description: "The subject of the email.",
        },
        html: {
          type: "boolean",
          description: "Whether the message is HTML formatted.",
        },
      },
      required: ["recipientEmail", "message"],
    },
  },
];

// Run the example functions with proper logging
main(examplesFunctions)
  .then((results) => {
    logger.info("\nFinal enhanced function definitions:");
    logger.info(JSON.stringify(results, null, 2));
  })
  .catch((error) => {
    logger.error("Error in example execution:", error.message);
    process.exit(1);
  });
