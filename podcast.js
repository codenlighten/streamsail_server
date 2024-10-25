import dotenv from "dotenv";
dotenv.config();
import OpenAI from "openai";
import { ElevenLabsClient } from "elevenlabs";
import fs from "fs";
import tiktoken from "tiktoken-node";
import { PDFDocument } from "pdf-lib";
import { pipeline } from "stream";
import util from "util";

// Ensure the uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize ElevenLabs API
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Utility to handle async stream piping
const pipelinePromise = util.promisify(pipeline);

// Encoding model for tokenizing text
const enc = tiktoken.getEncoding("cl100k_base");

// Predefined voice array for ElevenLabs
const voiceArray = [
  { voice_id: "pFZP5JQG7iQjIQuC4Bku", name: "Lilly" },
  { voice_id: "pqHfZKP75CvOlQylNhV4", name: "Bill" },
  { voice_id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel" },
];
const gptVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
// Utility function to break text into smaller chunks based on token count
const chunkText = (text, maxTokens = 500) => {
  const tokens = enc.encode(text);
  const numChunks = Math.ceil(tokens.length / maxTokens);
  const chunks = [];

  for (let i = 0; i < numChunks; i++) {
    const start = i * maxTokens;
    const end = Math.min((i + 1) * maxTokens, tokens.length);
    const chunk = enc.decode(tokens.slice(start, end));
    chunks.push(chunk);
  }

  return chunks;
};

// Function to generate podcast text using OpenAI
const generatePodCast = async (topic, numParticipants) => {
  const query = `Generate a podcast on ${topic} with ${numParticipants} participants. Separate each participant's response with a new line, keeping the conversation in time order.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Generate a podcast" },
        { role: "user", content: query },
      ],
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error generating podcast text:", error.message);
    throw error;
  }
};

// Function to generate voice audio using ElevenLabs
const generateElevenLabsVoice = async (voice_id, text) => {
  const audioFilePath = `uploads/audio_${voice_id}.mp3`;

  try {
    const audioStream = await elevenlabs.generate({
      stream: true,
      voice: voice_id,
      text,
      model_id: "eleven_multilingual_v2",
    });

    const audioFile = fs.createWriteStream(audioFilePath);
    await pipelinePromise(audioStream, audioFile);
    console.log(`Audio file generated: ${audioFilePath}`);
    return audioFilePath;
  } catch (error) {
    console.error("Error generating ElevenLabs voice audio:", error.message);
    throw error;
  }
};

// Function to generate GPT voice audio
const generateGptVoice = async (text, voice) => {
  const audioFilePath = `uploads/audio_gpt_${text.substring(0, 10)}.mp3`;

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
    });

    fs.writeFileSync(audioFilePath, Buffer.from(await mp3.arrayBuffer()));
    console.log(`GPT audio generated: ${audioFilePath}`);
    return audioFilePath;
  } catch (error) {
    console.error("Error generating GPT voice audio:", error.message);
    throw error;
  }
};

// Function to parse GPT response into separate lines
const parseGptResponse = (response) => {
  return response.split("\n").filter((line) => line.trim() !== "");
};

const combineAudioFiles = async (audioFiles, outputFilePath) => {
  const outputStream = fs.createWriteStream(outputFilePath);

  for (const audioFile of audioFiles) {
    const inputStream = fs.createReadStream(audioFile);
    await new Promise((resolve, reject) => {
      inputStream.pipe(outputStream, { end: false });
      inputStream.on("end", resolve);
      inputStream.on("error", reject);
    });
  }

  outputStream.end(); // Close the output stream once all files have been processed
  console.log(`Podcast combined into: ${outputFilePath}`);
  return outputFilePath;
};

// Main function to generate a full podcast audio
const generatePodcastAudio = async (
  topic,
  numParticipants,
  useElevenLabs = true
) => {
  try {
    // Step 1: Generate podcast text using OpenAI
    const podcastText = await generatePodCast(topic, numParticipants);
    const parsedText = parseGptResponse(podcastText);

    const audioFilesPromises = parsedText.map((text, index) => {
      const voice = voiceArray[index % voiceArray.length];
      return useElevenLabs
        ? generateElevenLabsVoice(voice.voice_id, text)
        : generateGptVoice(text);
    });

    // Step 2: Generate audio for all participants
    const audioFiles = await Promise.all(audioFilesPromises);

    // Step 3: Combine audio files into a single podcast file
    const combinedAudioPath = await combineAudioFiles(
      audioFiles,
      "uploads/podcast.mp3"
    );

    return combinedAudioPath;
  } catch (error) {
    console.error("Error generating podcast audio:", error.message);
    throw error;
  }
};

// Answer a question using GPT without embeddings
const answerQuestion = async (question) => {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Answer a question" },
        { role: "user", content: question },
      ],
    });

    console.log("Answer:", response.choices[0].message.content);
  } catch (error) {
    console.error("Error answering question:", error.message);
    throw error;
  }
};
const textToMp3 = async (text, voice) => {
  const audioFilePath = `uploads/audio_${text.substring(0, 10)}.mp3`;

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
    });

    fs.writeFileSync(audioFilePath, Buffer.from(await mp3.arrayBuffer()));
    console.log(`Audio file generated: ${audioFilePath}`);
    return audioFilePath; // Return the file path
  } catch (error) {
    console.error("Error generating voice audio:", error.message);
    throw error;
  }
}; // Function to generate audio chunks from text file and combine them
const generateAudio = async (outputname = "myfile", inputFileName, voice) => {
  try {
    const maxTokens = 500;
    const text = fs.readFileSync(`documents/${inputFileName}`, "utf8");

    // Split the text into chunks
    const chunks = chunkText(text, maxTokens);

    console.log(`Number of chunks: ${chunks.length}`);

    // Generate audio files for each chunk, ensuring the order is maintained
    const audioFilesPromises = chunks.map(async (chunk, index) => {
      const audioFileName = `${index}audio_chunk_${index}.mp3`;
      console.log(
        `Generating audio for chunk ${index + 1}/${
          chunks.length
        }: ${audioFileName}`
      );
      const audioFile = await textToMp3(chunk, voice);
      if (!fs.existsSync(audioFile)) {
        console.error(`Failed to generate audio for chunk ${index + 1}`);
      }
      return audioFile;
    });

    const audioFiles = await Promise.all(audioFilesPromises);

    // Check if all audio files were generated
    const validAudioFiles = audioFiles.filter((file) => fs.existsSync(file));

    console.log(
      `Number of audio files successfully generated: ${validAudioFiles.length}`
    );

    // If not all files were generated, show a warning
    if (validAudioFiles.length !== chunks.length) {
      console.error(
        `Warning: Not all audio files were generated. Expected: ${chunks.length}, but got: ${validAudioFiles.length}`
      );
    }

    // Combine the generated audio files into one
    const combinedAudioPath = await combineAudioFiles(
      validAudioFiles,
      "uploads/" + outputname + ".mp3"
    );

    console.log(`Combined audio file created at: ${combinedAudioPath}`);
    return combinedAudioPath;
  } catch (error) {
    console.error("Error generating voice audio:", error.message);
    throw error;
  }
};

// Function to generate audio from a PDF using pdf-lib
const generateAudioFromPdf = async (pdfPath) => {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(dataBuffer);
    const pages = pdfDoc.getPages();
    let text = "";

    // Extract text from each page
    for (const page of pages) {
      text += await page
        .getTextContent()
        .then((content) => content.items.map((item) => item.str).join(" "));
    }

    // Split text into manageable chunks
    const chunks = chunkText(text);

    // Generate audio for each chunk and combine
    const audioFiles = await generateAudioChunks(chunks);
    const combinedAudioPath = await combineAudioFiles(
      audioFiles,
      "uploads/equity.mp3"
    );

    return combinedAudioPath;
  } catch (error) {
    console.error("Error generating audio from PDF:", error.message);
    throw error;
  }
};

// Function to generate audio chunks from the provided text
const generateAudioChunks = async (chunks, voice) => {
  const audioFilesPromises = chunks.map((chunk) => textToMp3(chunk, voice));
  const audioFiles = await Promise.all(audioFilesPromises);
  return audioFiles;
};

export default textToMp3;
