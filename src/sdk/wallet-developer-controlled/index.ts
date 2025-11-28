import { Web3Sdk } from "..";
import {
  MultiChainWalletInfo,
  MultiChainWalletInstance,
  SupportedChain,
} from "../../types/core/multi-chain";
import { Web3ProjectCardanoWallet, Web3ProjectSparkWallet } from "../../types";
import { CardanoWalletDeveloperControlled } from "./cardano";
import { SparkIssuerWalletDeveloperControlled } from "./spark-issuer";
import { MeshWallet } from "@meshsdk/wallet";
import { IssuerSparkWallet } from "@buildonspark/issuer-sdk";
import { deserializeBech32Address } from "@meshsdk/core-cst";
import { encryptWithPublicKey, decryptWithPrivateKey } from "../../functions";
import { v4 as uuidv4 } from "uuid";

/**
 * The `WalletDeveloperControlled` class provides functionality for managing developer-controlled wallets
 * within a Web3 project. Supports multi-chain wallets with a shared mnemonic for Spark and Cardano.
 *
 * @example
 * ```typescript
 * // Create a new multi-chain wallet
 * const { info, sparkIssuerWallet, cardanoWallet } = await sdk.wallet.createWallet({
 *   tags: ["treasury"],
 * });
 *
 * // Load an existing wallet by ID
 * const { info, sparkWallet, cardanoWallet } = await sdk.wallet.initWallet("wallet-id");
 *
 * // Get a wallet for a specific chain
 * const { cardanoWallet } = await sdk.wallet.getWallet("wallet-id", "cardano");
 * const { sparkIssuerWallet } = await sdk.wallet.getWallet("wallet-id", "spark");
 *
 * // List all project wallets
 * const wallets = await sdk.wallet.getProjectWallets();
 * ```
 */
export class WalletDeveloperControlled {
  readonly sdk: Web3Sdk;
  cardano: CardanoWalletDeveloperControlled;
  sparkIssuer: SparkIssuerWalletDeveloperControlled;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    this.sdk = sdk;
    this.cardano = new CardanoWalletDeveloperControlled({ sdk });
    this.sparkIssuer = new SparkIssuerWalletDeveloperControlled({ sdk });
  }

  /**
   * Creates a new developer-controlled wallet with both Spark and Cardano chains using shared mnemonic.
   *
   * @param options - Wallet creation options
   * @param options.tags - Optional tags for the wallet
   * @param options.enableTokenization - If true, links the wallet to sdk.tokenization.spark for seamless token creation
   * @returns Promise that resolves to both chain wallet instances
   *
   * @example
   * ```typescript
   * // With tokenization enabled
   * const { info } = await sdk.wallet.createWallet({
   *   tags: ["tokenization"],
   *   enableTokenization: true
   * });
   *
   * // createToken works seamlessly - wallet is already linked
   * await sdk.tokenization.spark.createToken({
   *   tokenName: "MyToken",
   *   tokenTicker: "MTK",
   *   decimals: 8,
   *   isFreezable: true
   * });
   * ```
   */
  async createWallet(
    options: {
      tags?: string[];
      enableTokenization?: boolean;
    } = {},
  ): Promise<{
    info: MultiChainWalletInfo;
    sparkIssuerWallet: SparkIssuerWalletDeveloperControlled;
    cardanoWallet: MeshWallet;
  }> {
    const project = await this.sdk.getProject();
    if (!project.publicKey) {
      throw new Error("Project public key not found");
    }

    const networkId = this.sdk.network === "mainnet" ? 1 : 0;
    const walletId = uuidv4();
    const mnemonic = MeshWallet.brew() as string[];
    const encryptedKey = await encryptWithPublicKey({
      publicKey: project.publicKey,
      data: mnemonic.join(" "),
    });

    const cardanoWallet = new MeshWallet({
      networkId: networkId,
      key: { type: "mnemonic", words: mnemonic },
      fetcher: this.sdk.providerFetcher,
      submitter: this.sdk.providerSubmitter,
    });
    await cardanoWallet.init();

    const [{ wallet: sparkMainnetWallet }, { wallet: sparkRegtestWallet }] =
      await Promise.all([
        IssuerSparkWallet.initialize({
          mnemonicOrSeed: mnemonic.join(" "),
          options: { network: "MAINNET" },
        }),
        IssuerSparkWallet.initialize({
          mnemonicOrSeed: mnemonic.join(" "),
          options: { network: "REGTEST" },
        }),
      ]);

    const addresses = cardanoWallet.getAddresses();
    const { pubKeyHash, stakeCredentialHash } = deserializeBech32Address(
      addresses.baseAddressBech32!,
    );
    const [mainnetPublicKey, regtestPublicKey] = await Promise.all([
      sparkMainnetWallet.getIdentityPublicKey(),
      sparkRegtestWallet.getIdentityPublicKey(),
    ]);

    const sparkNetwork = networkId === 1 ? "MAINNET" : "REGTEST";
    const sparkWallet =
      networkId === 1 ? sparkMainnetWallet : sparkRegtestWallet;

    const walletData = {
      id: walletId,
      projectId: this.sdk.projectId,
      tags: options.tags || [],
      key: encryptedKey,
      networkId,
      chains: {
        cardano: { pubKeyHash, stakeCredentialHash },
        spark: { mainnetPublicKey, regtestPublicKey },
      },
      createdAt: new Date().toISOString(),
    };

    const { status } = await this.sdk.axiosInstance.post(
      `api/project-wallet`,
      walletData,
    );

    if (status === 200) {
      // cardanoWalletInfo prepared for future Cardano tokenization support
      const _cardanoWalletInfo: Web3ProjectCardanoWallet = {
        id: walletId,
        projectId: this.sdk.projectId,
        tags: options.tags || [],
        key: encryptedKey,
        pubKeyHash,
        stakeCredentialHash,
      };

      const sparkWalletDev = new SparkIssuerWalletDeveloperControlled({
        sdk: this.sdk,
      });

      const cardanoWalletDev = new CardanoWalletDeveloperControlled({
        sdk: this.sdk
      });

      this.sparkIssuer = sparkWalletDev;
      this.cardano = cardanoWalletDev;

      if (options.enableTokenization) {
        const sparkWalletInfo: Web3ProjectSparkWallet = {
          id: walletId,
          projectId: this.sdk.projectId,
          tags: options.tags || [],
          key: encryptedKey,
          publicKey: networkId === 1 ? mainnetPublicKey : regtestPublicKey,
          network: sparkNetwork,
        };

        this.sdk.tokenization.spark.setWallet(sparkWallet, sparkWalletInfo);
      }

      return {
        info: walletData as MultiChainWalletInfo,
        sparkIssuerWallet: sparkWalletDev,
        cardanoWallet: cardanoWallet,
      };
    }

    throw new Error("Failed to create wallet");
  }

  /**
   * Loads an existing developer-controlled wallet by ID and returns both chain instances.
   *
   * @param walletId - The wallet ID to load
   * @returns Promise that resolves to both chain wallet instances
   *
   * @example
   * ```typescript
   * const { sparkWallet, cardanoWallet } = await sdk.wallet.initWallet("wallet-id");
   *
   * // Use either wallet directly
   * await sparkWallet.mintTokens(BigInt("1000000"));
   * await cardanoWallet.sendAssets({...});
   * ```
   */
  async initWallet(walletId: string): Promise<{
    info: MultiChainWalletInfo;
    sparkWallet: SparkIssuerWalletDeveloperControlled;
    cardanoWallet: MeshWallet;
  }> {
    if (!this.sdk.privateKey) {
      throw new Error(
        "Private key required to load developer-controlled wallet",
      );
    }

    const walletInfo = await this.getProjectWallet(walletId);
    const effectiveNetworkId = this.sdk.network === "mainnet" ? 1 : 0;
    const sharedMnemonic = await decryptWithPrivateKey({
      privateKey: this.sdk.privateKey,
      encryptedDataJSON: walletInfo.key,
    });

    const cardanoWallet = new MeshWallet({
      networkId: effectiveNetworkId,
      key: { type: "mnemonic", words: sharedMnemonic.split(" ") },
      fetcher: this.sdk.providerFetcher,
      submitter: this.sdk.providerSubmitter,
    });
    await cardanoWallet.init();

    const sparkNetwork = effectiveNetworkId === 1 ? "MAINNET" : "REGTEST";
    const { wallet: sparkWallet } = await IssuerSparkWallet.initialize({
      mnemonicOrSeed: sharedMnemonic,
      options: { network: sparkNetwork },
    });

    const sparkWalletDev = new SparkIssuerWalletDeveloperControlled({
      sdk: this.sdk,
    });

    const cardanoWalletDev = new CardanoWalletDeveloperControlled({
      sdk: this.sdk
    });

    this.sparkIssuer = sparkWalletDev;
    this.cardano = cardanoWalletDev;

    return {
      info: walletInfo,
      sparkWallet: sparkWalletDev,
      cardanoWallet: cardanoWallet,
    };
  }

  /**
   * Retrieves a multi-chain wallet with optional chain-specific loading.
   *
   * @param walletId - The unique identifier of the wallet
   * @param chain - Optional specific chain to load (performance optimization)
   * @returns Promise that resolves to multi-chain wallet instance
   *
   * @example
   * ```typescript
   * // Load specific chain
   * const { sparkWallet } = await sdk.wallet.getWallet("wallet-id", "spark");
   *
   * // Load all available chains
   * const { info, cardanoWallet, sparkWallet } = await sdk.wallet.getWallet("wallet-id", "cardano");
   * ```
   */
  async getWallet(
    projectWalletId: string,
    chain: SupportedChain,
  ): Promise<MultiChainWalletInstance> {
    const walletInfo = await this.getProjectWallet(projectWalletId);

    const instance: MultiChainWalletInstance = {
      info: walletInfo,
    };

    let mnemonic: string | null = null;
    if (this.sdk.privateKey) {
      mnemonic = await decryptWithPrivateKey({
        privateKey: this.sdk.privateKey,
        encryptedDataJSON: walletInfo.key,
      });
    }

    const networkId = this.sdk.network === "mainnet" ? 1 : 0;

    if (
      (chain === "cardano" || !chain) &&
      walletInfo.chains.cardano &&
      mnemonic
    ) {
      const cardanoWallet = new MeshWallet({
        networkId: networkId,
        key: { type: "mnemonic", words: mnemonic.split(" ") },
        fetcher: this.sdk.providerFetcher,
        submitter: this.sdk.providerSubmitter,
      });
      await cardanoWallet.init();

      instance.cardanoWallet = cardanoWallet;
    }

    if (
      (chain === "spark" || !chain) &&
      walletInfo.chains.spark &&
      mnemonic
    ) {
      const sparkNetwork = networkId === 1 ? "MAINNET" : "REGTEST";
      const { wallet: sparkWallet } = await IssuerSparkWallet.initialize({
        mnemonicOrSeed: mnemonic,
        options: { network: sparkNetwork },
      });

      instance.sparkIssuerWallet = sparkWallet;
    }

    return instance;
  }

  /**
   * Get a specific project wallet by ID
   */
  async getProjectWallet(walletId: string): Promise<MultiChainWalletInfo> {
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/${walletId}`,
    );

    if (status === 200) {
      return data as MultiChainWalletInfo;
    }

    throw new Error("Project wallet not found");
  }

  /**
   * Get all project wallets
   */
  async getProjectWallets(): Promise<MultiChainWalletInfo[]> {
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}`,
    );

    if (status === 200) {
      return data as MultiChainWalletInfo[];
    }

    throw new Error("Failed to get project wallets");
  }
}

export { CardanoWalletDeveloperControlled } from "./cardano";
export { SparkIssuerWalletDeveloperControlled } from "./spark-issuer";
