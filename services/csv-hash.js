const fs = require("fs");
const crypto = require("crypto");
const csvParser = require("csv-parser");
const path = require("path");
const { promises: fsPromises } = require("fs");

// Helper function to ensure a directory exists
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
  }
}

// Helper function to sanitize names (lowercase, replace spaces with underscores, remove non-alphanumeric characters)
function sanitizeName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ") // Replace spaces with underscores
    .replace(/[^a-z0-9_]/g, ""); // Remove special characters
}
// Ensure the necessary directories exist
ensureDirectoryExists("./fingerprints");
ensureDirectoryExists("./csv");

// Function to create a SHA-256 hash for the card details
function generateHash(cardDetails) {
  return crypto.createHash("sha256").update(cardDetails).digest("hex");
}

// Function to write the card details and hash to a JSON file asynchronously
async function writeFingerprint(hash, data) {
  const filePath = path.join("fingerprints", `${hash}.json`);
  await fsPromises.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Helper function to clean and sanitize field values
function cleanField(value) {
  return value ? value.trim() : ""; // Keep empty strings if undefined
}

// Helper function to process the 'Tags' field
function processTags(tags) {
  if (typeof tags === "string") {
    // Assuming tags are delimited by commas in the string, split and trim
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .join(", ");
  } else if (Array.isArray(tags)) {
    // If it's already an array, join the elements
    return tags.join(", ");
  }
  return cleanField(tags); // Fallback in case it's neither an array nor a string
}

// Read and parse the CSV file
const statCsv = () => {
  fs.createReadStream("./csv/cardshares.csv")
    .pipe(csvParser())
    .on("data", async (row) => {
      // Clean the row fields (remove extra spaces from values)
      const player = cleanField(row["Player "]);
      const year = cleanField(row["Year"]);
      const team = cleanField(row["Team"]);
      const set = cleanField(row["Set "]);
      const cardNumber = cleanField(row["Card #"]);
      const variant = cleanField(row["Variant"]);
      const serial = cleanField(row["Serial"]);
      const tags = processTags(row["Tags"]); // Process tags as a delimited string or array
      const sku = cleanField(row["SKU"]);
      const attribute1 = cleanField(row["Attribute 1"]);
      const attribute2 = cleanField(row["Attribute 2"]);
      const attribute3 = cleanField(row["Attribute 3"]);
      const attribute4 = cleanField(row["Attribute 4"]);
      const ircRarity = cleanField(row["IRC: Rarity"]);
      const ircCondition = cleanField(row["IRC: Condition"]);
      const ircSignificance = cleanField(row["IRC: Significance"]);
      const ircDemand = cleanField(row["IRC: Demand"]);
      const ircLiquidity = cleanField(row["IRC: Liquidity"]);
      const ircForecastValue = cleanField(row["IRC: Forecast Value"]);
      const weightedCompScore = cleanField(row["Weighted Comp Score"]);

      let data = {
        player,
        year,
        team,
        set,
        variant,
        serial,
        tags,
        sku,
        ircRarity,
        ircCondition,
        ircSignificance,
        ircDemand,
        ircLiquidity,
        ircForecastValue,
        weightedCompScore,
        attribute1,
        attribute2,
        attribute3,
        attribute4,
      };
      // remove empty values from the data object
      data = Object.keys(data).reduce((acc, key) => {
        if (data[key]) {
          acc[key] = data[key].toLowerCase();
        }
        return acc;
      }, {});

      let uniqueCardDetailsObject = {
        player,
        year,
        set,
        cardNumber,
        variant,
        serial,
      };
      //remove empty values from the uniqueCardDetailsObject
      uniqueCardDetailsObject = Object.keys(uniqueCardDetailsObject).reduce(
        (acc, key) => {
          if (uniqueCardDetailsObject[key]) {
            acc[key] = uniqueCardDetailsObject[key];
          }
          return acc;
        },
        {}
      );

      const cardHash = generateHash(JSON.stringify(uniqueCardDetailsObject));

      const object = {
        protocol: "0.1",
        schema: "{player, year, set, cardNumber, variant, serial}",
        hash: cardHash,
        uniqueCardDetails: uniqueCardDetailsObject,
        cardDetails: data,
        player: player,
        year: year,
        sku: sku,
        mediaUrl: "",
      };

      // Asynchronously write the card details and hash to a file
      try {
        await writeFingerprint(cardHash, object);
        console.log(`Processed: ${cardNumber}`);
      } catch (error) {
        console.error(`Error writing file for card #${cardNumber}:`, error);
      }
    })
    .on("end", () => {
      console.log("CSV file successfully processed and hashed.");
    })
    .on("error", (error) => {
      console.error("Error processing the CSV file:", error);
    });
};

// statCsv();

module.exports = { statCsv };
