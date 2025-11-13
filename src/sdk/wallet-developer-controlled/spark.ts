import { Web3Sdk } from "..";
import { decryptWithPrivateKey, encryptWithPublicKey } from "../../functions";
import { Web3ProjectSparkWallet } from "../../types";
import { generateMnemonic } from "@meshsdk/common";
import { v4 as uuidv4 } from "uuid";
import { IssuerSparkWallet, IssuerTokenMetadata } from "@buildonspark/issuer-sdk";
import { bitcoin, EmbeddedWallet } from "@meshsdk/bitcoin";
import { Bech32mTokenIdentifier } from "@buildonspark/spark-sdk";
import {
  SparkTokenCreationParams,
  SparkMintTokensParams,
  SparkBatchMintParams,
  SparkTransferTokensParams,
  SparkTokenBalanceParams,
  SparkFreezeTokensParams,
  SparkUnfreezeTokensParams,
  SparkTransactionResult,
  SparkBatchMintResult,
  SparkTokenBalanceResult,
  SparkFreezeResult,
  SparkFrozenAddressesResult,
  PaginationParams,
} from "../../types/spark/dev-wallet";

/**
 * SparkWalletDeveloperControlled - Manages Spark-specific developer-controlled wallets
 *
 * This class provides functionality for managing developer-controlled Spark wallets,
 * including wallet creation, token operations, and issuer wallet management.
 *
 * @example
 * ```typescript
 * const sparkWallet = sdk.wallet.spark;
 * const wallet = await sparkWallet.createWallet({ tags: ["my-wallet"] });
 * const tokenResult = await sparkWallet.createToken(wallet.id, {
 *   tokenName: "MyToken",
 *   tokenTicker: "MTK",
 *   decimals: 8,
 *   maxSupply: "1000000",
 *   isFreezable: true
 * });
 * ```
 */
export class SparkWalletDeveloperControlled {
  readonly sdk: Web3Sdk;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    this.sdk = sdk;
  }

  /**
   * Creates a new Spark wallet associated with the current project.
   *
   * @param params - Wallet creation parameters
   * @param params.tags - Optional tags to organize the wallet
   * @param params.network - Network to create the wallet on (default: "REGTEST")
   * @returns Promise that resolves to the created Spark wallet
   *
   * @example
   * ```typescript
   * const wallet = await sparkWallet.createWallet({
   *   tags: ["tokenization", "mainnet"],
   *   network: "MAINNET"
   * });
   * ```
   */
  async createWallet({
    tags,
    network = "REGTEST",
  }: {
    tags?: string[];
    network?: "MAINNET" | "REGTEST";
  } = {}): Promise<Web3ProjectSparkWallet> {
    const project = await this.sdk.getProject();

    if (!project.publicKey) {
      throw new Error("Project public key not found");
    }

    // Generate mnemonic for Spark wallet
    const mnemonic = EmbeddedWallet.brew(256);
    const encryptedMnemonic = await encryptWithPublicKey({
      publicKey: project.publicKey,
      data: mnemonic.join(" "),
    });

    const { wallet: sparkWallet } = await IssuerSparkWallet.initialize({
      mnemonicOrSeed: mnemonic.join(" "),
      options: { network },
    });

    const sparkAddress = await sparkWallet.getSparkAddress();
    const publicKey = await sparkWallet.getIdentityPublicKey();

    const web3Wallet: Web3ProjectSparkWallet = {
      id: uuidv4(),
      key: encryptedMnemonic,
      tags: tags || [],
      projectId: this.sdk.projectId,
      sparkAddress,
      publicKey,
      network,
    };

    const { data, status } = await this.sdk.axiosInstance.post(
      `api/project-wallet/spark`,
      web3Wallet,
    );

    if (status === 200) {
      return data as Web3ProjectSparkWallet;
    }

    throw new Error("Failed to create Spark wallet");
  }

  /**
   * Retrieves all Spark wallets for the current project.
   *
   * @returns Promise that resolves to an array of all Spark wallets in the project
   *
   * @example
   * ```typescript
   * const wallets = await sparkWallet.getWallets();
   * console.log(`Found ${wallets.length} Spark wallets`);
   * ```
   */
  async getWallets(): Promise<Web3ProjectSparkWallet[]> {
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/spark`,
    );

    if (status === 200) {
      return data as Web3ProjectSparkWallet[];
    }

    throw new Error("Failed to get Spark wallets");
  }

  /**
   * Retrieves a specific Spark wallet by ID and creates a wallet instance.
   *
   * @param walletId - The unique identifier of the wallet to retrieve
   * @param decryptKey - Whether to decrypt and return the mnemonic key (default: false)
   * @returns Promise that resolves to wallet info and initialized IssuerSparkWallet instance
   *
   * @throws {Error} When private key is not found or wallet retrieval fails
   *
   * @example
   * ```typescript
   * const { info, wallet } = await sparkWallet.getWallet("wallet-id-123");
   * const address = await wallet.getSparkAddress();
   * ```
   */
  async getWallet(
    walletId: string,
    decryptKey = false,
  ): Promise<{
    info: Web3ProjectSparkWallet;
    wallet: IssuerSparkWallet;
  }> {
    if (this.sdk.privateKey === undefined) {
      throw new Error("Private key not found");
    }

    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/spark/${walletId}`,
    );

    if (status === 200) {
      const web3Wallet = data as Web3ProjectSparkWallet;

      const mnemonic = await decryptWithPrivateKey({
        privateKey: this.sdk.privateKey,
        encryptedDataJSON: web3Wallet.key,
      });

      if (decryptKey) {
        web3Wallet.key = mnemonic;
      }

      const { wallet: sparkWallet } = await IssuerSparkWallet.initialize({
        mnemonicOrSeed: mnemonic,
        options: { network: web3Wallet.network },
      });

      return { info: web3Wallet, wallet: sparkWallet };
    }

    throw new Error("Failed to get Spark wallet");
  }

  /**
   * Get Spark wallets by tag
   */
  async getWalletsByTag(tag: string): Promise<Web3ProjectSparkWallet[]> {
    if (this.sdk.privateKey === undefined) {
      throw new Error("Private key not found");
    }

    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/spark/tag/${tag}`,
    );

    if (status === 200) {
      return data as Web3ProjectSparkWallet[];
    }

    throw new Error("Failed to get Spark wallets by tag");
  }

  /**
   * Get token metadata for tokens created by a specific issuer wallet.
   *
   * @param walletId - The ID of the issuer wallet to get token metadata for
   * @returns Promise that resolves to token metadata information
   *
   * @throws {Error} When token metadata retrieval fails
   *
   * @example
   * ```typescript
   * const metadata = await sparkWallet.getIssuerTokenMetadata("wallet-id");
   * console.log(`Token: ${metadata.tokenName} (${metadata.tokenSymbol})`);
   * ```
   */
  async getIssuerTokenMetadata(walletId: string): Promise<IssuerTokenMetadata> {
    const { wallet } = await this.getWallet(walletId);
    return await wallet.getIssuerTokenMetadata();
  }

  /**
   * Creates a new token using a specific issuer wallet.
   *
   * @param walletId - The ID of the issuer wallet to use for token creation
   * @param params - Token creation parameters
   * @param params.tokenName - The full name of the token
   * @param params.tokenTicker - The ticker symbol for the token
   * @param params.decimals - Number of decimal places for the token
   * @param params.maxSupply - Maximum supply of tokens (optional, defaults to unlimited)
   * @param params.isFreezable - Whether token transfers can be frozen
   * @returns Promise that resolves to transaction information
   *
   * @throws {Error} When token creation fails
   *
   * @example
   * ```typescript
   * const result = await sparkWallet.createToken("wallet-id", {
   *   tokenName: "My Token",
   *   tokenTicker: "MTK",
   *   decimals: 8,
   *   maxSupply: "1000000",
   *   isFreezable: true
   * });
   * console.log(`Token created with transaction: ${result.transactionId}`);
   * ```
   */
  async createToken(
    walletId: string,
    params: SparkTokenCreationParams
  ): Promise<SparkTransactionResult> {
    const { wallet } = await this.getWallet(walletId);

    const transactionId = await wallet.createToken({
      tokenName: params.tokenName,
      tokenTicker: params.tokenTicker,
      decimals: params.decimals,
      maxSupply: params.maxSupply ? BigInt(params.maxSupply) : undefined,
      isFreezable: params.isFreezable,
    });

    return {
      transactionId,
    };
  }


  /**
   * Mints tokens to a specified address or to the issuer wallet if no address provided.
   *
   * When an address is provided, this method performs a two-step process:
   * 1. Mints tokens to the issuer wallet
   * 2. Transfers the minted tokens to the specified address
   *
   * @param walletId - The ID of the issuer wallet to mint tokens with
   * @param params - Minting parameters
   * @param params.tokenization_id - The Bech32m token identifier to mint
   * @param params.amount - The amount of tokens to mint (as string to handle large numbers)
   * @param params.address - Optional Spark address to receive tokens (defaults to issuer wallet)
   * @returns Promise that resolves to transaction information (transfer tx if address provided, mint tx otherwise)
   *
   * @throws {Error} When token minting or transfer fails
   *
   * @example
   * ```typescript
   * // Mint to issuer wallet
   * const result1 = await sparkWallet.mintTokens("wallet-id", {
   *   tokenization_id: "spark1token123...",
   *   amount: "1000000"
   * });
   *
   * // Mint and transfer to specific address (two-step process)
   * const result2 = await sparkWallet.mintTokens("wallet-id", {
   *   tokenization_id: "spark1token123...",
   *   amount: "1000000",
   *   address: "spark1recipient456..."
   * });
   * ```
   */
  async mintTokens(
    walletId: string,
    params: SparkMintTokensParams
  ): Promise<SparkTransactionResult> {
    const { wallet } = await this.getWallet(walletId);

    if (params.address) {
      // Two-step process: mint to issuer, then transfer to target address
      await wallet.mintTokens(BigInt(params.amount));
      
      // Transfer the minted tokens to the specified address
      const transferResult = await wallet.transferTokens({
        tokenIdentifier: params.tokenization_id,
        tokenAmount: BigInt(params.amount),
        receiverSparkAddress: params.address,
      });
      
      return {
        transactionId: transferResult,
      };
    } else {
      // Direct mint to issuer wallet
      const mintResult = await wallet.mintTokens(BigInt(params.amount));
      
      return {
        transactionId: mintResult,
      };
    }
  }

  /**
   * Efficiently mints tokens to multiple recipients in batch.
   *
   * This method optimizes the minting process by:
   * 1. Calculating the total amount needed for all recipients
   * 2. Performing a single mint operation to the issuer wallet
   * 3. Executing a single batch transfer to all recipients simultaneously
   *
   * @param walletId - The ID of the issuer wallet to mint tokens with
   * @param params - Batch minting parameters
   * @param params.tokenization_id - The Bech32m token identifier to mint
   * @param params.recipients - Array of recipient addresses and amounts
   * @returns Promise that resolves to mint transaction ID and batch transfer transaction ID
   *
   * @throws {Error} When token minting or batch transfer fails
   *
   * @example
   * ```typescript
   * const result = await sparkWallet.batchMintTokens("wallet-id", {
   *   tokenization_id: "spark1token123...",
   *   recipients: [
   *     { address: "spark1addr1...", amount: "1000" },
   *     { address: "spark1addr2...", amount: "2000" },
   *     { address: "spark1addr3...", amount: "500" }
   *   ]
   * });
   * console.log(`Mint tx: ${result.mintTransactionId}`);
   * console.log(`Batch transfer tx: ${result.batchTransferTransactionId}`);
   * ```
   */
  async batchMintTokens(
    walletId: string,
    params: SparkBatchMintParams
  ): Promise<SparkBatchMintResult> {
    const { wallet } = await this.getWallet(walletId);

    // Calculate total amount needed for all recipients
    const totalAmount = params.recipients.reduce(
      (sum, recipient) => sum + BigInt(recipient.amount),
      0n
    );

    const mintTransactionId = await wallet.mintTokens(totalAmount);
    const receiverOutputs = params.recipients.map(recipient => ({
      tokenIdentifier: params.tokenization_id,
      tokenAmount: BigInt(recipient.amount),
      receiverSparkAddress: recipient.address,
    }));

    const batchTransferTransactionId = await wallet.batchTransferTokens(receiverOutputs);

    return {
      mintTransactionId,
      batchTransferTransactionId,
    };
  }

  /**
   * Transfers tokens from an issuer wallet to another Spark address.
   *
   * @param walletId - The ID of the issuer wallet to transfer tokens from
   * @param params - Transfer parameters
   * @param params.tokenIdentifier - The Bech32m token identifier for the token to transfer
   * @param params.amount - The amount of tokens to transfer (as string to handle large numbers)
   * @param params.toAddress - The recipient Spark address
   * @returns Promise that resolves to transaction information
   *
   * @throws {Error} When token transfer fails
   *
   * @example
   * ```typescript
   * const result = await sparkWallet.transferTokens("wallet-id", {
   *   tokenIdentifier: "spark1abc...",
   *   amount: "100000",
   *   toAddress: "spark1def..."
   * });
   * console.log(`Transferred tokens with transaction: ${result.transactionId}`);
   * ```
   */
  async transferTokens(
    walletId: string,
    params: SparkTransferTokensParams
  ): Promise<SparkTransactionResult> {
    const { wallet } = await this.getWallet(walletId);

    const result = await wallet.transferTokens({
      tokenIdentifier: params.tokenIdentifier,
      tokenAmount: BigInt(params.amount),
      receiverSparkAddress: params.toAddress,
    });

    return {
      transactionId: result,
    };
  }

  /**
   * Retrieves metadata for tokens created by a specific issuer wallet.
   *
   * @param walletId - The ID of the issuer wallet to get token metadata for
   * @returns Promise that resolves to token metadata information
   *
   * @throws {Error} When token metadata retrieval fails
   *
   * @example
   * ```typescript
   * const metadata = await sparkWallet.getCreatedTokens("wallet-id");
   * console.log(`Token: ${metadata.tokenName} (${metadata.tokenSymbol})`);
   * ```
   */
  async getCreatedTokens(walletId: string): Promise<IssuerTokenMetadata> {
    const { wallet } = await this.getWallet(walletId);
    return await wallet.getIssuerTokenMetadata();
  }

  /**
   * Retrieves token balance for a specific address using Sparkscan API.
   *
   * @param params - Balance query parameters
   * @param params.tokenId - The token identifier to check balance for
   * @param params.address - The Spark address to check balance of
   * @returns Promise that resolves to balance information
   *
   * @throws {Error} When balance retrieval fails
   *
   * @example
   * ```typescript
   * const balance = await sparkWallet.getTokenBalance({
   *   tokenId: "spark1token123...",
   *   address: "spark1addr456..."
   * });
   * console.log(`Balance: ${balance.balance} tokens`);
   * ```
   */
  async getTokenBalance(params: SparkTokenBalanceParams): Promise<SparkTokenBalanceResult> {
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/spark/tokens/${params.tokenId}/balance?address=${params.address}`
    );

    if (status === 200) {
      return data;
    }

    throw new Error("Failed to get token balance");
  }

  /**
   * Freezes all tokens at a specific Spark address (compliance/admin control).
   *
   * This operation can only be performed by issuer wallets on freezable tokens.
   * Frozen tokens cannot be transferred until unfrozen by the issuer.
   *
   * @param walletId - The ID of the issuer wallet with freeze authority
   * @param params - Freeze parameters
   * @param params.address - The Spark address to freeze tokens at
   * @returns Promise that resolves to freeze operation details
   *
   * @throws {Error} When token freezing fails or tokens are not freezable
   *
   * @example
   * ```typescript
   * const result = await sparkWallet.freezeTokens("issuer-wallet-id", {
   *   address: "spark1suspicious123..."
   * });
   * console.log(`Frozen ${result.impactedTokenAmount} tokens at ${result.impactedOutputIds.length} outputs`);
   * ```
   */
  async freezeTokens(
    walletId: string,
    params: SparkFreezeTokensParams
  ): Promise<SparkFreezeResult> {
    const { wallet } = await this.getWallet(walletId);

    const result = await wallet.freezeTokens(params.address);

    return {
      impactedOutputIds: result.impactedOutputIds,
      impactedTokenAmount: result.impactedTokenAmount.toString(),
    };
  }

  /**
   * Unfreezes all tokens at a specific Spark address (compliance/admin control).
   *
   * This operation can only be performed by issuer wallets that previously froze the tokens.
   * Unfrozen tokens can be transferred normally again.
   *
   * @param walletId - The ID of the issuer wallet with unfreeze authority
   * @param params - Unfreeze parameters
   * @param params.address - The Spark address to unfreeze tokens at
   * @returns Promise that resolves to unfreeze operation details
   *
   * @throws {Error} When token unfreezing fails
   *
   * @example
   * ```typescript
   * const result = await sparkWallet.unfreezeTokens("issuer-wallet-id", {
   *   address: "spark1cleared123..."
   * });
   * console.log(`Unfrozen ${result.impactedTokenAmount} tokens at ${result.impactedOutputIds.length} outputs`);
   * ```
   */
  async unfreezeTokens(
    walletId: string,
    params: SparkUnfreezeTokensParams
  ): Promise<SparkFreezeResult> {
    const { wallet } = await this.getWallet(walletId);

    const result = await wallet.unfreezeTokens(params.address);

    return {
      impactedOutputIds: result.impactedOutputIds,
      impactedTokenAmount: result.impactedTokenAmount.toString(),
    };
  }

  /**
   * Retrieves frozen addresses with pagination support for administrative review.
   *
   * This method queries the backend service to get a paginated list of addresses
   * that currently have frozen tokens. Useful for compliance dashboards and admin tables.
   *
   * @param params - Optional pagination parameters
   * @param params.page - Page number to retrieve (1-based, default: 1)
   * @param params.limit - Number of items per page (default: 50)
   * @param params.offset - Number of items to skip (alternative to page)
   * @returns Promise that resolves to paginated list of frozen addresses with metadata
   *
   * @throws {Error} When frozen address query fails
   *
   * @example
   * ```typescript
   * // Get first page with default limit
   * const frozenInfo = await sparkWallet.getFrozenAddresses();
   * 
   * // Get specific page with custom limit
   * const page2 = await sparkWallet.getFrozenAddresses({ page: 2, limit: 25 });
   * 
   * // Display in admin table
   * frozenInfo.frozenAddresses.forEach(addr => {
   *   console.log(`${addr.address}: ${addr.frozenTokenAmount} tokens frozen since ${addr.frozenAt}`);
   * });
   * console.log(`Page ${frozenInfo.pagination.currentPage} of ${frozenInfo.pagination.totalPages}`);
   * ```
   */
  async getFrozenAddresses(params?: PaginationParams): Promise<SparkFrozenAddressesResult> {
    const queryParams = new URLSearchParams({
      projectId: this.sdk.projectId,
      ...(params?.page && { page: params.page.toString() }),
      ...(params?.limit && { limit: params.limit.toString() }),
      ...(params?.offset && { offset: params.offset.toString() }),
    });

    const { data, status } = await this.sdk.axiosInstance.get(
      `api/spark/frozen-addresses?${queryParams.toString()}`
    );

    if (status === 200) {
      return data as SparkFrozenAddressesResult;
    }

    throw new Error("Failed to get frozen addresses");
  }
}