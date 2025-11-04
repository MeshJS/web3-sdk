export * from "./chains";
export * from "./functions";
export * from "./non-custodial";
export * from "./sdk";
export * from "./types";
export * from "./wallet-user-controlled";

// Re-export Spark utilities to avoid installing full SDK in apps
export {
  isValidSparkAddress,
  type Bech32mTokenIdentifier,
  type SparkWallet,
} from "@buildonspark/spark-sdk";
