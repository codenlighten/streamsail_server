const bsv = require("bsv");
const Mnemonic = require("bsv/mnemonic");
const sssa = require("sssa-js");

const deriveAndGenerateKeys = (path, hdPrivateKey) => {
  const derivedKey = hdPrivateKey.deriveChild(path).privateKey;
  const privateKey = bsv.PrivateKey.fromWIF(derivedKey.toWIF());
  return {
    wif: privateKey.toWIF(),
    publicKey: privateKey.toPublicKey().toString(),
    address: bsv.Address.fromPublicKey(privateKey.toPublicKey()).toString(),
  };
};
const createShares = (required, total, data) => {
  return sssa.create(required, total, data);
};

const generateUuidFromAddress = (address) => {
  // Step 1: Hash the Bitcoin address using SHA-1
  const sha1 = bsv.crypto.Hash.sha1(Buffer.from(address)).toString("hex");

  // Step 2: Convert the hash to a UUID format
  let index = 0;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = parseInt(sha1[index++], 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8; // Ensure proper bits for UUID version and variant
    return v.toString(16);
  });
};

const simpleKeys = async (m) => {
  const mnemonic = m || Mnemonic.fromRandom().toString();
  const hdPrivateKey = Mnemonic.fromString(mnemonic).toHDPrivateKey();

  const paths = {
    base: "m/44'/0'/0'/0/0",
    smartLedger: "m/44'/236'/0'/0/0",
    ordinals: "m/44'/236'/1'/0/0",
    share2earn: "m/44'/236'/99'/0/0", // Kept in original position
    paycircles: "m/44'/236'/100'/0/0",
    messaging: "m/44'/236'/101'/0/0",
    rewards: "m/44'/236'/102'/0/0", // Combines loyaltyPoints and coupons
    digitalAssets: "m/44'/236'/103'/0/0",
    tickets: "m/44'/236'/104'/0/0",
    collectibles: "m/44'/236'/105'/0/0",
    media: "m/44'/236'/106'/0/0", // Covers photos, videos, music, art, books, etc.
    contracts: "m/44'/236'/112'/0/0",
    property: "m/44'/236'/113'/0/0",
    notes: "m/44'/236'/114'/0/0",
    health: "m/44'/236'/115'/0/0",
    certificates: "m/44'/236'/116'/0/0",
    documents: "m/44'/236'/117'/0/0",
    governance: "m/44'/236'/118'/0/0",
    voting: "m/44'/236'/128'/0/0", // Logical follow-up to governance
    supplyChain: "m/44'/236'/119'/0/0",
    insurance: "m/44'/236'/121'/0/0",
    energy: "m/44'/236'/122'/0/0",
    education: "m/44'/236'/123'/0/0",
    financial: "m/44'/236'/124'/0/0",
    legal: "m/44'/236'/127'/0/0", // Legal logically fits with contracts
    intellectualProperty: "m/44'/236'/126'/0/0",
    art: "m/44'/236'/125'/0/0",
    gaming: "m/44'/236'/129'/0/0", // Entertainment-related, fits well toward the end
    miscellaneous: "m/44'/236'/130'/0/0", // State machine for smart contracts
    statemachine: "m/44'/236'/255'/0/0", // State machine for smart contracts
  };

  const masterKeys = deriveAndGenerateKeys(paths.smartLedger, hdPrivateKey);
  const shares = createShares(2, 3, mnemonic);
  console.log("Shares generated:", shares);
  const keys = {
    version: "0.1.2",
    uuid: generateUuidFromAddress(masterKeys.address),
    mnemonic: mnemonic,
    shares: shares,
    root: {
      ...deriveAndGenerateKeys(paths.base, hdPrivateKey),
      path: paths.base,
    },
    identity: {
      ...masterKeys,
      path: paths.smartLedger,
    },
    ordinals: {
      ...deriveAndGenerateKeys(paths.ordinals, hdPrivateKey),
      path: paths.ordinals,
    },
    share2earn: {
      referral: generateUuidFromAddress(
        deriveAndGenerateKeys(paths.share2earn, hdPrivateKey).address
      ),
      ...deriveAndGenerateKeys(paths.share2earn, hdPrivateKey),
      path: paths.share2earn,
    },
    paycircles: {
      ...deriveAndGenerateKeys(paths.paycircles, hdPrivateKey),
      path: paths.paycircles,
    },
    messaging: {
      ...deriveAndGenerateKeys(paths.messaging, hdPrivateKey),
      path: paths.messaging,
    },
    rewards: {
      ...deriveAndGenerateKeys(paths.rewards, hdPrivateKey),
      path: paths.rewards,
    },
    digitalAssets: {
      ...deriveAndGenerateKeys(paths.digitalAssets, hdPrivateKey),
      path: paths.digitalAssets,
    },
    tickets: {
      ...deriveAndGenerateKeys(paths.tickets, hdPrivateKey),
      path: paths.tickets,
    },
    collectibles: {
      ...deriveAndGenerateKeys(paths.collectibles, hdPrivateKey),
      path: paths.collectibles,
    },
    media: {
      ...deriveAndGenerateKeys(paths.media, hdPrivateKey),
      path: paths.media,
    },
    contracts: {
      ...deriveAndGenerateKeys(paths.contracts, hdPrivateKey),
      path: paths.contracts,
    },
    property: {
      ...deriveAndGenerateKeys(paths.property, hdPrivateKey),
      path: paths.property,
    },
    notes: {
      ...deriveAndGenerateKeys(paths.notes, hdPrivateKey),
      path: paths.notes,
    },
    health: {
      ...deriveAndGenerateKeys(paths.health, hdPrivateKey),
      path: paths.health,
    },
    certificates: {
      ...deriveAndGenerateKeys(paths.certificates, hdPrivateKey),
    },
    documents: {
      ...deriveAndGenerateKeys(paths.documents, hdPrivateKey),
    },
    governance: {
      ...deriveAndGenerateKeys(paths.governance, hdPrivateKey),
    },
    voting: {
      ...deriveAndGenerateKeys(paths.voting, hdPrivateKey),
    },
    supplyChain: {
      ...deriveAndGenerateKeys(paths.supplyChain, hdPrivateKey),
    },
    insurance: {
      ...deriveAndGenerateKeys(paths.insurance, hdPrivateKey),
    },
    energy: {
      ...deriveAndGenerateKeys(paths.energy, hdPrivateKey),
    },
    education: {
      ...deriveAndGenerateKeys(paths.education, hdPrivateKey),
    },
    financial: {
      ...deriveAndGenerateKeys(paths.financial, hdPrivateKey),
    },
    legal: {
      ...deriveAndGenerateKeys(paths.legal, hdPrivateKey),
    },
    intellectualProperty: {
      ...deriveAndGenerateKeys(paths.intellectualProperty, hdPrivateKey),
    },
    art: {
      ...deriveAndGenerateKeys(paths.art, hdPrivateKey),
    },
    gaming: {
      ...deriveAndGenerateKeys(paths.gaming, hdPrivateKey),
    },
    miscellaneous: {
      ...deriveAndGenerateKeys(paths.miscellaneous, hdPrivateKey),
    },
    statemachine: {
      ...deriveAndGenerateKeys(paths.statemachine, hdPrivateKey),
    },
  };
  console.log("Generated simple keys:", keys);
  return keys;
};
simpleKeys();
module.exports = {
  simpleKeys,
};
