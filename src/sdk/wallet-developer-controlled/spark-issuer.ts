import { Web3Sdk } from "..";
import { Web3ProjectSparkWallet } from "../../types";

/**
 * SparkIssuerWalletDeveloperControlled - Developer-controlled Spark issuer wallet management
 *
 * Provides wallet management operations for Spark issuer wallets.
 * Token operations (create, mint, transfer, burn, freeze) are handled by TokenizationSpark.
 *
 * @example
 * ```typescript
 * // List all Spark wallets
 * const wallets = await sdk.wallet.sparkIssuer.list();
 *
 * // Get wallets by tag
 * const tokenizationWallets = await sdk.wallet.sparkIssuer.getByTag("tokenization");
 *
 * // Get wallet info by ID
 * const walletInfo = await sdk.wallet.sparkIssuer.get("wallet-id");
 * ```
 */
export class SparkIssuerWalletDeveloperControlled {
  readonly sdk: Web3Sdk;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    this.sdk = sdk;
  }

  /**
   * Gets wallet info by ID.
   *
   * @param walletId The wallet ID to retrieve
   * @returns Promise resolving to wallet info
   *
   * @example
   * ```typescript
   * const walletInfo = await sdk.wallet.sparkIssuer.get("existing-wallet-id");
   * ```
   */
  async get(walletId: string): Promise<Web3ProjectSparkWallet> {
    const networkParam = this.sdk.network === "mainnet" ? "mainnet" : "regtest";
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/${walletId}?chain=spark&network=${networkParam}`,
    );

    if (status === 200) {
      return data as Web3ProjectSparkWallet;
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
   * const wallets = await sdk.wallet.sparkIssuer.list();
   * console.log(`Found ${wallets.length} Spark wallets:`);
   * wallets.forEach(w => console.log(`- ${w.id}: tags=[${w.tags.join(', ')}]`));
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
   * const wallets = await sdk.wallet.sparkIssuer.getByTag("tokenization");
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