import { Web3Sdk } from "..";
import { decryptWithPrivateKey } from "../../functions";
import { Web3ProjectCardanoWallet } from "../../types";
import { MeshWallet } from "@meshsdk/wallet";
import {
  TokenizationTransaction,
  TokenizationFrozenAddress,
  TokenizationPaginationInfo,
  TokenizationPolicy,
  CreateTokenParams,
  MintTokensParams,
  TransferTokensParams,
  BurnTokensParams,
  FreezeTokensParams,
  UnfreezeTokensParams,
  ListTransactionsParams,
  ListFrozenAddressesParams,
  ListTokenizationPoliciesParams,
} from "../../types/cardano/tokenization";

export type {
  CreateTokenParams,
  MintTokensParams,
  TransferTokensParams,
  BurnTokensParams,
  FreezeTokensParams,
  UnfreezeTokensParams,
  ListTransactionsParams,
  ListFrozenAddressesParams,
  ListTokenizationPoliciesParams,
  TokenizationTransaction,
  TokenizationFrozenAddress,
  TokenizationPaginationInfo,
  TokenizationPolicy,
};

export class TokenizationCardano {
  private readonly sdk: Web3Sdk;
  private wallet: MeshWallet | null = null;
  private walletInfo: Web3ProjectCardanoWallet | null = null;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    this.sdk = sdk;
  }

  setWallet(wallet: MeshWallet, walletInfo: Web3ProjectCardanoWallet): void {
    this.wallet = wallet;
    this.walletInfo = walletInfo;
  }

  getWalletId(): string | null {
    return this.walletInfo?.id ?? null;
  }

  private async initWalletByWalletId(walletId: string): Promise<void> {
    if (this.sdk.privateKey === undefined) {
      throw new Error("Private key not found - required to decrypt wallet");
    }

    const networkParam = this.sdk.network === "mainnet" ? "mainnet" : "testnet";
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/${walletId}?chain=cardano&network=${networkParam}`,
    );

    if (status !== 200) {
      throw new Error("Failed to get Cardano wallet");
    }

    const walletInfo = data as Web3ProjectCardanoWallet;

    const mnemonic = await decryptWithPrivateKey({
      privateKey: this.sdk.privateKey,
      encryptedDataJSON: walletInfo.key,
    });

    const networkId = this.sdk.network === "mainnet" ? 1 : 0;
    const wallet = new MeshWallet({
      networkId,
      fetcher: undefined,
      submitter: undefined,
      key: {
        type: "mnemonic",
        words: mnemonic.split(" "),
      },
    });

    this.wallet = wallet;
    this.walletInfo = walletInfo;
  }

  async initWallet(tokenId: string): Promise<TokenizationPolicy> {
    const policy = await this.getTokenizationPolicy(tokenId);
    await this.initWalletByWalletId(policy.walletId);
    return policy;
  }

  async createToken(params: CreateTokenParams): Promise<{
    txId: string;
    tokenId: string;
    walletId: string;
  }> {
    if (!this.wallet || !this.walletInfo) {
      throw new Error("No wallet loaded. Use createWallet({ enableTokenization: true }) first.");
    }

    // TODO: Implement CIP113 token creation
    // 1. Create minting policy script
    // 2. Build and submit token creation transaction
    // 3. Return token ID (policy ID + asset name)
    throw new Error("Cardano token creation not yet implemented");
  }

  async mintTokens(params: MintTokensParams): Promise<string> {
    if (!this.wallet || !this.walletInfo) {
      throw new Error("No wallet loaded. Call initWallet(tokenId) first.");
    }

    // TODO: Implement CIP113 minting
    throw new Error("Cardano token minting not yet implemented");
  }

  async getTokenBalance(): Promise<{ balance: string }> {
    if (!this.wallet) {
      throw new Error("No wallet loaded. Call initWallet(tokenId) first.");
    }

    // TODO: Query UTxOs for token balance
    throw new Error("Cardano token balance query not yet implemented");
  }

  async getTokenMetadata() {
    if (!this.wallet) {
      throw new Error("No wallet loaded. Call initWallet(tokenId) first.");
    }

    // TODO: Query on-chain metadata (CIP25/CIP68)
    throw new Error("Cardano token metadata query not yet implemented");
  }

  async transferTokens(params: TransferTokensParams): Promise<string> {
    if (!this.wallet || !this.walletInfo) {
      throw new Error("No wallet loaded. Call initWallet(tokenId) first.");
    }

    // TODO: Build and submit transfer transaction
    throw new Error("Cardano token transfer not yet implemented");
  }

  async burnTokens(params: BurnTokensParams): Promise<string> {
    if (!this.wallet || !this.walletInfo) {
      throw new Error("No wallet loaded. Call initWallet(tokenId) first.");
    }

    // TODO: Build and submit burn transaction
    throw new Error("Cardano token burning not yet implemented");
  }

  async freezeTokens(params: FreezeTokensParams): Promise<{
    txId?: string;
    address: string;
  }> {
    if (!this.wallet || !this.walletInfo) {
      throw new Error("No wallet loaded. Call initWallet(tokenId) first.");
    }

    // TODO: Implement freeze logic (on-chain or off-chain)
    throw new Error("Cardano token freezing not yet implemented");
  }

  async unfreezeTokens(params: UnfreezeTokensParams): Promise<{
    txId?: string;
    address: string;
  }> {
    if (!this.wallet || !this.walletInfo) {
      throw new Error("No wallet loaded. Call initWallet(tokenId) first.");
    }

    // TODO: Implement unfreeze logic
    throw new Error("Cardano token unfreezing not yet implemented");
  }

  async getFrozenAddresses(params?: ListFrozenAddressesParams): Promise<{
    frozenAddresses: TokenizationFrozenAddress[];
    pagination: TokenizationPaginationInfo;
  }> {
    if (!this.wallet) {
      throw new Error("No wallet loaded. Call initWallet(tokenId) first.");
    }

    // TODO: Get token ID from wallet metadata
    const tokenId = "";

    const { includeUnfrozen = false, page = 1, limit = 15 } = params || {};

    const { data, status } = await this.sdk.axiosInstance.get(
      `api/tokenization/frozen-addresses`,
      {
        params: {
          tokenId,
          projectId: this.sdk.projectId,
          includeUnfrozen,
          page,
          limit,
        },
      }
    );

    if (status === 200) {
      return data as {
        frozenAddresses: TokenizationFrozenAddress[];
        pagination: TokenizationPaginationInfo;
      };
    }

    throw new Error("Failed to get frozen addresses");
  }

  async getTransactions(params?: ListTransactionsParams): Promise<{
    transactions: TokenizationTransaction[];
    pagination: TokenizationPaginationInfo;
  }> {
    if (!this.wallet) {
      throw new Error("No wallet loaded. Call initWallet(tokenId) first.");
    }

    // TODO: Get token ID from wallet metadata
    const tokenId = "";

    const { type, page = 1, limit = 50 } = params || {};

    const { data, status } = await this.sdk.axiosInstance.get(
      `api/tokenization/transactions`,
      {
        params: {
          tokenId,
          projectId: this.sdk.projectId,
          ...(type && { type }),
          page,
          limit,
        },
      }
    );

    if (status === 200) {
      return data as {
        transactions: TokenizationTransaction[];
        pagination: TokenizationPaginationInfo;
      };
    }

    throw new Error("Failed to get transactions");
  }

  async getTokenizationPolicies(params?: ListTokenizationPoliciesParams): Promise<{
    tokens: TokenizationPolicy[];
    pagination: TokenizationPaginationInfo;
  }> {
    const { tokenId, page = 1, limit = 15 } = params || {};

    const { data, status } = await this.sdk.axiosInstance.get(
      `api/tokenization/policies`,
      {
        params: {
          projectId: this.sdk.projectId,
          chain: "cardano",
          ...(tokenId && { tokenId }),
          page,
          limit,
        },
      }
    );

    if (status === 200) {
      return data as {
        tokens: TokenizationPolicy[];
        pagination: TokenizationPaginationInfo;
      };
    }

    throw new Error("Failed to get tokenization policies");
  }

  async getTokenizationPolicy(tokenId: string): Promise<TokenizationPolicy> {
    const { tokens } = await this.getTokenizationPolicies({ tokenId, limit: 1 });
    const policy = tokens[0];

    if (!policy) {
      throw new Error("Tokenization policy not found");
    }

    return policy;
  }

  private async logTransaction(params: {
    tokenId: string;
    walletInfo: Web3ProjectCardanoWallet;
    type: "create" | "mint" | "burn" | "transfer" | "freeze" | "unfreeze";
    txHash?: string;
    amount?: string;
    fromAddress?: string;
    toAddress?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.sdk.axiosInstance.post("/api/tokenization/transactions", {
        tokenId: params.tokenId,
        projectId: this.sdk.projectId,
        projectWalletId: params.walletInfo.id,
        type: params.type,
        chain: "cardano",
        network: this.sdk.network,
        txHash: params.txHash,
        amount: params.amount,
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        status: params.status || "success",
        metadata: params.metadata,
      });
    } catch (error) {
      console.warn(`Failed to log ${params.type} transaction:`, error);
    }
  }
}
