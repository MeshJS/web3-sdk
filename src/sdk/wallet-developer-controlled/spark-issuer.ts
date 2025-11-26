import { Web3Sdk } from "..";
import { decryptWithPrivateKey } from "../../functions";
import { Web3ProjectSparkWallet } from "../../types";
import { IssuerSparkWallet } from "@buildonspark/issuer-sdk";
import { Bech32mTokenIdentifier } from "@buildonspark/spark-sdk";
import { extractIdentityPublicKey } from "../../chains/spark/utils";
import {
  SparkFreezeTokensParams,
  SparkUnfreezeTokensParams,
  SparkFreezeResult
} from "../../types/spark/dev-wallet";

/**
 * SparkWalletDeveloperControlled - Developer-controlled Spark wallet for token operations
 *
 * Provides token issuance, minting, transfer, and compliance operations on the Spark network.
 * Wraps an IssuerSparkWallet instance with database synchronization.
 *
 * @example
 * ```typescript
 * // Create wallet via SDK
 * const { sparkWallet } = await sdk.wallet.createWallet({
 *   tags: ["tokenization"]
 * });
 *
 * // Token operations
 * await sparkWallet.createToken({
 *   tokenName: "MyToken",
 *   tokenTicker: "MTK",
 *   decimals: 8,
 *   maxSupply: "1000000",
 *   isFreezable: true
 * });
 *
 * await sparkWallet.mintTokens(BigInt("1000000"));
 * const balance = await sparkWallet.getTokenBalance();
 * ```
 */
export class SparkIssuerWalletDeveloperControlled {
  readonly sdk: Web3Sdk;
  private wallet: IssuerSparkWallet | null = null;
  private walletInfo: Web3ProjectSparkWallet | null = null;

  constructor({ sdk, wallet, walletInfo }: {
    sdk: Web3Sdk;
    wallet?: IssuerSparkWallet;
    walletInfo?: Web3ProjectSparkWallet;
  }) {
    this.sdk = sdk;
    this.wallet = wallet || null;
    this.walletInfo = walletInfo || null;
  }

  /**
   * Internal method to ensure wallet is loaded
   */
  private ensureWallet(): IssuerSparkWallet {
    if (!this.wallet) {
      throw new Error("Wallet not initialized. Use sdk.wallet.createWallet() or sdk.wallet.initWallet() first.");
    }
    return this.wallet;
  }

  /**
   * Internal helper to log token transactions to the database
   */
  private async logTransaction(params: {
    tokenId: string;
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
        projectWalletId: this.walletInfo?.id,
        type: params.type,
        chain: "spark",
        network: this.walletInfo?.network.toLowerCase(),
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

  /**
   * Internal helper to get the token ID (hex) from wallet metadata
   */
  private async getTokenIdHex(): Promise<string> {
    const wallet = this.ensureWallet();
    const tokenMetadata = await wallet.getIssuerTokenMetadata();
    return Buffer.from(tokenMetadata.rawTokenIdentifier).toString("hex");
  }

  /**
   * Creates a new token on the Spark network using this wallet as the issuer.
   *
   * @param params Token creation parameters (matches IssuerSparkWallet.createToken)
   * @returns Promise resolving to the transaction ID
   * @throws Error if wallet is not initialized or token creation fails
   */
  async createToken(params: {
    tokenName: string;
    tokenTicker: string;
    decimals: number;
    maxSupply?: bigint;
    isFreezable: boolean;
  }): Promise<string> {
    const wallet = this.ensureWallet();
    const transactionId = await wallet.createToken(params);

    try {
      const tokenMetadata = await wallet.getIssuerTokenMetadata();
      const rawTokenIdHex = Buffer.from(tokenMetadata.rawTokenIdentifier).toString("hex");

      // Create tokenization policy
      await this.sdk.axiosInstance.post("/api/tokenization/tokens", {
        tokenId: rawTokenIdHex,
        projectId: this.sdk.projectId,
        walletId: this.walletInfo?.id,
        chain: "spark",
        network: this.walletInfo?.network.toLowerCase(),
      });

      // Log the create transaction
      await this.logTransaction({
        tokenId: rawTokenIdHex,
        type: "create",
        txHash: transactionId,
        metadata: {
          tokenName: params.tokenName,
          tokenTicker: params.tokenTicker,
          decimals: params.decimals,
          maxSupply: params.maxSupply?.toString(),
          isFreezable: params.isFreezable,
        },
      });
    } catch (saveError) {
      console.warn("Failed to save token to main app:", saveError);
    }

    return transactionId;
  }

  /**
   * Mints tokens from this issuer wallet.
   *
   * @param amount Amount of tokens to mint (as bigint)
   * @returns Promise resolving to the transaction ID
   * @throws Error if wallet is not initialized or minting fails
   */
  async mintTokens(amount: bigint): Promise<string> {
    const wallet = this.ensureWallet();
    const txHash = await wallet.mintTokens(amount);

    // Log the mint transaction
    const tokenId = await this.getTokenIdHex();
    await this.logTransaction({
      tokenId,
      type: "mint",
      txHash,
      amount: amount.toString(),
    });

    return txHash;
  }

  /**
   * Transfers tokens from this wallet to another Spark address.
   *
   * @param params Transfer parameters including token identifier, amount, and destination
   * @returns Promise resolving to the transaction ID
   * @throws Error if wallet is not initialized or transfer fails
   */
  async transferTokens(params: {
    tokenIdentifier: string;
    amount: bigint;
    toAddress: string;
  }): Promise<string> {
    const wallet = this.ensureWallet();
    const txHash = await wallet.transferTokens({
      tokenIdentifier: params.tokenIdentifier as Bech32mTokenIdentifier,
      tokenAmount: params.amount,
      receiverSparkAddress: params.toAddress,
    });

    // Log the transfer transaction
    const tokenId = await this.getTokenIdHex();
    const issuerAddress = await wallet.getSparkAddress();
    await this.logTransaction({
      tokenId,
      type: "transfer",
      txHash,
      amount: params.amount.toString(),
      fromAddress: issuerAddress,
      toAddress: params.toAddress,
    });

    return txHash;
  }

  /**
   * Burns tokens permanently from circulation.
   *
   * @param amount Amount of tokens to burn (as bigint)
   * @returns Promise resolving to the transaction ID
   * @throws Error if wallet is not initialized or burning fails
   */
  async burnTokens(amount: bigint): Promise<string> {
    const wallet = this.ensureWallet();
    const txHash = await wallet.burnTokens(amount);

    // Log the burn transaction
    const tokenId = await this.getTokenIdHex();
    await this.logTransaction({
      tokenId,
      type: "burn",
      txHash,
      amount: amount.toString(),
    });

    return txHash;
  }

  /**
   * Gets the token balance for this issuer wallet.
   *
   * @returns Promise resolving to balance information
   * @throws Error if wallet is not initialized
   */
  async getTokenBalance() {
    const wallet = this.ensureWallet();
    const result = await wallet.getIssuerTokenBalance();
    return { balance: result.balance.toString() };
  }

  /**
   * Gets metadata for tokens created by this issuer wallet.
   *
   * @returns Promise resolving to token metadata
   * @throws Error if wallet is not initialized
   */
  async getTokenMetadata() {
    const wallet = this.ensureWallet();
    return await wallet.getIssuerTokenMetadata();
  }

  /**
   * Freezes tokens at a specific Spark address for compliance purposes.
   *
   * @param params Freeze parameters including address and optional reason
   * @returns Promise resolving to freeze operation results
   * @throws Error if wallet is not initialized or freeze operation fails
   */
  async freezeTokens(params: SparkFreezeTokensParams): Promise<SparkFreezeResult> {
    const wallet = this.ensureWallet();
    const result = await wallet.freezeTokens(params.address);

    // Save freeze operation to database
    try {
      const tokenMetadata = await wallet.getIssuerTokenMetadata();
      const tokenId = Buffer.from(tokenMetadata.rawTokenIdentifier).toString("hex");
      const publicKeyHash = extractIdentityPublicKey(params.address);

      if (!publicKeyHash) {
        throw new Error(`Failed to extract public key hash from Spark address: ${params.address}`);
      }

      // Update frozen addresses table
      await this.sdk.axiosInstance.post("/api/tokenization/frozen-addresses", {
        tokenId,
        projectId: this.sdk.projectId,
        projectWalletId: this.walletInfo?.id,
        chain: "spark",
        network: this.walletInfo?.network.toLowerCase(),
        publicKeyHash,
        isFrozen: true,
        freezeReason: params.freezeReason || "Frozen by issuer",
        frozenAt: new Date().toISOString(),
      });

      // Log the freeze transaction
      await this.logTransaction({
        tokenId,
        type: "freeze",
        toAddress: params.address,
        amount: result.impactedTokenAmount.toString(),
        metadata: {
          freezeReason: params.freezeReason,
          impactedOutputIds: result.impactedOutputIds,
          publicKeyHash,
        },
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
   *
   * @param params Unfreeze parameters including the address to unfreeze
   * @returns Promise resolving to unfreeze operation results
   * @throws Error if wallet is not initialized or unfreeze operation fails
   */
  async unfreezeTokens(params: SparkUnfreezeTokensParams): Promise<SparkFreezeResult> {
    const wallet = this.ensureWallet();
    const result = await wallet.unfreezeTokens(params.address);

    // Update freeze status in database
    try {
      const tokenMetadata = await wallet.getIssuerTokenMetadata();
      const tokenId = Buffer.from(tokenMetadata.rawTokenIdentifier).toString("hex");
      const publicKeyHash = extractIdentityPublicKey(params.address);

      if (!publicKeyHash) {
        throw new Error(`Failed to extract public key hash from Spark address: ${params.address}`);
      }

      // Update frozen addresses table
      await this.sdk.axiosInstance.put("/api/tokenization/frozen-addresses", {
        tokenId,
        publicKeyHash,
        projectId: this.sdk.projectId,
        projectWalletId: this.walletInfo?.id,
      });

      // Log the unfreeze transaction
      await this.logTransaction({
        tokenId,
        type: "unfreeze",
        toAddress: params.address,
        amount: result.impactedTokenAmount.toString(),
        metadata: {
          impactedOutputIds: result.impactedOutputIds,
          publicKeyHash,
        },
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
   * Gets an existing Spark wallet by ID and returns a SparkWalletDeveloperControlled instance.
   *
   * @param walletId The wallet ID to retrieve
   * @returns Promise resolving to a SparkWalletDeveloperControlled instance
   *
   * @example
   * ```typescript
   * const sparkWallet = await sdk.wallet.spark.getWallet("existing-wallet-id");
   * const address = await sparkWallet.getAddress();
   * await sparkWallet.mintTokens(BigInt("1000000"));
   * ```
   */
  async getWallet(walletId: string): Promise<SparkIssuerWalletDeveloperControlled> {
    if (this.sdk.privateKey === undefined) {
      throw new Error("Private key not found - required to decrypt wallet");
    }

    const networkParam = this.sdk.network === "mainnet" ? "mainnet" : "regtest";
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/${walletId}?chain=spark&network=${networkParam}`,
    );

    if (status === 200) {
      const sparkWalletInfo = data as Web3ProjectSparkWallet;

      const mnemonic = await decryptWithPrivateKey({
        privateKey: this.sdk.privateKey,
        encryptedDataJSON: sparkWalletInfo.key,
      });

      const { wallet: issuerSparkWallet } = await IssuerSparkWallet.initialize({
        mnemonicOrSeed: mnemonic,
        options: { network: sparkWalletInfo.network },
      });

      return new SparkIssuerWalletDeveloperControlled({
        sdk: this.sdk,
        wallet: issuerSparkWallet,
        walletInfo: sparkWalletInfo
      });
    }

    throw new Error("Failed to get Spark wallet");
  }

  /**
   * Lists all Spark wallets for the current project.
   * Returns basic wallet information for selection/management purposes.
   *
   * @returns Promise resolving to array of wallet information
   *
   * @example
   * ```typescript
   * const wallets = await sdk.wallet.spark.list();
   * console.log(`Found ${wallets.length} Spark wallets:`);
   * wallets.forEach(w => console.log(`- ${w.id}: tags=[${w.tags.join(', ')}]`));
   *
   * // Load a specific wallet for operations
   * const wallet = await sdk.wallet.spark.getWallet(wallets[0].id);
   * ```
   */
  async list(): Promise<Web3ProjectSparkWallet[]> {
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/spark`,
    );

    if (status === 200) {
      return data as Web3ProjectSparkWallet[];
    }

    throw new Error("Failed to get Spark wallets");
  }

  /**
   * Gets Spark wallets filtered by tag.
   *
   * @param tag The tag to filter by
   * @returns Promise resolving to array of matching wallet information
   *
   * @example
   * ```typescript
   * const tokenizationWallets = await sdk.wallet.spark.getByTag("tokenization");
   * const wallet = await sdk.wallet.spark.getWallet(tokenizationWallets[0].id);
   * ```
   */
  async getByTag(tag: string): Promise<Web3ProjectSparkWallet[]> {
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/spark/tag/${tag}`,
    );

    if (status === 200) {
      return data as Web3ProjectSparkWallet[];
    }

    throw new Error("Failed to get Spark wallets by tag");
  }
}