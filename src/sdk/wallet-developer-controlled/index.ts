import { Web3Sdk } from "..";
import {
  MultiChainWalletOptions,
  MultiChainWalletInfo,
  MultiChainWalletInstance,
  SupportedChain
} from "../../types/core/multi-chain";
import { CardanoWalletDeveloperControlled } from "./cardano";
import { SparkWalletDeveloperControlled } from "./spark";
import { MeshWallet } from "@meshsdk/wallet";
import { IssuerSparkWallet } from "@buildonspark/issuer-sdk";
import { deserializeBech32Address } from "@meshsdk/core-cst";
import { encryptWithPublicKey, decryptWithPrivateKey } from "../../functions";
import { v4 as uuidv4 } from "uuid";
export { CardanoWalletDeveloperControlled } from "./cardano";
export { SparkWalletDeveloperControlled } from "./spark";

/**
 * The `WalletDeveloperControlled` class provides functionality for managing developer-controlled wallets
 * within a Web3 project. Supports multi-chain wallets with UTXO-native design.
 * 
 * @example
 * ```typescript
 * // Create multi-chain wallet
 * const walletInfo = await sdk.wallet.createWallet({ 
 *   tags: ["minting"], 
 *   networks: { cardano: 1, spark: 1 } 
 * });
 * 
 * // Get specific chain for performance
 * const { sparkWallet } = await sdk.wallet.getWallet(walletInfo.id, 1, "spark");
 * 
 * // Get all chains
 * const { cardanoWallet, sparkWallet } = await sdk.wallet.getWallet(walletInfo.id, 1);
 * ```
 */
export class WalletDeveloperControlled {
  readonly sdk: Web3Sdk;

  // Chain-specific handlers (public access for direct operations)
  readonly cardano: CardanoWalletDeveloperControlled;
  readonly spark: SparkWalletDeveloperControlled;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    this.sdk = sdk;
    this.cardano = new CardanoWalletDeveloperControlled({ sdk });
    this.spark = new SparkWalletDeveloperControlled({ sdk });
  }

  /**
   * Creates a new multi-chain wallet associated with the current project.
   * One wallet per project with unified ID containing all chain keys.
   * 
   * @param options - Multi-chain wallet creation options
   * @param options.tags - Optional tags to organize the wallet
   * @param options.networks - Network configuration for each chain
   * @returns Promise that resolves to multi-chain wallet information
   * 
   * @throws {Error} When wallet creation fails or project has existing wallet
   * 
   * @example
   * ```typescript
   * const wallet = await sdk.wallet.createWallet({
   *   tags: ["tokenization", "mainnet"],
   *   networkId: 1, // Single network for all chains
   *   chains: ["cardano", "spark"]
   * });
   * ```
   */
  async createWallet(options: MultiChainWalletOptions = {}): Promise<MultiChainWalletInfo> {
    // Check if project already has a wallet
    const existingWallet = await this.getProjectWallet().catch(() => null);
    if (existingWallet) {
      throw new Error("Project already has a wallet. Use getWallet() to retrieve it or add chains to existing wallet.");
    }

    const project = await this.sdk.getProject();
    if (!project.publicKey) {
      throw new Error("Project public key not found");
    }

    const walletId = uuidv4();
    const networkId = options.networkId || 1; // Default to mainnet
    const enabledChains = options.chains || ["cardano", "spark"]; // Default chains
    const chains: MultiChainWalletInfo['chains'] = {};

    // Generate single mnemonic for all chains (matches user-controlled pattern)
    const sharedMnemonic = MeshWallet.brew() as string[];
    const encryptedKey = await encryptWithPublicKey({
      publicKey: project.publicKey,
      data: sharedMnemonic.join(" "),
    });

    // Generate addresses for enabled chains using shared mnemonic and network
    if (enabledChains.includes("cardano")) {
      const tempWallet = new MeshWallet({
        networkId: networkId,
        key: { type: "mnemonic", words: sharedMnemonic },
        fetcher: this.sdk.providerFetcher,
        submitter: this.sdk.providerSubmitter,
      });
      await tempWallet.init();

      const addresses = await tempWallet.getAddresses();
      const { pubKeyHash, stakeCredentialHash } = deserializeBech32Address(addresses.baseAddressBech32!);

      chains.cardano = {
        pubKeyHash,
        stakeCredentialHash,
        address: addresses.baseAddressBech32!,
      };
    }

    if (enabledChains.includes("spark")) {
      const sparkNetwork = networkId === 1 ? "MAINNET" : "REGTEST";
      const { wallet: tempSparkWallet } = await IssuerSparkWallet.initialize({
        mnemonicOrSeed: sharedMnemonic.join(" "),
        options: { network: sparkNetwork },
      });

      const sparkAddress = await tempSparkWallet.getSparkAddress();
      const publicKey = await tempSparkWallet.getIdentityPublicKey();

      chains.spark = {
        sparkAddress,
        publicKey,
      };
    }

    // Store unified wallet in database
    const walletData = {
      id: walletId,
      projectId: this.sdk.projectId,
      tags: options.tags || [],
      key: encryptedKey, // Single shared mnemonic
      networkId: networkId, // Single network for all chains
      chains,
      createdAt: new Date().toISOString(),
    };

    const { data, status } = await this.sdk.axiosInstance.post(
      `api/project-wallet/multi-chain`,
      walletData
    );

    if (status === 200) {
      return data as MultiChainWalletInfo;
    }

    throw new Error("Failed to create multi-chain wallet");
  }

  /**
   * Retrieves a multi-chain wallet with optional chain-specific loading.
   *
   * @param walletId - The unique identifier of the wallet
   * @param networkId - Network ID (0 = testnet, 1 = mainnet)
   * @param chain - Optional specific chain to load (performance optimization)
   * @param options - Additional chain-specific options
   * @returns Promise that resolves to multi-chain wallet instance
   *
   * @example
   * ```typescript
   * // Load specific chain
   * const { sparkWallet } = await sdk.wallet.getWallet("wallet-id", "spark");
   *
   * // Load all available chains
   * const { info, cardanoWallet, sparkWallet } = await sdk.wallet.getWallet("wallet-id");
   * ```
   */
  async getWallet(
    chain?: SupportedChain,
  ): Promise<MultiChainWalletInstance> {
    const walletInfo = await this.getProjectWallet();

    const instance: MultiChainWalletInstance = {
      info: walletInfo
    };

    let sharedMnemonic: string | null = null;
    if (this.sdk.privateKey) {
      sharedMnemonic = await decryptWithPrivateKey({
        privateKey: this.sdk.privateKey,
        encryptedDataJSON: walletInfo.key,
      });
    }

    // Load requested chain or ALL available chains if no specific chain requested
    if ((chain === "cardano" || !chain) && walletInfo.chains.cardano && sharedMnemonic) {
      const cardanoWallet = new MeshWallet({
        networkId: walletInfo.networkId,
        key: { type: "mnemonic", words: sharedMnemonic.split(" ") },
        fetcher: this.sdk.providerFetcher,
        submitter: this.sdk.providerSubmitter,
      });
      await cardanoWallet.init();

      instance.cardanoWallet = cardanoWallet;
    }

    if ((chain === "spark" || !chain) && walletInfo.chains.spark && sharedMnemonic) {
      const sparkNetwork = walletInfo.networkId === 1 ? "MAINNET" : "REGTEST";
      const { wallet: sparkWallet } = await IssuerSparkWallet.initialize({
        mnemonicOrSeed: sharedMnemonic,
        options: { network: sparkNetwork },
      });

      instance.sparkWallet = sparkWallet;
    }

    return instance;
  }

  /**
   * Get the project's single multi-chain wallet
   */
  async getProjectWallet(): Promise<MultiChainWalletInfo> {
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}`
    );

    if (status === 200) {
      return data as MultiChainWalletInfo;
    }

    throw new Error("Project wallet not found");
  }

  /**
   * Helper method to check if wallet has Cardano chain
   */
  private async hasCardanoWallet(walletId: string): Promise<boolean> {
    try {
      const wallet = await this.getProjectWallet();
      return !!wallet.chains.cardano;
    } catch {
      return false;
    }
  }

  /**
   * Helper method to check if wallet has Spark chain
   */
  private async hasSparkWallet(walletId: string): Promise<boolean> {
    try {
      const wallet = await this.getProjectWallet();
      return !!wallet.chains.spark;
    } catch {
      return false;
    }
  }

}
