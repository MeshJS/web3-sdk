import { Bech32mTokenIdentifier } from "@buildonspark/spark-sdk";

/**
 * Enhanced minting parameters for dev-controlled wallets (extends base MintTokenParams)
 */
export interface SparkMintTokensParams {
  tokenizationId: Bech32mTokenIdentifier;
  amount: string;
  address?: string;
}

/**
 * Individual recipient for batch minting operations
 */
export interface SparkBatchRecipient {
  address: string;
  amount: string;
}

/**
 * Parameters for batch minting Spark tokens to multiple recipients
 */
export interface SparkBatchMintParams {
  tokenizationId: Bech32mTokenIdentifier;
  recipients: SparkBatchRecipient[];
}

/**
 * Parameters for transferring Spark tokens
 */
export interface SparkTransferTokensParams {
  tokenIdentifier: Bech32mTokenIdentifier;
  amount: string;
  toAddress: string;
}

/**
 * Parameters for querying token balance
 */
export interface SparkTokenBalanceParams {
  tokenId: string;
  address: string;
}

/**
 * Standard transaction result for Spark operations
 */
export interface SparkTransactionResult {
  transactionId: string;
}

/**
 * Result for batch minting operations
 */
export interface SparkBatchMintResult {
  mintTransactionId: string;
  batchTransferTransactionId: string;
}

/**
 * Result for token balance queries
 */
export interface SparkTokenBalanceResult {
  balance: string;
}

/**
 * Parameters for freezing tokens at a specific address
 */
export interface SparkFreezeTokensParams {
  address: string;
}

/**
 * Parameters for unfreezing tokens at a specific address
 */
export interface SparkUnfreezeTokensParams {
  address: string;
}

/**
 * Result for freeze/unfreeze operations
 */
export interface SparkFreezeResult {
  impactedOutputIds: string[];
  impactedTokenAmount: string;
}

/**
 * Information about a frozen address
 */
export interface SparkFrozenAddressInfo {
  address: string;
  frozenTokenAmount: string;
  freezeTransactionId?: string;
  frozenAt: string;
}

/**
 * Pagination parameters for queries
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Pagination metadata in results
 */
export interface PaginationMeta {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Result for querying frozen addresses with pagination
 */
export interface SparkFrozenAddressesResult {
  frozenAddresses: SparkFrozenAddressInfo[];
  pagination: PaginationMeta;
}