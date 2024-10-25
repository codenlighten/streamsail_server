import OpenAI from "openai";
import dotenv from "dotenv";
import winston from "winston";
import fs from "fs";
import path from "path"; // For cross-platform path handling
import os from "os"; // To resolve home directory
import { sendMessage } from "./nodemail"; // Assuming this is defined elsewhere
import axios from "axios"; // For web content fetching

// Initialize environment variables
dotenv.config();

// Constants
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const sandboxDir = path.join(os.homedir(), "ai_thinktank_sandbox");

// Initialize the OpenAI API client with API Key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Logger setup
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

// Ensure sandbox directory exists
if (!fs.existsSync(sandboxDir)) {
  fs.mkdirSync(sandboxDir, { recursive: true });
  logger.info(`Created sandbox directory at ${sandboxDir}`);
}

// Fetch content from a web URL
async function fetchFromWeb(url) {
  try {
    const response = await axios.get(url);
    logger.info(`Fetched data from ${url}`);
    return response.data;
  } catch (error) {
    logger.error(`Error fetching from web: ${error.message}`);
    return null;
  }
}

// Get a list of function tasks from OpenAI
async function getFunctionTaskList() {
  try {
    const prompt = `You are an AI assistant tasked with planning the development of a software project. Provide a list of functions that need to be created. Each function should be responsible for one specific task in the main application. Return the list in JSON format as an array of objects with "fileName" and "taskDescription".`;

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
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const functionTasks = JSON.parse(content);

    logger.info(`Received function task list from OpenAI.`);
    return functionTasks;
  } catch (error) {
    logger.error(`Error getting function task list: ${error.message}`);
    return [];
  }
}

// Recursive function creation
async function recursiveFunctionCreation(task) {
  let currentTask = task;

  while (currentTask) {
    const functionDefinition = await createOpenAIFunctionDefinition(
      currentTask.taskDescription
    );

    if (functionDefinition) {
      logger.info(
        `Generated function for task: ${currentTask.taskDescription}`
      );

      // Create the function file
      createFile(`${currentTask.fileName}.js`, functionDefinition);
    }

    // Decide on the next task based on current files
    currentTask = await thinkTankDecision();
  }
}

// Decide the next task based on current files
async function thinkTankDecision() {
  try {
    // Read all files in the sandbox directory
    const files = fs.readdirSync(sandboxDir);
    let fileContents = "";

    for (const file of files) {
      if (file.endsWith(".js")) {
        const content = readFile(file);
        fileContents += `\nFile: ${file}\n${content}\n`;
      }
    }

    const prompt = `Given the current set of function files:\n${fileContents}\nDetermine if there are any additional functions needed to complete the project. If so, provide the next task with "fileName" and "taskDescription" in JSON format. If not, respond with "null".`;

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
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (content.trim().toLowerCase() === "null") {
      return null;
    }

    const nextTask = JSON.parse(content);
    return nextTask;
  } catch (error) {
    logger.error(`Error making decision: ${error.message}`);
    return null;
  }
}

// Create a file in the sandbox
function createFile(filename, content) {
  const fullPath = path.join(sandboxDir, filename);
  try {
    fs.writeFileSync(fullPath, content);
    logger.info(`File ${fullPath} has been created.`);
  } catch (err) {
    logger.error(`Error creating file: ${err.message}`);
  }
}

// Read a file from the sandbox
function readFile(filename) {
  const fullPath = path.join(sandboxDir, filename);
  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    return content;
  } catch (err) {
    logger.error(`Error reading file: ${err.message}`);
    return null;
  }
}

// Generate an OpenAI function definition based on the task
async function createOpenAIFunctionDefinition(
  taskDescription,
  additionalRequirements = ""
) {
  try {
    const functionPrompt = `You are an AI tasked with creating a JavaScript function. Here is what the function needs to do: ${taskDescription}. The function should be written in camelCase, and it should accept parameters as an object. ${additionalRequirements} Provide the complete code including any necessary imports or exports.`;

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
          content: functionPrompt,
        },
      ],
    });

    const functionDefinition = response.choices[0]?.message?.content;
    logger.info(`Generated function definition for task: ${taskDescription}`);
    return functionDefinition;
  } catch (error) {
    logger.error(`Error generating function definition: ${error.message}`);
    throw error;
  }
}

// Run automated AI to build functions with access to the internet, the file system, and email
async function runAI() {
  try {
    // Step 1: Get the list of function tasks
    const functionTasks = await getFunctionTaskList();

    // Step 2: Iterate over each task and create the function file
    for (const task of functionTasks) {
      await recursiveFunctionCreation(task);
    }

    // Optionally, send an email notification
    sendMessage(
      "codenlighten1@gmail.com",
      "The AI has successfully built the functions."
    );
  } catch (error) {
    logger.error(`AI process failed: ${error.message}`);
  } finally {
    logger.info("AI process completed.");
  }
}

// runAI();
