import { Web3Sdk } from "..";
import { Web3ProjectCardanoWallet, Web3ProjectSparkWallet } from "../../types";
import { CardanoWalletDeveloperControlled } from "./cardano";
import { SparkWalletDeveloperControlled } from "./spark";

// Export chain-specific classes
export { CardanoWalletDeveloperControlled } from "./cardano";
export { SparkWalletDeveloperControlled } from "./spark";

/**
 * The `WalletDeveloperControlled` class provides functionality for managing developer-controlled wallets
 * within a Web3 project. It orchestrates chain-specific wallet management for Cardano and Spark.
 */
export class WalletDeveloperControlled {
  readonly sdk: Web3Sdk;
  readonly cardano: CardanoWalletDeveloperControlled;
  readonly spark: SparkWalletDeveloperControlled;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    this.sdk = sdk;
    this.cardano = new CardanoWalletDeveloperControlled({ sdk });
    this.spark = new SparkWalletDeveloperControlled({ sdk });
  }

  /**
   * Creates a new wallet for the specified chain
   */
  async createWallet(
    chain: "cardano" | "spark",
    options: {
      tags?: string[];
      network?: "MAINNET" | "REGTEST"; // For Spark only
    } = {}
  ): Promise<Web3ProjectCardanoWallet | Web3ProjectSparkWallet> {
    if (chain === "cardano") {
      return this.cardano.createWallet({ tags: options.tags });
    } else if (chain === "spark") {
      return this.spark.createWallet({
        tags: options.tags,
        network: options.network,
      });
    }
    
    throw new Error(`Unsupported chain: ${chain}`);
  }

  /**
   * Get wallets for a specific chain
   */
  async getWallets(
    chain: "cardano" | "spark"
  ): Promise<Web3ProjectCardanoWallet[] | Web3ProjectSparkWallet[]> {
    if (chain === "cardano") {
      return this.cardano.getWallets();
    } else if (chain === "spark") {
      return this.spark.getWallets();
    }
    
    throw new Error(`Unsupported chain: ${chain}`);
  }

  /**
   * Get a specific wallet by ID and chain
   */
  async getWallet(
    chain: "cardano" | "spark",
    walletId: string,
    options: {
      networkId?: 0 | 1; // For Cardano only
      decryptKey?: boolean;
    } = {}
  ): Promise<any> {
    if (chain === "cardano") {
      return this.cardano.getWallet(
        walletId,
        options.networkId ?? 1,
        options.decryptKey
      );
    } else if (chain === "spark") {
      return this.spark.getWallet(walletId, options.decryptKey);
    }
    
    throw new Error(`Unsupported chain: ${chain}`);
  }

  /**
   * Get all wallets (both Cardano and Spark) for the project
   */
  async getAllWallets(): Promise<{
    cardano: Web3ProjectCardanoWallet[];
    spark: Web3ProjectSparkWallet[];
  }> {
    const [cardanoWallets, sparkWallets] = await Promise.all([
      this.cardano.getWallets(),
      this.spark.getWallets(),
    ]);

    return {
      cardano: cardanoWallets,
      spark: sparkWallets,
    };
  }

  /**
   * Get wallets by tag across all chains
   */
  async getWalletsByTag(tag: string): Promise<{
    cardano: Web3ProjectCardanoWallet[];
    spark: Web3ProjectSparkWallet[];
  }> {
    const [cardanoWallets, sparkWallets] = await Promise.all([
      this.cardano.getWalletsByTag(tag),
      this.spark.getWalletsByTag(tag),
    ]);

    return {
      cardano: cardanoWallets,
      spark: sparkWallets,
    };
  }

}
