export type TransactionType =
  | "spark_transfer"
  | "lightning_payment"
  | "bitcoin_deposit"
  | "bitcoin_withdrawal"
  | "token_transfer"
  | "token_mint"
  | "token_burn"
  | "token_multi_transfer"
  | "unknown_token_op";

export type TransactionDirection =
  | "incoming"
  | "outgoing"
  | "creation"
  | "destruction"
  | "transfer"
  | "deposit"
  | "withdrawal"
  | "payment"
  | "settlement"
  | "unknown";

export type TransactionStatus =
  | "confirmed"
  | "pending"
  | "sent"
  | "failed"
  | "expired";

export type CounterpartyType = "spark" | "lightning" | "bitcoin" | "token";

export interface Counterparty {
  type: CounterpartyType;
  identifier: string;
}

export interface TokenMetadata {
  tokenIdentifier: string;
  tokenAddress: string;
  name: string;
  ticker: string;
  decimals: number;
  issuerPublicKey: string;
  maxSupply: number | null;
  isFreezable: boolean | null;
}

export interface TransactionOutput {
  address: string;
  pubkey: string;
  amount: number;
}

export interface MultiIoDetails {
  inputs: TransactionOutput[];
  outputs: TransactionOutput[];
  totalInputAmount: number;
  totalOutputAmount: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  direction: TransactionDirection;
  counterparty: Counterparty;
  tokenMetadata?: TokenMetadata;
  valueUsd: number;
  status: TransactionStatus;
  amountSats: number | null;
  tokenAmount: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  txid: string | null;
  multiIoDetails?: MultiIoDetails;
}

export interface PaginationMeta {
  totalItems: number;
  limit: number;
  offset: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  meta: PaginationMeta;
}

export interface TokenInfo {
  tokenPublicKey: string;
  tokenName: string;
  tokenTicker: string;
  decimals: string;
  maxSupply: string;
}

export interface TokenBalance {
  balance: bigint;
  tokenInfo: TokenInfo;
}

export type TokenBalances = Map<string, TokenBalance>;

export interface WalletInfo {
    sparkAddress: string;
    staticDepositAddress: string;
    publicKey: string;
    networkId: number;
}

export interface TokenBalanceWithMetadata {
    tokenIdentifier: string;
    balance: bigint;
    bech32mTokenIdentifier: string;
    metadata?: {
        name: string;
        ticker: string;
        decimals: number;
        issuerPublicKey: string;
        maxSupply: bigint | null;
        isFreezable: boolean | null;
    };
}

export interface BalanceWithMetadata {
    balance: bigint;
    tokenBalances: TokenBalanceWithMetadata[];
}

export interface SparkSignMessageResult {
  signature: Uint8Array;
}

export interface SparkTransferResult {
  txid: string;
}

export interface AddressSummary {
  sparkAddress: string;
  publicKey: string;
  balance: {
    btcSoftBalanceSats: bigint;
    btcHardBalanceSats: bigint;
    btcValueUsdHard: number;
    btcValueUsdSoft: number;
    totalTokenValueUsd: number;
  };
  totalValueUsd: number;
  transactionCount: number;
  tokenCount: number;
  tokens: Array<{
    tokenIdentifier: string;
    tokenAddress: string;
    name: string;
    ticker: string;
    decimals: number;
    balance: bigint;
    valueUsd: number;
    issuerPublicKey: string;
    maxSupply: bigint | null;
    isFreezable: boolean | null;
  }>;
}

export interface LatestTxidResponse {
  [address: string]: string | null;
}

// Types copied from @buildonspark/spark-sdk since they are currently private
// Source: https://github.com/buildonspark/spark-sdk
export enum TransferDirection {
  INCOMING = "INCOMING",
  OUTGOING = "OUTGOING",
}

export interface WalletTransfer {
  id: string;
  senderIdentityPublicKey: string;
  receiverIdentityPublicKey: string;
  status: keyof typeof TransferStatus;
  totalValue: number;
  expiryTime: Date | undefined;
  leaves: WalletTransferLeaf[];
  createdTime: Date | undefined;
  updatedTime: Date | undefined;
  type: keyof typeof TransferType;
  transferDirection: keyof typeof TransferDirection;
  userRequest: any | undefined;
}

export interface WalletTransferLeaf {
  leaf: any | undefined;
  secretCipher: string;
  signature: string;
  intermediateRefundTx: string;
}

export type SparkAddressFormat = string;

declare enum TransferStatus {
  TRANSFER_STATUS_SENDER_INITIATED = 0,
  TRANSFER_STATUS_SENDER_KEY_TWEAK_PENDING = 1,
  TRANSFER_STATUS_SENDER_KEY_TWEAKED = 2,
  TRANSFER_STATUS_RECEIVER_KEY_TWEAKED = 3,
  TRANSFER_STATUS_RECEIVER_REFUND_SIGNED = 4,
  TRANSFER_STATUS_COMPLETED = 5,
  TRANSFER_STATUS_EXPIRED = 6,
  TRANSFER_STATUS_RETURNED = 7,
  TRANSFER_STATUS_SENDER_INITIATED_COORDINATOR = 8,
  TRANSFER_STATUS_RECEIVER_KEY_TWEAK_LOCKED = 9,
  TRANSFER_STATUS_RECEIVER_KEY_TWEAK_APPLIED = 10,
  UNRECOGNIZED = -1,
}

declare enum TransferType {
  PREIMAGE_SWAP = 0,
  COOPERATIVE_EXIT = 1,
  TRANSFER = 2,
  UTXO_SWAP = 3,
  SWAP = 30,
  COUNTER_SWAP = 40,
  UNRECOGNIZED = -1,
}
