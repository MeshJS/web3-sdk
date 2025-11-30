import { Web3Sdk } from "..";
import { decryptWithPrivateKey } from "../../functions";
import { Web3ProjectSparkWallet } from "../../types";
import { IssuerSparkWallet } from "@buildonspark/issuer-sdk";
import { v4 as uuidv4 } from "uuid";
import {
  Bech32mTokenIdentifier,
  decodeBech32mTokenIdentifier,
  encodeBech32mTokenIdentifier,
} from "@buildonspark/spark-sdk";
import { extractIdentityPublicKey } from "../../chains/spark/utils";
import { SparkFreezeResult } from "../../types/spark/dev-wallet";
import {
  TokenizationTransaction,
  TokenizationFrozenAddress,
  TokenizationPaginationInfo,
  TokenizationPolicy,
  InitWalletParams,
  CreateTokenParams,
  MintTokensParams,
  TransferTokensParams,
  BurnTokensParams,
  FreezeTokensParams,
  UnfreezeTokensParams,
  ListTransactionsParams,
  ListFrozenAddressesParams,
  ListTokenizationPoliciesParams,
} from "../../types/spark/tokenization";

export type {
  InitWalletParams,
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

/**
 * The `TokenizationSpark` class provides methods for token operations on Spark network.
 *
 * @example
 * ```typescript
 * const sdk = new Web3Sdk({ ... });
 *
 * // Create token (wallet is created automatically)
 * const { tokenId, walletId } = await sdk.tokenization.spark.createToken({
 *   tokenName: "MyToken",
 *   tokenTicker: "MTK",
 *   decimals: 8,
 *   isFreezable: true,
 * });
 *
 * // Load existing token by token ID
 * const policy = await sdk.tokenization.spark.initWallet({ tokenId: "btknrt1..." });
 *
 * // Perform token operations
 * await sdk.tokenization.spark.mintTokens({ amount: BigInt("1000000") });
 * const balance = await sdk.tokenization.spark.getTokenBalance();
 * ```
 */
export class TokenizationSpark {
  private readonly sdk: Web3Sdk;
  private wallet: IssuerSparkWallet | null = null;
  private walletInfo: Web3ProjectSparkWallet | null = null;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    this.sdk = sdk;
  }

  /**
   * Gets the current wallet ID if one is loaded.
   */
  getWalletId(): string | null {
    return this.walletInfo?.id ?? null;
  }

  /**
   * Clears the currently loaded wallet state.
   * Call this before creating a new token if you want to start fresh.
   */
  clearWallet(): void {
    this.wallet = null;
    this.walletInfo = null;
  }

  /**
   * Internal method to initialize the wallet by wallet ID.
   */
  private async initWalletByWalletId(walletId: string): Promise<void> {
    const networkParam = this.sdk.network === "mainnet" ? "mainnet" : "regtest";
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/${walletId}?chain=spark&network=${networkParam}`,
    );

    if (status !== 200) {
      throw new Error("Failed to get Spark wallet");
    }

    const walletInfo = data as Web3ProjectSparkWallet;

    if (this.sdk.privateKey === undefined) {
      throw new Error("Private key not found - required to decrypt wallet");
    }

    const mnemonic = await decryptWithPrivateKey({
      privateKey: this.sdk.privateKey,
      encryptedDataJSON: walletInfo.key,
    });

    const { wallet } = await IssuerSparkWallet.initialize({
      mnemonicOrSeed: mnemonic,
      options: { network: walletInfo.network },
    });

    this.wallet = wallet;
    this.walletInfo = walletInfo;
  }

  /**
   * Initializes the tokenization wallet by token ID.
   *
   * @param params - { tokenId } - the token ID to load
   * @returns The tokenization policy
   *
   * @example
   * ```typescript
   * // Load existing token by token ID
   * const policy = await sdk.tokenization.spark.initWallet({ tokenId: "btknrt1..." });
   *
   * // Then perform operations
   * await sdk.tokenization.spark.mintTokens({ amount: BigInt(1000) });
   * ```
   */
  async initWallet(params: InitWalletParams): Promise<TokenizationPolicy> {
    const normalizedTokenId = this.normalizeTokenId(params.tokenId);
    const policy = await this.getTokenizationPolicy(normalizedTokenId);
    await this.initWalletByWalletId(policy.walletId);
    return policy;
  }

  /**
   * Normalizes token ID to hex format.
   * If bech32m encoded (btkn1.., btknrt1.., etc), decodes to hex. Otherwise returns as-is.
   */
  private normalizeTokenId(tokenId: string): string {
    const network = this.sdk.network === "mainnet" ? "MAINNET" : "REGTEST";
    try {
      const decoded = decodeBech32mTokenIdentifier(tokenId as Bech32mTokenIdentifier, network);
      return Buffer.from(decoded.tokenIdentifier).toString("hex");
    } catch {
      return tokenId;
    }
  }

  /**
   * Creates a new token on the Spark network.
   * Automatically creates a new wallet if none is loaded.
   *
   * @param params - Token creation parameters
   * @returns Object containing txId, tokenId, and walletId
   *
   * @example
   * ```typescript
   * // Simple one-step token creation (creates wallet automatically)
   * const { tokenId, walletId } = await sdk.tokenization.spark.createToken({
   *   tokenName: "MyToken",
   *   tokenTicker: "MTK",
   *   decimals: 8,
   *   isFreezable: true,
   * });
   *
   * // Or load existing wallet first
   * await sdk.tokenization.spark.initWallet({ walletId: "existing-wallet-id" });
   * const { tokenId } = await sdk.tokenization.spark.createToken({
   *   tokenName: "MyToken",
   *   tokenTicker: "MTK",
   *   decimals: 8,
   *   isFreezable: true,
   * });
   * ```
   */
  async createToken(params: CreateTokenParams): Promise<{
    txId: string;
    tokenId: string;
    walletId: string;
  }> {
    if (!this.wallet || !this.walletInfo) {
      const { info, sparkIssuerWallet } = await this.sdk.wallet.createWallet({
        tags: ["tokenization"],
      });

      const networkParam = this.sdk.network === "mainnet" ? "MAINNET" : "REGTEST";
      this.walletInfo = {
        id: info.id,
        key: info.key,
        tags: info.tags,
        projectId: info.projectId,
        publicKey:
          networkParam === "MAINNET"
            ? info.chains.spark?.mainnetPublicKey || ""
            : info.chains.spark?.regtestPublicKey || "",
        network: networkParam,
      };
      this.wallet = sparkIssuerWallet;
    }

    const txId = await this.wallet.createToken({
      tokenName: params.tokenName,
      tokenTicker: params.tokenTicker,
      decimals: params.decimals,
      maxSupply: params.maxSupply,
      isFreezable: params.isFreezable,
    });

    const tokenMetadata = await this.wallet.getIssuerTokenMetadata();
    const tokenIdHex = Buffer.from(tokenMetadata.rawTokenIdentifier).toString("hex");
    const network = this.walletInfo.network === "MAINNET" ? "MAINNET" : "REGTEST";
    const tokenId = encodeBech32mTokenIdentifier({
      tokenIdentifier: tokenMetadata.rawTokenIdentifier,
      network,
    });

    // Save tokenization policy to database
    try {
      await this.sdk.axiosInstance.post("/api/tokenization/tokens", {
        tokenId: tokenIdHex,
        projectId: this.sdk.projectId,
        walletId: this.walletInfo.id,
        chain: "spark",
        network: this.walletInfo.network.toLowerCase(),
      });

      // Log the create transaction
      await this.logTransaction({
        txId,
        tokenId: tokenIdHex,
        walletInfo: this.walletInfo,
        type: "create",
      });
    } catch (saveError) {
      console.warn("Failed to save token to database:", saveError);
    }

    return { txId, tokenId, walletId: this.walletInfo.id };
  }

  /**
   * Mints tokens from the issuer wallet.
   * Requires initWallet() to be called first.
   *
   * @param params - Mint parameters including amount
   * @returns Transaction ID of the mint operation
   */
  async mintTokens(params: MintTokensParams): Promise<string> {
    if (!this.wallet || !this.walletInfo) {
      throw new Error("No wallet loaded. Call initWallet(walletId) first.");
    }

    const txHash = await this.wallet.mintTokens(params.amount);

    const tokenMetadata = await this.wallet.getIssuerTokenMetadata();
    const tokenId = Buffer.from(tokenMetadata.rawTokenIdentifier).toString("hex");

    await this.logTransaction({
      txId: txHash,
      tokenId,
      walletInfo: this.walletInfo,
      type: "mint",
      amount: params.amount.toString(),
    });

    return txHash;
  }

  /**
   * Gets the token balance for an issuer wallet.
   * Requires initWallet() to be called first.
   *
   * @returns Balance information
   */
  async getTokenBalance(): Promise<{ balance: string }> {
    if (!this.wallet) {
      throw new Error("No wallet loaded. Call initWallet(walletId) first.");
    }
    const result = await this.wallet.getIssuerTokenBalance();
    return { balance: result.balance.toString() };
  }

  /**
   * Gets metadata for the token created by an issuer wallet.
   * Requires initWallet() to be called first.
   *
   * @returns Token metadata
   */
  async getTokenMetadata() {
    if (!this.wallet) {
      throw new Error("No wallet loaded. Call initWallet(walletId) first.");
    }
    return await this.wallet.getIssuerTokenMetadata();
  }

  /**
   * Transfers tokens from the issuer wallet to another address.
   * Requires initWallet() to be called first.
   *
   * @param params - Transfer parameters
   * @returns Transaction ID of the transfer
   */
  async transferTokens(params: TransferTokensParams): Promise<string> {
    if (!this.wallet || !this.walletInfo) {
      throw new Error("No wallet loaded. Call initWallet(walletId) first.");
    }

    const tokenMetadata = await this.wallet.getIssuerTokenMetadata();
    const tokenId = Buffer.from(tokenMetadata.rawTokenIdentifier).toString("hex");
    const network = this.walletInfo.network === "MAINNET" ? "MAINNET" : "REGTEST";
    const bech32mTokenId = encodeBech32mTokenIdentifier({
      tokenIdentifier: tokenMetadata.rawTokenIdentifier,
      network,
    });
    const txHash = await this.wallet.transferTokens({
      tokenIdentifier: bech32mTokenId,
      tokenAmount: params.amount,
      receiverSparkAddress: params.toAddress,
    });

    const issuerAddress = await this.wallet.getSparkAddress();
    await this.logTransaction({
      txId: txHash,
      tokenId,
      walletInfo: this.walletInfo,
      type: "transfer",
      amount: params.amount.toString(),
      fromAddress: issuerAddress,
      toAddress: params.toAddress,
    });

    return txHash;
  }

  /**
   * Burns tokens permanently from circulation.
   * Requires initWallet() to be called first.
   *
   * @param params - Burn parameters
   * @returns Transaction ID of the burn operation
   */
  async burnTokens(params: BurnTokensParams): Promise<string> {
    if (!this.wallet || !this.walletInfo) {
      throw new Error("No wallet loaded. Call initWallet(walletId) first.");
    }

    const txHash = await this.wallet.burnTokens(params.amount);

    const tokenMetadata = await this.wallet.getIssuerTokenMetadata();
    const tokenId = Buffer.from(tokenMetadata.rawTokenIdentifier).toString("hex");

    await this.logTransaction({
      txId: txHash,
      tokenId,
      walletInfo: this.walletInfo,
      type: "burn",
      amount: params.amount.toString(),
    });

    return txHash;
  }

  /**
   * Freezes tokens at a specific Spark address for compliance purposes.
   * Requires initWallet() to be called first.
   *
   * @param params - Freeze parameters
   * @returns Freeze operation results
   */
  async freezeTokens(params: FreezeTokensParams): Promise<SparkFreezeResult> {
    if (!this.wallet || !this.walletInfo) {
      throw new Error("No wallet loaded. Call initWallet(walletId) first.");
    }

    const result = await this.wallet.freezeTokens(params.address);

    const tokenMetadata = await this.wallet.getIssuerTokenMetadata();
    const tokenId = Buffer.from(tokenMetadata.rawTokenIdentifier).toString("hex");

    try {
      const publicKeyHash = extractIdentityPublicKey(params.address);

      if (!publicKeyHash) {
        throw new Error(`Failed to extract public key hash from Spark address: ${params.address}`);
      }

      // Update frozen addresses table
      await this.sdk.axiosInstance.post("/api/tokenization/frozen-addresses", {
        tokenId,
        projectId: this.sdk.projectId,
        projectWalletId: this.walletInfo.id,
        chain: "spark",
        network: this.walletInfo.network.toLowerCase(),
        publicKeyHash,
        isFrozen: true,
        freezeReason: params.freezeReason || "Frozen by issuer",
        frozenAt: new Date().toISOString(),
      });

      // Log the freeze transaction
      await this.logTransaction({
        txId: uuidv4(),
        tokenId,
        walletInfo: this.walletInfo,
        type: "freeze",
        fromAddress: "Issuer Wallet",
        toAddress: params.address,
        amount: result.impactedTokenAmount.toString(),
      });
      
    } catch (saveError) {
      console.warn("Failed to save freeze operation:", saveError);
    }

    return {
      impactedOutputIds: result.impactedOutputIds,
      impactedTokenAmount: result.impactedTokenAmount.toString(),
    };
  }

  /**
   * Unfreezes tokens at a specific Spark address.
   * Requires initWallet() to be called first.
   *
   * @param params - Unfreeze parameters
   * @returns Unfreeze operation results
   */
  async unfreezeTokens(params: UnfreezeTokensParams): Promise<SparkFreezeResult> {
    if (!this.wallet || !this.walletInfo) {
      throw new Error("No wallet loaded. Call initWallet(walletId) first.");
    }

    const result = await this.wallet.unfreezeTokens(params.address);

    const tokenMetadata = await this.wallet.getIssuerTokenMetadata();
    const tokenId = Buffer.from(tokenMetadata.rawTokenIdentifier).toString("hex");

    try {
      const publicKeyHash = extractIdentityPublicKey(params.address);

      if (!publicKeyHash) {
        throw new Error(`Failed to extract public key hash from Spark address: ${params.address}`);
      }

      // Update frozen addresses table
      await this.sdk.axiosInstance.put("/api/tokenization/frozen-addresses", {
        tokenId,
        publicKeyHash,
        projectId: this.sdk.projectId,
        projectWalletId: this.walletInfo.id,
      });

      // Log the unfreeze transaction
      await this.logTransaction({
        txId: uuidv4(),
        tokenId,
        walletInfo: this.walletInfo,
        type: "unfreeze",
        fromAddress: "Issuer Wallet",
        toAddress: params.address,
        amount: result.impactedTokenAmount.toString(),
      });
    } catch (saveError) {
      console.warn("Failed to save unfreeze operation:", saveError);
    }

    return {
      impactedOutputIds: result.impactedOutputIds,
      impactedTokenAmount: result.impactedTokenAmount.toString(),
    };
  }

  /**
   * Lists frozen addresses for a token from the database.
   * Requires initWallet() to be called first.
   *
   * @param params - Query parameters including pagination
   * @returns List of frozen addresses with pagination info
   */
  async getFrozenAddresses(params?: ListFrozenAddressesParams): Promise<{
    frozenAddresses: TokenizationFrozenAddress[];
    pagination: TokenizationPaginationInfo;
  }> {
    if (!this.wallet) {
      throw new Error("No wallet loaded. Call initWallet(walletId) first.");
    }

    const { includeUnfrozen = false, page = 1, limit = 15 } = params || {};

    const tokenMetadata = await this.wallet.getIssuerTokenMetadata();
    const tokenId = Buffer.from(tokenMetadata.rawTokenIdentifier).toString("hex");

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

  /**
   * Lists token transactions from the database.
   * Requires initWallet() to be called first.
   *
   * @param params - Query parameters including type filter and pagination
   * @returns List of transactions with pagination info
   */
  async getTransactions(params?: ListTransactionsParams): Promise<{
    transactions: TokenizationTransaction[];
    pagination: TokenizationPaginationInfo;
  }> {
    if (!this.wallet) {
      throw new Error("No wallet loaded. Call initWallet(walletId) first.");
    }

    const { type, page = 1, limit = 50 } = params || {};

    const tokenMetadata = await this.wallet.getIssuerTokenMetadata();
    const tokenId = Buffer.from(tokenMetadata.rawTokenIdentifier).toString("hex");

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

  /**
   * Lists tokenization policies for the current project from the database.
   *
   * @param params - Optional filter and pagination parameters
   * @returns List of tokenization policies with pagination info
   */
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

  /**
   * Gets a single tokenization policy by token ID.
   *
   * @param tokenId - The token ID to look up
   * @returns The tokenization policy
   */
  async getTokenizationPolicy(tokenId: string): Promise<TokenizationPolicy> {
    const { tokens } = await this.getTokenizationPolicies({ tokenId, limit: 1 });
    const policy = tokens[0];

    if (!policy) {
      throw new Error("Tokenization policy not found");
    }

    return policy;
  }

  /**
   * Internal helper to log token transactions to the database
   */
  private async logTransaction(params: {
    txId: string;
    tokenId: string;
    walletInfo: Web3ProjectSparkWallet;
    type: "create" | "mint" | "burn" | "transfer" | "freeze" | "unfreeze";
    amount?: string;
    fromAddress?: string;
    toAddress?: string;
    status?: string;
  }): Promise<void> {
    try {
      await this.sdk.axiosInstance.post("/api/tokenization/transactions", {
        txId: params.txId,
        tokenId: params.tokenId,
        projectId: this.sdk.projectId,
        projectWalletId: params.walletInfo.id,
        type: params.type,
        chain: "spark",
        network: params.walletInfo.network.toLowerCase(),
        amount: params.amount,
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        status: params.status || "confirmed",
      });
    } catch (error) {
      console.warn(`Failed to log ${params.type} transaction:`, error);
    }
  }
}
