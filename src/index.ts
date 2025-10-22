export * from "./functions";
export * from "./sdk";
export * from "./types";
export * from "./wallet-user-controlled";
export * from "./non-custodial";
export * from "./spark";

// Re-export Bitcoin types to avoid version conflicts
export { EmbeddedWallet } from "@meshsdk/bitcoin";
export type { TransactionPayload } from "@meshsdk/bitcoin";

// Re-export Spark utilities to avoid installing full SDK in apps
export {
  encodeSparkAddress,
  isValidSparkAddress,
} from "@buildonspark/spark-sdk";
