require("dotenv").config();
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { pipeline } = require("stream");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

// Promisified pipeline for handling streams
const streamPipeline = promisify(pipeline);

const spacesEndpoint = { endpoint: "https://nyc3.digitaloceanspaces.com" }; // Adjust region if necessary
const s3Client = new S3Client({
  region: "us-east-1", // Adjust the region
  credentials: {
    accessKeyId: process.env.DO_ACCESS_KEY,
    secretAccessKey: process.env.DO_SECRET_KEY,
  },
  ...spacesEndpoint,
});

// Function to list files in a folder (prefix)
async function listFilesInFolder(bucketName, folderPath) {
  try {
    const params = {
      Bucket: bucketName, // Name of your DigitalOcean Space
      Prefix: folderPath, // Path to the folder within the Space
    };

    const command = new ListObjectsV2Command(params);
    const data = await s3Client.send(command);

    if (!data.Contents || data.Contents.length === 0) {
      console.log("No files found in folder.");
      return []; // Return an empty list if no files are found
    } else {
      const fileKeys = data.Contents.map((file) => {
        const obj = {
          url: `https://aumtoken.nyc3.cdn.digitaloceanspaces.com/${file.Key}`,
          name: file.Key.split("/")[1],
        };
        return obj;
      });
      console.log("Files in folder:", fileKeys);
      return fileKeys; // Return the list of file paths
    }
  } catch (error) {
    console.error("Error fetching files:", error.message);
    throw error; // Re-throw the error to be handled by the calling function
  }
}

async function retrieveFile(bucketName, folderPath, fileName) {
  try {
    // Ensure the downloads directory exists
    const downloadDir = path.join(__dirname, "../downloads");
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const params = {
      Bucket: bucketName,
      Key: folderPath + fileName,
    };

    const command = new GetObjectCommand(params);
    const data = await s3Client.send(command);

    // Save the file to disk or process the stream
    const destinationFilePath = path.join(downloadDir, fileName);
    await streamPipeline(data.Body, fs.createWriteStream(destinationFilePath));

    console.log(
      `File ${fileName} has been successfully downloaded to ${destinationFilePath}`
    );
  } catch (error) {
    console.error("Error fetching file:", error.message);
  }
}

// Replace with your actual bucket name and folder path
const bucketName = "aumtoken";
const folderPath = "cardshares/"; // Make sure to include trailing '/'

// Function to download all files in the folder
async function downloadAllFiles() {
  try {
    const files = await listFilesInFolder(bucketName, folderPath);
    for (const file of files) {
      await retrieveFile(bucketName, folderPath, file.name);
    }
  } catch (error) {
    console.error("Error downloading all files:", error.message);
  }
}

// downloadAllFiles();

module.exports = { listFilesInFolder, retrieveFile };
