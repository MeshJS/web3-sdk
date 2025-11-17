/**
 * Cardano-specific transaction result
 */
export interface CardanoTransactionResult {
  transactionId: string;
}

/**
 * Parameters for querying Cardano token balance
 */
export interface CardanoTokenBalanceParams {
  tokenId: string;
  address: string;
}

/**
 * Result for Cardano token balance queries
 */
export interface CardanoTokenBalanceResult {
  balance: string;
}

/**
 * Parameters for transferring Cardano tokens
 */
export interface CardanoTransferTokensParams {
  tokenId: string;
  amount: string;
  toAddress: string;
}

/**
 * Individual recipient for batch Cardano operations
 */
export interface CardanoBatchRecipient {
  address: string;
  amount: string;
}

/**
 * Parameters for batch transferring Cardano tokens
 */
export interface CardanoBatchTransferParams {
  tokenId: string;
  recipients: CardanoBatchRecipient[];
}

/**
 * Parameters for freezing Cardano tokens (CIP-113 compliance)
 */
export interface CardanoFreezeTokensParams {
  address: string;
  reason?: string;
}

/**
 * Parameters for unfreezing Cardano tokens (CIP-113 compliance)
 */
export interface CardanoUnfreezeTokensParams {
  address: string;
}

/**
 * Result for Cardano freeze/unfreeze operations (CIP-113)
 */
export interface CardanoFreezeResult {
  transactionId: string;
  impactedTokens: string[];
}

/**
 * Parameters for burning Cardano tokens
 */
export interface CardanoBurnTokensParams {
  amount: string;
}