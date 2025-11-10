import { Web3Sdk } from "..";
import { decryptWithPrivateKey, encryptWithPublicKey } from "../../functions";
import { Web3ProjectSparkWallet } from "../../types";
import { generateMnemonic } from "@meshsdk/common";
import { v4 as uuidv4 } from "uuid";

/**
 * SparkWalletDeveloperControlled - Manages Spark-specific developer-controlled wallets
 */
export class SparkWalletDeveloperControlled {
  readonly sdk: Web3Sdk;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    this.sdk = sdk;
  }

  /**
   * Creates a new Spark wallet associated with the current project.
   */
  async createWallet({
    tags,
    network = "REGTEST",
    purpose = "general",
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
    const mnemonic = await generateMnemonic(256);
    const encryptedMnemonic = await encryptWithPublicKey({
      publicKey: project.publicKey,
      data: mnemonic,
    });

    // Initialize Spark wallet to get address and public key
    // Dynamic import to avoid bundling Node.js dependencies
    const { SparkWallet } = await import("@buildonspark/spark-sdk");
    const { wallet: sparkWallet } = await SparkWallet.initialize({
      mnemonicOrSeed: mnemonic,
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
      purpose,
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
   * Retrieves all Spark wallets for the project
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
   * Retrieves a specific Spark wallet by ID
   */
  async getWallet(
    walletId: string,
    decryptKey = false,
  ): Promise<{
    info: Web3ProjectSparkWallet;
    wallet: any; // SparkWallet type from @buildonspark/spark-sdk
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

      // Initialize Spark wallet with decrypted mnemonic
      const { SparkWallet } = await import("@buildonspark/spark-sdk");
      const { wallet: sparkWallet } = await SparkWallet.initialize({
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
   * Get Spark wallets designated as token issuers
   */
  async getIssuerWallets(): Promise<Web3ProjectSparkWallet[]> {
    return this.getWalletsByTag("spark-issuer");
  }

  /**
   * Designate a Spark wallet as a token issuer
   */
  async designateAsIssuer(walletId: string): Promise<void> {
    const { status } = await this.sdk.axiosInstance.post(
      `api/project-wallet/${this.sdk.projectId}/spark/${walletId}/designate-issuer`,
    );

    if (status !== 200) {
      throw new Error("Failed to designate wallet as issuer");
    }
  }

  /**
   * Remove issuer designation from a Spark wallet
   */
  async removeIssuerDesignation(walletId: string): Promise<void> {
    const { status } = await this.sdk.axiosInstance.delete(
      `api/project-wallet/${this.sdk.projectId}/spark/${walletId}/designate-issuer`,
    );

    if (status !== 200) {
      throw new Error("Failed to remove issuer designation");
    }
  }

  /**
   * Check if project has any designated issuer wallets
   */
  async hasIssuerWallet(): Promise<{ hasIssuer: boolean; walletId?: string }> {
    const issuerWallets = await this.getIssuerWallets();
    return {
      hasIssuer: issuerWallets.length > 0,
      walletId: issuerWallets[0]?.id,
    };
  }
}