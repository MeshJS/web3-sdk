export * from "./functions";
export * from "./sdk";
export * from "./types";
export * from "./wallet-user-controlled";
export * from "./non-custodial";
export * from "./spark";

// Re-export Spark utilities to avoid installing full SDK in apps
export { isValidSparkAddress } from "@buildonspark/spark-sdk";