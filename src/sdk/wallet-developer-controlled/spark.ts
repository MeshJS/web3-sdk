import { Web3Sdk } from "..";
import { decryptWithPrivateKey, encryptWithPublicKey } from "../../functions";
import { Web3ProjectSparkWallet } from "../../types";
import { generateMnemonic } from "@meshsdk/common";
import { v4 as uuidv4 } from "uuid";
import { IssuerSparkWallet, IssuerTokenMetadata } from "@buildonspark/issuer-sdk";
import { bitcoin, EmbeddedWallet } from "@meshsdk/bitcoin";
import { Bech32mTokenIdentifier } from "@buildonspark/spark-sdk";

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
   * @param params.purpose - Purpose of the wallet (legacy parameter, not used)
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
    purpose?: "tokenization" | "general";
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
    params: {
      tokenName: string;
      tokenTicker: string;
      decimals: number;
      maxSupply?: string;
      isFreezable: boolean;
    }
  ): Promise<{ transactionId: string }> {
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
   * Mints tokens to the issuer wallet address.
   * 
   * @param walletId - The ID of the issuer wallet to mint tokens to
   * @param params - Minting parameters
   * @param params.amount - The amount of tokens to mint (as string to handle large numbers)
   * @returns Promise that resolves to transaction information
   * 
   * @throws {Error} When token minting fails
   * 
   * @example
   * ```typescript
   * const result = await sparkWallet.mintTokens("wallet-id", {
   *   amount: "1000000"
   * });
   * console.log(`Minted tokens with transaction: ${result.transactionId}`);
   * ```
   */
  async mintTokens(
    walletId: string,
    params: {
      amount: string;
    }
  ): Promise<{ transactionId: string }> {
    const { wallet } = await this.getWallet(walletId);

    const result = await wallet.mintTokens(BigInt(params.amount));

    return {
      transactionId: result,
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
    params: {
      tokenIdentifier: Bech32mTokenIdentifier;
      amount: string;
      toAddress: string;
    }
  ): Promise<{ transactionId: string }> {
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
  async getTokenBalance(params: {
    tokenId: string;
    address: string;
  }): Promise<{ balance: string }> {
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/spark/tokens/${params.tokenId}/balance?address=${params.address}`
    );

    if (status === 200) {
      return data;
    }

    throw new Error("Failed to get token balance");
  }
}