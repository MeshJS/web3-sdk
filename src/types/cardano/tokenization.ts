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

export type TokenizationFrozenAddress = {
  id: string;
  address: string;
  publicKeyHash: string;
  stakeKeyHash?: string;
  chain: string;
  network: string;
  isFrozen: boolean;
  freezeReason?: string;
  frozenAt: string;
  unfrozenAt?: string | null;
  createdAt: string;
};

export type TokenizationPaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type TokenizationPolicy = {
  tokenId: string;
  projectId: string;
  walletId: string;
  chain: string;
  network: string;
  isActive: boolean;
  createdAt: string;
};

export type CreateTokenParams = {
  tokenName: string;
  tokenTicker: string;
  decimals: number;
  maxSupply?: bigint;
  isFreezable: boolean;
};

export type MintTokensParams = {
  amount: bigint;
};

export type TransferTokensParams = {
  amount: bigint;
  toAddress: string;
};

export type BurnTokensParams = {
  amount: bigint;
};

export type FreezeTokensParams = {
  address: string;
  freezeReason?: string;
};

export type UnfreezeTokensParams = {
  address: string;
};

export type ListTransactionsParams = {
  type?: "create" | "mint" | "burn" | "transfer" | "freeze" | "unfreeze";
  page?: number;
  limit?: number;
};

export type ListFrozenAddressesParams = {
  includeUnfrozen?: boolean;
  page?: number;
  limit?: number;
};

export type ListTokenizationPoliciesParams = {
  tokenId?: string;
  page?: number;
  limit?: number;
};
