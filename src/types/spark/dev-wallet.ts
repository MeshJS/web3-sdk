/**
 * Developer-controlled Spark wallet types
 *
 * Most types are re-exported from @buildonspark/spark-sdk and @buildonspark/issuer-sdk.
 * This file only contains types specific to our wrapper layer.
 */

// Re-export SDK types for convenience
export type { Bech32mTokenIdentifier } from "@buildonspark/spark-sdk";
export type { IssuerTokenMetadata } from "@buildonspark/issuer-sdk";

/**
 * Parameters for freezing tokens at a specific address.
 * Extends SDK freeze with optional reason for database tracking.
 */
export interface SparkFreezeTokensParams {
  address: string;
  /** Optional reason for freezing - stored in database for compliance tracking */
  freezeReason?: string;
}

/**
 * Parameters for unfreezing tokens at a specific address.
 */
export interface SparkUnfreezeTokensParams {
  address: string;
}

/**
 * Result for freeze/unfreeze operations.
 * Matches SDK return type but with string amounts for serialization.
 */
export interface SparkFreezeResult {
  impactedOutputIds: string[];
  impactedTokenAmount: string;
}

/**
 * Information about a frozen address stored in database.
 */
export interface SparkFrozenAddressInfo {
  address: string;
  frozenTokenAmount: string;
  freezeTransactionId?: string;
  freezeReason?: string;
  frozenAt: string;
}
