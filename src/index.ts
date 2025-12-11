export * from "./chains";
export * from "./functions";
export * from "./non-custodial";
export * from "./sdk";
export * from "./types";
export * from "./wallet-user-controlled";

// Re-export Spark utilities to avoid installing full SDK in apps
export {
  isValidSparkAddress,
  decodeSparkAddress,
  getNetworkFromSparkAddress,
  type Bech32mTokenIdentifier,
  encodeBech32mTokenIdentifier,
  decodeBech32mTokenIdentifier,
  getNetworkFromBech32mTokenIdentifier,
  SparkWallet,
} from "@buildonspark/spark-sdk";

// Re-export our own Spark utilities
export {
  extractIdentityPublicKey,
  getSparkAddressFromPubkey,
  convertLegacyToNewFormat,
} from "./chains/spark/utils";

export { type IssuerTokenMetadata } from "@buildonspark/issuer-sdk";
