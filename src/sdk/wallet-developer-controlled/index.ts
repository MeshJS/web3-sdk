import { Web3Sdk } from "..";
import {
  MultiChainWalletOptions,
  MultiChainWalletInfo,
  MultiChainWalletInstance,
  SupportedChain,
  NetworkId
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
    const project = await this.sdk.getProject();
    if (!project.publicKey) {
      throw new Error("Project public key not found");
    }

    const walletId = uuidv4();
    const networkId = options.networkId || 0; // Default to testnet
    const enabledChains = options.chains || ["cardano", "spark"];
    const chains: MultiChainWalletInfo['chains'] = {};

    // Generate single mnemonic for all chains
    const sharedMnemonic = MeshWallet.brew() as string[];
    const encryptedKey = await encryptWithPublicKey({
      publicKey: project.publicKey,
      data: sharedMnemonic.join(" "),
    });

    if (enabledChains.includes("cardano")) {
      const tempWallet = new MeshWallet({
        networkId: networkId,
        key: { type: "mnemonic", words: sharedMnemonic },
        fetcher: this.sdk.providerFetcher,
        submitter: this.sdk.providerSubmitter,
      });
      await tempWallet.init();

      const addresses = tempWallet.getAddresses();
      const { pubKeyHash, stakeCredentialHash } = deserializeBech32Address(addresses.baseAddressBech32!);

      chains.cardano = {
        pubKeyHash,
        stakeCredentialHash,
      };
    }

    if (enabledChains.includes("spark")) {
      const [mainnetWallet, regtestWallet] = await Promise.all([
        IssuerSparkWallet.initialize({
          mnemonicOrSeed: sharedMnemonic.join(" "),
          options: { network: "MAINNET" },
        }),
        IssuerSparkWallet.initialize({
          mnemonicOrSeed: sharedMnemonic.join(" "),
          options: { network: "REGTEST" },
        })
      ]);

      const [mainnetAddress, mainnetPublicKey, regtestAddress, regtestPublicKey] = await Promise.all([
        mainnetWallet.wallet.getSparkAddress(),
        mainnetWallet.wallet.getIdentityPublicKey(),
        regtestWallet.wallet.getSparkAddress(),
        regtestWallet.wallet.getIdentityPublicKey()
      ]);

      chains.spark = {
        mainnetPublicKey,
        mainnetAddress,
        regtestPublicKey,
        regtestAddress,
      };
    }

    const walletData = {
      id: walletId,
      projectId: this.sdk.projectId,
      tags: options.tags || [],
      key: encryptedKey,
      networkId: networkId,
      chains,
      createdAt: new Date().toISOString(),
    };

    const { data, status } = await this.sdk.axiosInstance.post(
      `api/project-wallet`,
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
   * const { sparkWallet } = await sdk.wallet.getWallet("wallet-id", 0, "spark");
   *
   * // Load all available chains
   * const { info, cardanoWallet, sparkWallet } = await sdk.wallet.getWallet("wallet-id", 0, "cardano");
   * ```
   */
  async getWallet(
    projectWalletId: string,
    networkId: NetworkId,
    chain: SupportedChain,
  ): Promise<MultiChainWalletInstance> {
    const walletInfo = await this.getProjectWallet(projectWalletId);

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

    if ((chain === "cardano" || !chain) && walletInfo.chains.cardano && sharedMnemonic) {
      const cardanoWallet = new MeshWallet({
        networkId: networkId,
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
  async getProjectWallet(walletId?: string): Promise<MultiChainWalletInfo> {
    const endpoint = walletId
      ? `api/project-wallet/${this.sdk.projectId}/${walletId}`
      : `api/project-wallet/${this.sdk.projectId}`;

    const { data, status } = await this.sdk.axiosInstance.get(endpoint);

    if (status === 200) {
      return data as MultiChainWalletInfo;
    }

    throw new Error("Project wallet not found");
  }
}
