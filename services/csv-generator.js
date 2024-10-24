const fs = require("fs");
const path = require("path");
const csvWriter = require("csv-writer").createObjectCsvWriter;

const fingerprintsDir = "./fingerprints"; // Your fingerprints folder
const outputCsv = "../woocommerce_data.csv"; // Output CSV file

const csvHeaders = [
  { id: "player", title: "Player" },
  { id: "year", title: "Year" },
  { id: "set", title: "Set" },
  { id: "cardNumber", title: "Card Number" },
  { id: "variant", title: "Variant" },
  { id: "serial", title: "Serial" },
  { id: "sku", title: "SKU" },
  { id: "tags", title: "Tags" },
  { id: "ircRarity", title: "IRC Rarity" },
  { id: "ircCondition", title: "IRC Condition" },
  { id: "ircSignificance", title: "IRC Significance" },
  { id: "ircDemand", title: "IRC Demand" },
  { id: "ircLiquidity", title: "IRC Liquidity" },
  { id: "ircForecastValue", title: "IRC Forecast Value" },
  { id: "weightedCompScore", title: "Weighted Comp Score" },
  { id: "attribute1", title: "Attribute 1" },
  { id: "attribute2", title: "Attribute 2" },
  { id: "attribute3", title: "Attribute 3" },
  { id: "mediaUrl", title: "Media URL" },
  { id: "hash", title: "Hash" },
  { id: "protocol", title: "Protocol" },
  { id: "schema", title: "Schema" },
];

const parseJsonFilesToCsv = async () => {
  const files = fs.readdirSync(fingerprintsDir);

  const records = files.map((file) => {
    const filePath = path.join(fingerprintsDir, file);
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf8"));

    return {
      player:
        jsonData.uniqueCardDetails?.player ||
        jsonData.cardDetails?.player ||
        "",
      year:
        jsonData.uniqueCardDetails?.year || jsonData.cardDetails?.year || "",
      set: jsonData.uniqueCardDetails?.set || jsonData.cardDetails?.set || "",
      cardNumber: jsonData.uniqueCardDetails?.cardNumber || "",
      variant: jsonData.uniqueCardDetails?.variant || "",
      serial: jsonData.uniqueCardDetails?.serial || "",
      sku: jsonData.cardDetails?.sku || jsonData.sku || "",
      tags: jsonData.cardDetails?.tags || "",
      ircRarity: jsonData.cardDetails?.ircRarity || "",
      ircCondition: jsonData.cardDetails?.ircCondition || "",
      ircSignificance: jsonData.cardDetails?.ircSignificance || "",
      ircDemand: jsonData.cardDetails?.ircDemand || "",
      ircLiquidity: jsonData.cardDetails?.ircLiquidity || "",
      ircForecastValue: jsonData.cardDetails?.ircForecastValue || "",
      weightedCompScore: jsonData.cardDetails?.weightedCompScore || "",
      attribute1: jsonData.cardDetails?.attribute1 || "",
      attribute2: jsonData.cardDetails?.attribute2 || "",
      attribute3: jsonData.cardDetails?.attribute3 || "",
      mediaUrl: jsonData.mediaUrl || "",
      hash: jsonData.hash || "",
      protocol: jsonData.protocol || "",
      schema: jsonData.schema || "",
    };
  });

  const writer = csvWriter({ path: outputCsv, header: csvHeaders });
  await writer.writeRecords(records);

  console.log(`CSV file successfully created at: ${outputCsv}`);
};

parseJsonFilesToCsv().catch((err) =>
  console.error("Error processing files:", err)
);
