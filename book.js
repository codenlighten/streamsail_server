import OpenAI from "openai";
import dotenv from "dotenv";
import { sendMessage } from "./nodemail.js";
import fs from "fs/promises";
import path from "path";
import readline from "readline";
import express from "express";
import EventEmitter from "events";
import exp from "constants";

dotenv.config();

class BookProgressEmitter extends EventEmitter {}
class StructuredBookCreator {
  constructor(config = {}) {
    this.openai = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    });
    this.outputDir = config.outputDir || "./books";
    this.model = config.model || "gpt-4o-mini";
    this.temperature = config.temperature || 0.7;
    this.progress = new BookProgressEmitter();

    // Style-specific configurations
    this.styles = {
      fiction: {
        temperature: 0.8,
        chapterConfig: {
          maxChapters: 12,
          minWords: 2000,
          maxWords: 4000,
          requiredSections: ["scene", "dialogue", "description", "ending"],
        },
        systemPrompt:
          "You are crafting an engaging fictional narrative with vivid descriptions and compelling dialogue.",
      },
      documentary: {
        temperature: 0.6,
        chapterConfig: {
          maxChapters: 8,
          minWords: 1500,
          maxWords: 3000,
          requiredSections: ["overview", "analysis", "evidence", "conclusion"],
        },
        systemPrompt:
          "You are writing an informative documentary-style book based on thorough research and factual information.",
      },
      academic: {
        temperature: 0.4,
        chapterConfig: {
          maxChapters: 10,
          minWords: 2000,
          maxWords: 3500,
          requiredSections: [
            "introduction",
            "methodology",
            "findings",
            "discussion",
          ],
        },
        systemPrompt:
          "You are writing an academic work with proper citations, methodology, and research-based content.",
      },
      biography: {
        temperature: 0.6,
        chapterConfig: {
          maxChapters: 10,
          minWords: 1800,
          maxWords: 3500,
          requiredSections: [
            "timeline",
            "personal_life",
            "achievements",
            "legacy",
          ],
        },
        systemPrompt:
          "You are writing a biographical account that captures both personal stories and historical significance.",
      },
      selfHelp: {
        temperature: 0.7,
        chapterConfig: {
          maxChapters: 8,
          minWords: 1500,
          maxWords: 2500,
          requiredSections: [
            "concept",
            "exercises",
            "reflection",
            "action_steps",
          ],
        },
        systemPrompt:
          "You are writing a practical self-help guide with actionable advice and exercises.",
      },
    };

    // Default style
    this.currentStyle = this.styles.documentary;
  }

  setStyle(style) {
    if (this.styles[style]) {
      this.currentStyle = this.styles[style];
      this.temperature = this.currentStyle.temperature;
      this.chapterConfig = this.currentStyle.chapterConfig;
    } else {
      throw new Error(
        `Unknown style: ${style}. Available styles: ${Object.keys(
          this.styles
        ).join(", ")}`
      );
    }
  }

  // Modified to handle style-specific chapter schemas
  get chapterSchema() {
    const baseSchema = {
      name: "generateStructuredChapter",
      description:
        "Generate a structured book chapter with style-specific sections",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          chapterNumber: { type: "number" },
        },
        required: ["title", "chapterNumber"],
      },
    };

    // Add style-specific properties
    this.currentStyle.chapterConfig.requiredSections.forEach((section) => {
      baseSchema.parameters.properties[section] = {
        type: "string",
        description: `${section} section content`,
      };
      baseSchema.parameters.required.push(section);
    });

    return baseSchema;
  }

  async saveBook(book) {
    const fileName = `${book.title.replace(/\s+/g, "-").toLowerCase()}.json`;
    await fs.writeFile(
      path.join(this.outputDir, fileName),
      JSON.stringify(book, null, 2)
    );
  }
  //save in easily readable format
  async saveBookReadable(book) {
    const fileName = `${book.title.replace(/\s+/g, "-").toLowerCase()}.txt`;
    const text = `Title: ${book.title}`;
    //for the text we will add thescene, dialogue, description, ending
    const chapters = book.chapters.map((chapter) => {
      const chapterText = `Chapter ${chapter.chapterNumber}: ${chapter.title}\n`;
      const sections = this.currentStyle.chapterConfig.requiredSections.map(
        (section) => {
          return `${section[0].toUpperCase() + section.slice(1)}:\n${
            chapter[section]
          }\n`;
        }
      );
      return chapterText + sections.join("\n");
    });
    await fs.writeFile(
      path.join(this.outputDir, fileName),
      text + "\n\n" + chapters.join("\n\n")
    );
  }

  async sendNotification(email, book) {
    const subject = `Your book "${book.title}" has been created!`;
    const message = `Your book "${
      book.title
    }" has been successfully created. You can download it from the following link: ${
      process.env.BOOK_DOWNLOAD_URL
    }/${book.title.replace(/\s+/g, "-")}.json`;

    await sendMessage(email, subject, message);
  }

  async generateTitle(topic, theme) {
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "Generate a concise, compelling book title (5-8 words).",
        },
        {
          role: "user",
          content: `Create a title for a book about ${topic} with the theme of ${theme}.`,
        },
      ],
      max_tokens: 50,
    });
    return completion.choices[0].message.content.trim();
  }

  async generateContents(topic, theme, style = "") {
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: `Create a focused table of contents with exactly ${this.chapterConfig.maxChapters} chapters. 
            Each chapter should build on previous ones and lead to a clear conclusion.`,
        },
        {
          role: "user",
          content: `Generate a table of contents for a book about ${topic} with the theme of ${theme} |${
            style ? style + "style" : ""
          }. 
            Structure it to tell a complete story with a clear beginning, middle, and end.`,
        },
      ],
    });

    const chapters = completion.choices[0].message.content
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => line.replace(/^\d+\.\s+/, "").trim())
      .filter((line) => line.length > 0)
      .slice(0, this.chapterConfig.maxChapters);

    return chapters;
  }

  async generateStructuredChapter(
    title,
    chapterTitle,
    topic,
    theme,
    index,
    totalChapters
  ) {
    const prompt = `
      You are writing chapter ${index + 1} of ${totalChapters} for "${title}".
      This chapter should focus on "${chapterTitle}" within the context of ${topic} and theme of ${theme}.
      
      Guidelines:
      1. Keep the total length between ${this.chapterConfig.minWords}-${
      this.chapterConfig.maxWords
    } words
      2. Write a clear introduction that sets up the chapter's goals
      3. Include 2-4 main content sections with clear subheadings
      4. End with a strong conclusion that summarizes key points
      5. ${
        index === totalChapters - 1
          ? "As this is the final chapter, ensure it provides closure for the entire book."
          : ""
      }
    `;

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content:
            "Generate the chapter with clear structure and organization.",
        },
      ],
      functions: [{ ...this.chapterSchema }],
      function_call: { name: "generateStructuredChapter" },
    });

    const chapterContent = JSON.parse(
      completion.choices[0].message.function_call.arguments
    );
    return {
      title: chapterTitle,
      chapterNumber: index + 1,
      isLastChapter: index === totalChapters - 1,
      ...chapterContent,
    };
  }
  async saveProgress(progress) {
    await fs.writeFile(
      path.join(this.outputDir, "progress.json"),
      JSON.stringify(progress, null, 2)
    );
  }
  async createBook(topic, theme, notifyEmail = null, style = "documentary") {
    try {
      this.setStyle(style);

      const title = await this.generateTitle(topic, theme);
      this.progress.emit("status", `Generated title: ${title}`);

      // Modified to use style-specific system prompt
      const chapters = await this.generateContents(topic, theme);
      this.progress.emit(
        "status",
        `Generated table of contents with ${chapters.length} chapters`
      );

      const chapterContents = [];
      for (let i = 0; i < chapters.length; i++) {
        this.progress.emit(
          "status",
          `Generating chapter ${i + 1}: ${chapters[i]}`
        );
        const chapter = await this.generateStructuredChapter(
          title,
          chapters[i],
          topic,
          theme,
          i,
          chapters.length
        );
        chapterContents.push(chapter);
        await this.saveProgress({
          title,
          topic,
          theme,
          style,
          chapters: chapterContents,
        });
      }

      const book = {
        title,
        topic,
        theme,
        style,
        dateCreated: new Date().toISOString(),
        chapters: chapterContents,
      };

      await this.saveBook(book);
      await this.saveBookReadable(book);
      if (notifyEmail) {
        await this.sendNotification(notifyEmail, book);
      }

      return book;
    } catch (error) {
      this.progress.emit("error", error);
      throw error;
    }
  }
}

// Determine how to run based on environment or arguments
const main = () => {
  const mode = process.env.MODE || "cli";
  if (mode === "server") {
    runServer();
  } else {
    runCLI();
  }
};

// if (require.main === module) {
//   main();
// }

//test
async function generateBook(topic, theme, email, style = "documentary") {
  const bookCreator = new StructuredBookCreator();
  bookCreator.progress.on("status", (status) => console.log(status));
  bookCreator.progress.on("error", (error) => console.error(error));

  const book = await bookCreator.createBook(topic, theme, email, style);
  console.log("Book created:", book.title);
  return book;
}

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

async function generateStreamSailBook() {
  const bookCreator = new StructuredBookCreator();
  bookCreator.progress.on("status", (status) => console.log(status));
  bookCreator.progress.on("error", (error) => console.error(error));

  const book = await bookCreator.createBook(
    "StreamSail Pro",
    "Live Streaming",
    streamSailPrompt
  );

  console.log("Book created:", book.title);
}

export { generateBook };
