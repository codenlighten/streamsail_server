require("dotenv").config();
const { registerProperty, tokenize } = require("../contract/contracts");
const base64FromUrl = require("../uploads/fileParser");
const { v4: uuidv4 } = require("uuid");
const { signData, verifySignature } = require("../crypto/cryptoFunctions");
const fetch = require("node-fetch");
const bsv = require("bsv");
const { tokens } = require("../db/mongo");
const fs = require("fs");
const _ = require("bsv/lib/util/_");

// Check if /contracts_generated folder exists, if not, create it
if (!fs.existsSync("./contracts_generated")) {
  fs.mkdirSync("./contracts_generated");
}

const apiUrl = "https://aumtoken.com/api/v1";
const apiKey = process.env.AUM_API_KEY;

// Function to generate contract for consignment
async function generateContract(cardDetails, date, userPublicKey, test = true) {
  const data = {
    cardDetails,
    date,
    userPublicKey,
    test,
  };

  try {
    const response = await fetch(`${apiUrl}/generate-contract/consignment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error generating contract:", error);
    throw error;
  }
}
//generate contract for shares(tokenization)
// body request {"cardDetails": {
// },
//   "date": "2024-09-30",
// "userPublicKey": "string",
// "sharesOwnersArray": [
//   {
//     "percentage": 0,
//     "publicKey": "string"
//   }
// ],
// "test": false}
const generateContractShares = async (
  cardDetails,
  date,
  userPublicKey,
  sharesOwnersArray,
  test = true
) => {
  const data = {
    cardDetails,
    date,
    userPublicKey,
    sharesOwnersArray,
    test,
  };

  try {
    const response = await fetch(`${apiUrl}/generate-contract/shares`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error generating contract:", error);
    throw error;
  }
};

const consignmentPublicKey =
  process.env.PLATFORM_CONSIGNMENT_PUBLICKEY || process.env.PLATFORM_PUBLICKEY;
const consignmentWif =
  process.env.PLATFORM_CONSIGNMENT_WIF || process.env.PLATFORM_WIF;
// PLATFORM_CONSIGNMENT_PROPERTY_PUBLICKEY
const consignmentPropertyPublicKey =
  process.env.PLATFORM_CONSIGNMENT_PROPERTY_PUBLICKEY ||
  process.env.PLATFORM_PROPERTY_PUBLICKEY;
const collectiblesPubKey =
  process.env.PLATFORM_CONSIGNMENT_COLLECTIBLES_PUBLICKEY;
const cardsFolder = "./fingerprints";
const contractsFolder = "./contracts_generated";
const registrationFolder = "./registrations";
const tokenizationFolder = "./tokenizations";
const generateContracts = () => {
  const cardArray = [];
  //go through all json files and pull out the card details and add to array so we can generate contracts
  const files = fs.readdirSync(cardsFolder);
  files.forEach((file) => {
    const card = JSON.parse(fs.readFileSync(`${cardsFolder}/${file}`));
    console.log(card);
    const { cardDetails, uniqueCardDetails, hash, mediaUrl } = card;
    cardArray.push({ cardDetails, uniqueCardDetails, hash, mediaUrl });
  });
  //generate contracts for each card
  cardArray.forEach((card) => {
    generateContract(
      card.uniqueCardDetails,
      new Date(),
      consignmentPublicKey,
      true
    )
      .then((response) => {
        const { contract, hash } = response;
        //format by left justifying the string based on line breaks
        const formattedContract = contract.replace(/(^\s+|\s+$)/gm, "");
        const signature = signData(formattedContract, consignmentWif);
        console.log(signature);
        const verify = verifySignature(
          formattedContract,
          signature,
          consignmentPublicKey
        );
        console.log(verify);
        // Save contract to a text file with the hash as the filename
        const filePath = `${contractsFolder}/${hash}.json`;
        fs.writeFileSync(
          filePath,
          JSON.stringify({
            contract: formattedContract,
            signature,
            cardDetails: card.uniqueCardDetails,
            hash,
            mediaUrl: card.mediaUrl,
            publicKey: consignmentPublicKey,
            propertyPubKey: consignmentPropertyPublicKey,
            collectiblesPubKey: consignmentPublicKey,
          })
        );
        console.log(`Contract saved to ${filePath}`);
      })
      .catch((error) => {
        console.error("Failed to generate and save contract:", error);
      });
  });
};

const register = async (cardDetails, mediaUrl, propertyPubKey, signature) => {
  try {
    const media = await base64FromUrl(mediaUrl);
    const uuid = uuidv4();
    const result = await registerProperty(
      propertyPubKey,
      cardDetails,
      media.base64,
      media.contentType,
      uuid,
      signature
    );
    console.log(result);
    const propertyData = JSON.stringify(cardDetails);
    // Insert token in the database
    await tokens.insertToken({
      date: new Date(),
      type: "register",
      signature,
      publicKey: propertyPubKey,
      txid: result.txid,
      propertyData: bsv.crypto.Hash.sha256(Buffer.from(propertyData)).toString(
        "hex"
      ),
      propertyPubKey,
      cardDetails,
    });

    //add to registrations folder
    const filePath = `${registrationFolder}/${result.txid}.json`;
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        date: new Date(),
        type: "register",
        signature,
        publicKey: propertyPubKey,
        txid: result.txid,
        propertyData: bsv.crypto.Hash.sha256(
          Buffer.from(propertyData)
        ).toString("hex"),
        propertyPubKey,
        cardDetails,
      })
    );
    return result;
  } catch (error) {
    console.error("Error during property registration:", error);
    throw error;
  }
};

//tokenize all registrations in registrations folder
const tokenizeAll = async () => {
  const files = fs.readdirSync(registrationFolder);
  const platformPubKey = process.env.PLATFORM_PUBLICKEY;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const registration = JSON.parse(
      fs.readFileSync(`${registrationFolder}/${file}`)
    );
    const { cardDetails, publicKey, signature, txid } = registration;

    try {
      // Find existing tokens for the txid in MongoDB
      const existingTokens =
        (await tokens.findTokens({ referenceTxid: txid })) || [];
      console.log(
        `Found ${existingTokens.length} existing tokens for txid: ${txid}`
      );
      // If there are already 5 tokens for this txid, skip tokenization
      if (existingTokens.length >= 5) {
        console.log(
          `Found ${existingTokens.length} tokens for txid: ${txid}. Skipping tokenization.`
        );
        continue;
      }

      // Determine how many more tokens need to be created
      const tokensToCreate = 5 - existingTokens.length;
      console.log(
        `Need to create ${tokensToCreate} more tokens for txid: ${txid}`
      );

      if (tokensToCreate <= 0) {
        console.log(
          `No additional tokens need to be created for txid: ${txid}`
        );
        continue;
      }

      // Proceed with tokenization to generate remaining tokens
      const result = await tokenize(
        txid,
        0,
        tokensToCreate,
        signature,
        collectiblesPubKey,
        platformPubKey
      );
      const toBeStoredInMongo = [];

      result.txidObjects.forEach((txidObject) => {
        const newEntry = {
          _id: uuidv4(), // Generate a new UUID
          date: new Date(),
          type: "tokenize",
          signature,
          pubkey: publicKey,
          txid: txidObject.txid,
          referenceTxid: txid,
          outputIndex: txidObject.outputIndex, // Fix typo (was 'outeputIndex')
          cardDetails,
        };

        toBeStoredInMongo.push(newEntry);
      });

      // Insert each token into MongoDB if it does not already exist
      for (const token of toBeStoredInMongo) {
        const existingTokenInDB = await tokens.findToken({
          txid: token.txid,
          outputIndex: token.outputIndex, // Fix typo (was 'outeputIndex')
        });
        if (!existingTokenInDB) {
          await tokens.insertToken(token);
        } else {
          console.log(
            `Token with txid ${token.txid} already exists. Skipping insert.`
          );
        }
      }

      // Store tokenization metadata into the tokenizations folder
      const filePath = `${tokenizationFolder}/${result.txid}.json`;
      fs.writeFileSync(
        filePath,
        JSON.stringify({
          date: new Date(),
          type: "tokenize",
          signature,
          pubkey: publicKey,
          txid: result.txid,
          referenceTxid: txid,
          cardDetails,
          outputIndexes: result.txidObjects.map(
            (txidObject) => txidObject.outputIndex
          ),
        })
      );

      console.log(
        `Successfully tokenized ${tokensToCreate} tokens for txid ${txid} from file ${file}`
      );
    } catch (error) {
      console.error(`Failed to tokenize registration for file ${file}:`, error);
    }

    // Wait for 10 seconds before tokenizing the next registration
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  console.log("Tokenization completed.");
};

//register all contracts in contracts_generated folder
const registerAll = async () => {
  const files = fs.readdirSync(contractsFolder);
  const toBeStoredInMongo = [];

  // Using for loop to properly handle async/await
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const contract = JSON.parse(fs.readFileSync(`${contractsFolder}/${file}`));
    const { cardDetails, mediaUrl, publicKey, signature } = contract;

    try {
      // Check if a contract with the same cardDetails already exists in MongoDB
      const existingContract = await tokens.findToken({ cardDetails });

      if (existingContract) {
        console.log(
          existingContract,
          `Duplicate found for cardDetails: ${JSON.stringify(
            cardDetails
          )}. Skipping registration.`
        );

        continue; // Skip this iteration to avoid duplicates
      }
      console.log(cardDetails);
      // If no duplicate exists, proceed with registration
      const result = await register(
        cardDetails,
        mediaUrl,
        publicKey,
        signature
      );
      toBeStoredInMongo.push(result);

      // Insert into MongoDB after successful registration
      await tokens.insertToken(result);
      //wait 10 seconds before registering the next contract
      await new Promise((resolve) => setTimeout(resolve, 10000));
      console.log(`Successfully registered contract for file ${file}`);
    } catch (error) {
      console.error(`Failed to register contract for file ${file}:`, error);
    }

    // Wait for 10 seconds before registering the next contract
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  console.log("Registration completed.");
};

//compare registration folder cardDetails to fingerprint folder uniqueCardDetails to see if any are missing or duplicates

const compareFolders = () => {
  try {
    const registrations = fs.readdirSync(registrationFolder);
    const fingerprints = fs.readdirSync(cardsFolder);

    // Create a map to store the registrations keyed by their unique card details
    const registrationMap = new Map();

    registrations.forEach((file) => {
      const registration = JSON.parse(
        fs.readFileSync(`${registrationFolder}/${file}`)
      );
      const { cardDetails } = registration;
      const cardDetailsString = JSON.stringify(cardDetails);

      // If a registration with the same card details exists, treat it as a duplicate
      if (registrationMap.has(cardDetailsString)) {
        try {
          // Remove the duplicate registration file
          fs.unlinkSync(`${registrationFolder}/${file}`);
          console.log(`Removed duplicate registration: ${file}`);
        } catch (unlinkError) {
          console.error(`Failed to delete file ${file}:`, unlinkError);
        }
      } else {
        // Store the registration file path in the map for this cardDetails
        registrationMap.set(cardDetailsString, file);
      }
    });

    // Now ensure that for every fingerprint, there's a corresponding registration
    const missingRegistrations = [];

    fingerprints.forEach((f) => {
      const fingerprint = JSON.parse(fs.readFileSync(`${cardsFolder}/${f}`));
      const cardDetailsString = JSON.stringify(fingerprint.uniqueCardDetails);

      if (!registrationMap.has(cardDetailsString)) {
        // If no registration exists for this fingerprint, log it as missing
        missingRegistrations.push(fingerprint.uniqueCardDetails);
      }
    });

    if (missingRegistrations.length > 0) {
      console.log(
        "Missing registrations for the following fingerprints:",
        missingRegistrations
      );
    } else {
      console.log("All fingerprints have a corresponding registration.");
    }

    return { missingRegistrations }; // Return the missing ones for further processing, if needed
  } catch (err) {
    console.error("Error reading files or directories:", err);
  }
};
//add registration folder to mongo if txid does not exist
async function addRegistrationsToMongo() {
  const files = fs.readdirSync(registrationFolder);
  const toBeStoredInMongo = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const registration = JSON.parse(
      fs.readFileSync(`${registrationFolder}/${file}`)
    );
    const { cardDetails, publicKey, signature, txid } = registration;

    try {
      // Check if a registration with the same txid already exists in MongoDB
      const existingRegistration = await tokens.findToken({ txid });

      if (existingRegistration) {
        console.log(
          `Duplicate found for txid: ${txid}. Skipping registration.`
        );
        continue; // Skip this iteration to avoid duplicates
      }

      // If no duplicate exists, add to the list to be stored in MongoDB
      toBeStoredInMongo.push(registration);
      console.log(`Successfully added registration for file ${file}`);
    } catch (error) {
      console.error(`Failed to add registration for file ${file}:`, error);
    }
  }

  // Insert all registrations into MongoDB after processing all files
  for (const registration of toBeStoredInMongo) {
    await tokens.insertToken(registration);
  }

  console.log("All registrations added to MongoDB.");
}

module.exports = {
  generateContracts,
  generateContract,
  generateContractShares,
  registerAll,
  tokenizeAll,
  compareFolders,
};
