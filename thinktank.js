import OpenAI from "openai";
import dotenv from "dotenv";
import winston from "winston";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { sendMessage } from "./nodemail";
import axios from "axios";

dotenv.config();

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4-turbo-preview";
const SANDBOX_DIR = path.join(os.homedir(), "ai_thinktank_sandbox");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "thinktank.log" }),
  ],
});

async function initializeSandbox() {
  try {
    await fs.mkdir(SANDBOX_DIR, { recursive: true });
    logger.info(`Initialized sandbox directory at ${SANDBOX_DIR}`);
  } catch (error) {
    logger.error(`Failed to initialize sandbox: ${error.message}`);
    throw error;
  }
}

async function fetchFromWeb(url) {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      validateStatus: (status) => status === 200,
    });
    logger.info(`Fetched data from ${url}`);
    return response.data;
  } catch (error) {
    logger.error(`Error fetching from web: ${error.message}`);
    return null;
  }
}

async function getFunctionTaskList() {
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert software architect. Plan out the functions needed for the project.",
        },
        {
          role: "user",
          content: `Provide a list of functions that need to be created. Each function should be responsible for one specific task. Return as JSON array with "fileName" and "taskDescription".`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No content received from OpenAI");

    const functionTasks = JSON.parse(content);
    logger.info("Received function task list from OpenAI");
    return functionTasks.tasks || [];
  } catch (error) {
    logger.error(`Error getting function task list: ${error.message}`);
    throw error;
  }
}

async function recursiveFunctionCreation(task, visitedTasks = new Set()) {
  if (!task || visitedTasks.has(task.fileName)) {
    return;
  }
  visitedTasks.add(task.fileName);

  try {
    const functionDefinition = await createOpenAIFunctionDefinition(
      task.taskDescription
    );
    if (functionDefinition) {
      await createFile(`${task.fileName}.js`, functionDefinition);
      const nextTask = await thinkTankDecision(visitedTasks);
      if (nextTask) {
        await recursiveFunctionCreation(nextTask, visitedTasks);
      }
    }
  } catch (error) {
    logger.error(`Error in recursive function creation: ${error.message}`);
    throw error;
  }
}

async function thinkTankDecision(visitedTasks) {
  try {
    const files = await fs.readdir(SANDBOX_DIR);
    const fileContents = await Promise.all(
      files
        .filter((file) => file.endsWith(".js"))
        .map(async (file) => {
          const content = await readFile(file);
          return `File: ${file}\n${content}\n`;
        })
    );

    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an AI that analyzes existing code and determines next steps for development.",
        },
        {
          role: "user",
          content: `Given the current files:\n${fileContents.join(
            "\n"
          )}\nDetermine if additional functions are needed. If so, provide next task as JSON with "fileName" and "taskDescription". If not, respond with "null".`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content || content.trim().toLowerCase() === "null") {
      return null;
    }

    const nextTask = JSON.parse(content);
    return nextTask.task;
  } catch (error) {
    logger.error(`Error in think tank decision: ${error.message}`);
    throw error;
  }
}

async function createFile(filename, content) {
  const fullPath = path.join(SANDBOX_DIR, filename);
  try {
    await fs.writeFile(fullPath, content);
    logger.info(`Created file ${fullPath}`);
  } catch (error) {
    logger.error(`Error creating file: ${error.message}`);
    throw error;
  }
}

async function readFile(filename) {
  const fullPath = path.join(SANDBOX_DIR, filename);
  try {
    return await fs.readFile(fullPath, "utf-8");
  } catch (error) {
    logger.error(`Error reading file: ${error.message}`);
    throw error;
  }
}

async function createOpenAIFunctionDefinition(
  taskDescription,
  additionalRequirements = ""
) {
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert JavaScript developer. Generate function code for given tasks, including proper parameter types and descriptions.",
        },
        {
          role: "user",
          content: `Create a JavaScript function that: ${taskDescription}. Use camelCase, accept parameters as an object. ${additionalRequirements} Include necessary imports/exports.`,
        },
      ],
      temperature: 0.7,
    });

    const functionDefinition = response.choices[0]?.message?.content;
    if (!functionDefinition) throw new Error("No function definition received");

    logger.info(`Generated function definition for: ${taskDescription}`);
    return functionDefinition;
  } catch (error) {
    logger.error(`Error generating function definition: ${error.message}`);
    throw error;
  }
}

async function runAI() {
  try {
    await initializeSandbox();
    const functionTasks = await getFunctionTaskList();

    for (const task of functionTasks) {
      await recursiveFunctionCreation(task, new Set());
    }

    await sendMessage(
      process.env.NOTIFICATION_EMAIL || "codenlighten1@gmail.com",
      "AI function building process completed successfully."
    );

    logger.info("AI process completed successfully");
  } catch (error) {
    logger.error(`AI process failed: ${error.message}`);
    throw error;
  }
}

export {
  runAI,
  getFunctionTaskList,
  createOpenAIFunctionDefinition,
  fetchFromWeb,
};

if (require.main === module) {
  runAI().catch((error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
