import { IssuerSparkWallet } from "@buildonspark/issuer-sdk";

/**
 * Token transaction record from database
 */
export type TokenizationTransaction = {
  id: string;
  tokenId: string;
  type: "create" | "mint" | "burn" | "transfer" | "freeze" | "unfreeze";
  chain: string;
  network: string;
  txHash?: string;
  amount?: string;
  fromAddress?: string;
  toAddress?: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

/**
 * Frozen address information from database
 */
export type TokenizationFrozenAddress = {
  id: string;
  address: string;
  publicKeyHash: string;
  stakeKeyHash?: string;
  chain: string;
  network: string;
  freezeReason?: string;
  frozenAt: string;
  createdAt: string;
};

/**
 * Pagination info for list responses
 */
export type TokenizationPaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

/**
 * Tokenization policy from database
 */
export type TokenizationPolicy = {
  tokenId: string;
  projectId: string;
  walletId: string;
  chain: string;
  network: string;
  isActive: boolean;
  createdAt: string;
};

/**
 * Parameters for initializing wallet - either by token ID or wallet ID.
 * When using walletId, you can optionally pass the wallet instance to skip decryption.
 */
export type InitWalletParams =
  | { tokenId: string }
  | { walletId: string; wallet?: IssuerSparkWallet };

/**
 * Parameters for creating a new token.
 * Requires initWallet() to be called first.
 */
export type CreateTokenParams = {
  tokenName: string;
  tokenTicker: string;
  decimals: number;
  maxSupply?: bigint;
  isFreezable: boolean;
};

/**
 * Parameters for minting tokens.
 * Requires initWallet() to be called first.
 */
export type MintTokensParams = {
  amount: bigint;
};

/**
 * Parameters for transferring tokens.
 * Requires initWallet() to be called first.
 */
export type TransferTokensParams = {
  amount: bigint;
  toAddress: string;
};

/**
 * Parameters for burning tokens.
 * Requires initWallet() to be called first.
 */
export type BurnTokensParams = {
  amount: bigint;
};

/**
 * Parameters for freezing tokens.
 * Requires initWallet() to be called first.
 */
export type FreezeTokensParams = {
  address: string;
  freezeReason?: string;
};

/**
 * Parameters for unfreezing tokens.
 * Requires initWallet() to be called first.
 */
export type UnfreezeTokensParams = {
  address: string;
};

/**
 * Parameters for listing transactions.
 * Requires initWallet() to be called first.
 */
export type ListTransactionsParams = {
  type?: "create" | "mint" | "burn" | "transfer" | "freeze" | "unfreeze";
  page?: number;
  limit?: number;
};

/**
 * Parameters for listing frozen addresses.
 * Requires initWallet() to be called first.
 */
export type ListFrozenAddressesParams = {
  includeUnfrozen?: boolean;
  page?: number;
  limit?: number;
};

/**
 * Parameters for listing tokenization policies.
 */
export type ListTokenizationPoliciesParams = {
  tokenId?: string;
  page?: number;
  limit?: number;
};
