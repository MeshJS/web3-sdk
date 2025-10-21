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

export type CounterpartyType =
    | "spark"
    | "lightning"
    | "bitcoin"
    | "token";

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

export interface DepositUtxo {
    txid: string;
    vout: number;
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
}