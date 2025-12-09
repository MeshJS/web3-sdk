import { MeshWallet } from "@meshsdk/wallet";
import { IFetcher, ISubmitter } from "@meshsdk/common";
import {
  EmbeddedWallet,
  IBitcoinProvider,
  SignMessageParams,
  SignPsbtParams,
  SendTransferParams,
} from "@meshsdk/bitcoin";
import {
  getCardanoAddressFromPubkey,
  getSparkAddressFromPubkey,
  openWindow,
  Web3SparkWallet,
  Web3SparkWalletOptions,
  getBitcoinAddressFromPubkey,
  OpenWindowResult,
  UserSocialData,
  Web3WalletKeyHashes,
  Web3AuthProvider,
} from "../";

export type EnableWeb3WalletOptions = {
  networkId: 0 | 1;
  fetcher?: IFetcher;
  submitter?: ISubmitter;
  bitcoinProvider?: IBitcoinProvider;
  projectId: string;
  appUrl?: string;
  directTo?: Web3AuthProvider;
  refreshToken?: string;
  keepWindowOpen?: boolean;
  baseUrl?: string;
  sparkscanApiKey?: string;
};

type Web3WalletContructorOptions = {
  networkId: 0 | 1;
  fetcher?: IFetcher;
  submitter?: ISubmitter;
  bitcoinProvider?: IBitcoinProvider;
  projectId?: string;
  appUrl?: string;
  user?: UserSocialData;
  cardano: MeshWallet;
  bitcoin: EmbeddedWallet;
  spark: Web3SparkWallet;
};

/**
 * Mesh wallet-as-a-service are designed to be strictly non-custodial,
 * meaning neither the developer nor Mesh can access the user's private key.
 *
 * @param options - The options to initialize the wallet.
 * @param options.projectId - Project ID
 * @param options.appUrl - An optional backend URL, only used for development.
 * @param options.user - User social data
 */
export class Web3Wallet {
  projectId?: string;
  appUrl: string = "https://utxos.dev/";
  user?: UserSocialData;
  cardano: MeshWallet;
  bitcoin: EmbeddedWallet;
  spark: Web3SparkWallet;
  networkId: 0 | 1;

  constructor(options: Web3WalletContructorOptions) {
    this.projectId = options.projectId;
    this.appUrl = options.appUrl || "https://utxos.dev/";
    this.user = options.user;
    this.cardano = options.cardano;
    this.bitcoin = options.bitcoin;
    this.spark = options.spark;
    this.networkId = options.networkId;
  }

  /**
   * Initializes a new instance of the Web3Wallet class.
   *
   * @param options - The options to initialize the wallet.
   * @param options.networkId - The network ID (0 for testnet, 1 for mainnet).
   * @param options.fetcher - An optional fetcher for network requests.
   * @param options.submitter - An optional submitter for transaction submissions.
   * @param options.projectId - An optional project ID for analytics or tracking.
   * @param options.appUrl - An optional application URL for the wallet.
   * @param options.directTo - An optional parameter to specify the user-controlled wallet direct-to option.
   * @param options.refreshToken - An optional refresh token for authentication.
   * @param options.keepWindowOpen - An optional flag to keep the wallet window open after operations.
   * @param options.sparkscanApiKey - An optional API key for Sparkscan integration.
   *
   * @returns A promise that resolves to an instance of Web3Wallet.
   */
  static async enable(options: EnableWeb3WalletOptions): Promise<Web3Wallet> {
    const res: OpenWindowResult = await openWindow(
      {
        method: "enable",
        projectId: options.projectId!,
        directTo: options.directTo ? options.directTo : "undefined",
        refreshToken: options.refreshToken ? options.refreshToken : "undefined",
        keepWindowOpen: options.keepWindowOpen ? "true" : "false",
        networkId: String(options.networkId),
      },
      options.appUrl,
    );

    if (res.success === false)
      throw new ApiError({
        code: -3,
        info: "Refused - The request was refused due to lack of access - e.g. wallet disconnects.",
      });

    if (res.data.method !== "enable") {
      throw new ApiError({
        code: 2,
        info: "Received the wrong response from the iframe.",
      });
    }

    const wallet = await Web3Wallet.initWallet({
      // Not actually deprecated, just want developers to get a danger line when using this function (it's not for public use.)
      networkId: options.networkId,
      fetcher: options.fetcher,
      submitter: options.submitter,
      bitcoinProvider: options.bitcoinProvider,
      projectId: options.projectId,
      appUrl: options.appUrl,
      user: res.data.user,
      keyHashes: {
        cardanoPubKeyHash: res.data.cardanoPubKeyHash,
        cardanoStakeCredentialHash: res.data.cardanoStakeCredentialHash,
        bitcoinMainnetPubKeyHash: res.data.bitcoinMainnetPubKeyHash,
        bitcoinTestnetPubKeyHash: res.data.bitcoinTestnetPubKeyHash,
        sparkMainnetPubKeyHash: res.data.sparkMainnetPubKeyHash,
        sparkRegtestPubKeyHash: res.data.sparkRegtestPubKeyHash,
      },
      sparkMainnetStaticDepositAddress:
        res.data.sparkMainnetStaticDepositAddress,
      sparkRegtestStaticDepositAddress:
        res.data.sparkRegtestStaticDepositAddress,
      sparkscanApiKey: options.sparkscanApiKey,
      baseUrl: options.baseUrl,
    });

    return wallet;
  }

  getUser() {
    return this.user;
  }

  async exportWallet(chain: "cardano" | "bitcoin" | "spark"): Promise<{
    success: boolean;
    data: { method: "export-wallet" };
  }> {
    const res: OpenWindowResult = await openWindow(
      {
        method: "export-wallet",
        projectId: this.projectId!,
        chain: chain,
        networkId: String(this.networkId),
      },
      this.appUrl,
    );

    if (res.success === false)
      throw new ApiError({
        code: 2,
        info: "UserDeclined - User declined to export the wallet.",
      });

    if (res.data.method !== "export-wallet") {
      throw new ApiError({
        code: 2,
        info: "Received the wrong response from the iframe.",
      });
    }

    return { success: true, data: { method: "export-wallet" } };
  }

  async disable() {
    const res: OpenWindowResult = await openWindow(
      {
        method: "disable",
        projectId: this.projectId!,
      },
      this.appUrl,
    );
    if (res.success === false) {
      throw new ApiError({
        code: 2,
        info: "Received the wrong response from the iframe.",
      });
    }
    return { success: true, data: { method: "disable" } };
  }

  async onramp(options: { chain: "cardano" | "bitcoin" }) {
    const chain = options.chain;
    const method: "cardano-onramp" | "bitcoin-onramp" = `${chain}-onramp`;
    if (!this.projectId) {
      throw new ApiError({
        code: 2,
        info: "Cannot start onramp without a projectId.",
      });
    }

    const res: OpenWindowResult = await openWindow(
      {
        method: method,
        projectId: this.projectId,
      },
      this.appUrl,
    );

    if (res.success === false)
      throw new ApiError({
        code: 2,
        info: "UserDeclined - User declined to sign the message.",
      });

    if (res.data.method !== "cardano-onramp") {
      throw new ApiError({
        code: 2,
        info: "Received the wrong response from the iframe.",
      });
    }
    return {
      success: true,
      data: { method },
    };
  }

  static async initBitcoinWallet(options: {
    projectId: string;
    appUrl: string;
    networkId: 0 | 1;
    bitcoinProvider?: IBitcoinProvider;
    keyHashes: Web3WalletKeyHashes;
  }): Promise<EmbeddedWallet> {
    const bitcoinWallet = new EmbeddedWallet({
      network: options.networkId === 1 ? "Mainnet" : "Testnet",
      key: {
        type: "address",
        address: getBitcoinAddressFromPubkey(
          options.networkId === 1
            ? options.keyHashes.bitcoinMainnetPubKeyHash
            : options.keyHashes.bitcoinTestnetPubKeyHash,
          options.networkId,
        ),
      },
      provider: options.bitcoinProvider,
    });

    bitcoinWallet.signMessage = async (params: SignMessageParams) => {
      const res: OpenWindowResult = await openWindow(
        {
          method: "bitcoin-sign-message",
          projectId: options.projectId,
          address: params.address,
          message: params.message,
          protocol: params.protocol,
          networkId: String(options.networkId),
        },
        options.appUrl,
      );

      if (res.success === false)
        throw new ApiError({
          code: 2,
          info: "UserDeclined - User declined to sign the message.",
        });

      if (res.data.method !== "bitcoin-sign-message") {
        throw new ApiError({
          code: 2,
          info: "Received the wrong response from the iframe.",
        });
      }

      return {
        signature: res.data.signature,
        messageHash: res.data.messageHash,
        address: res.data.address,
      };
    };

    bitcoinWallet.sendTransfer = async (params: SendTransferParams) => {
      const res: OpenWindowResult = await openWindow(
        {
          method: "bitcoin-send-transfer",
          projectId: options.projectId,
          recipients: JSON.stringify(params.recipients),
          networkId: String(options.networkId),
        },
        options.appUrl,
      );

      if (res.success === false)
        throw new ApiError({
          code: 2,
          info: "UserDeclined - User declined to sign the transaction.",
        });

      if (res.data.method !== "bitcoin-send-transfer") {
        throw new ApiError({
          code: 2,
          info: "Received the wrong response from the iframe.",
        });
      }

      return { txid: res.data.txid };
    };

    bitcoinWallet.signPsbt = async (params: SignPsbtParams) => {
      const res: OpenWindowResult = await openWindow(
        {
          method: "bitcoin-sign-psbt",
          projectId: options.projectId,
          psbt: params.psbt,
          signInputs: JSON.stringify(params.signInputs),
          broadcast: params.broadcast === true ? "true" : "false",
          networkId: String(options.networkId),
        },
        options.appUrl,
      );

      if (res.success === false)
        throw new ApiError({
          code: 2,
          info: "UserDeclined - User declined to sign the transaction.",
        });

      if (res.data.method !== "bitcoin-sign-psbt") {
        throw new ApiError({
          code: 2,
          info: "Received the wrong response from the iframe.",
        });
      }

      return {
        psbt: res.data.psbt,
        txid: res.data.txid,
      };
    };

    return bitcoinWallet;
  }

  static async initCardanoWallet(options: {
    projectId: string;
    appUrl: string;
    networkId: 0 | 1;
    fetcher: IFetcher | undefined;
    submitter: ISubmitter | undefined;
    keyHashes: Web3WalletKeyHashes;
  }): Promise<MeshWallet> {
    const cardanoWallet = new MeshWallet({
      networkId: options.networkId,
      key: {
        type: "address",
        address: getCardanoAddressFromPubkey(
          options.keyHashes.cardanoPubKeyHash,
          options.keyHashes.cardanoStakeCredentialHash,
          options.networkId,
        ),
      },
      fetcher: options.fetcher,
      submitter: options.submitter,
    });
    await cardanoWallet.init();

    cardanoWallet.signTx = async (
      unsignedTx: string,
      partialSign = false,
      returnFullTx = true,
    ) => {
      const res: OpenWindowResult = await openWindow(
        {
          method: "cardano-sign-tx",
          projectId: options.projectId,
          unsignedTx,
          partialSign: partialSign === true ? "true" : "false",
          returnFullTx: returnFullTx === true ? "true" : "false",
          networkId: String(options.networkId),
        },
        options.appUrl,
      );

      if (res.success === false)
        throw new ApiError({
          code: 2,
          info: "UserDeclined - User declined to sign the message.",
        });

      if (res.data.method !== "cardano-sign-tx") {
        throw new ApiError({
          code: 2,
          info: "Received the wrong response from the iframe.",
        });
      }

      return res.data.tx;
    };

    cardanoWallet.signData = async (payload: string, address?: string) => {
      const res: OpenWindowResult = await openWindow(
        {
          method: "cardano-sign-data",
          projectId: options.projectId,
          payload,
          address,
          networkId: String(options.networkId),
        },
        options.appUrl,
      );

      if (res.success === false)
        throw new ApiError({
          code: 3,
          info: "UserDeclined - User declined to sign the data.",
        });

      if (res.data.method !== "cardano-sign-data") {
        throw new ApiError({
          code: 2,
          info: "Received the wrong response from the iframe.",
        });
      }

      return res.data.dataSignature;
    };

    return cardanoWallet;
  }

  private static async initSparkWallet(
    keyHashes: Web3WalletKeyHashes,
    networkId: 0 | 1,
    projectId: string,
    appUrl: string,
    sparkMainnetStaticDepositAddress: string,
    sparkRegtestStaticDepositAddress: string,
    sparkscanApiKey?: string,
    baseUrl = "https://api.sparkscan.io",
  ): Promise<Web3SparkWallet> {
    const identityPublicKey =
      networkId === 1
        ? keyHashes.sparkMainnetPubKeyHash
        : keyHashes.sparkRegtestPubKeyHash;

    const sparkOptions: Web3SparkWalletOptions = {
      networkId,
      projectId,
      appUrl,
      sparkApiKey: sparkscanApiKey,
      sparkApiUrl: baseUrl,
      sparkMainnetStaticDepositAddress: sparkMainnetStaticDepositAddress,
      sparkRegtestStaticDepositAddress: sparkRegtestStaticDepositAddress,
      address: getSparkAddressFromPubkey(
        networkId === 1
          ? keyHashes.sparkMainnetPubKeyHash
          : keyHashes.sparkRegtestPubKeyHash,
        networkId === 1 ? "MAINNET" : "REGTEST",
      ),
      publicKeyHex: identityPublicKey,
    };

    return new Web3SparkWallet(sparkOptions);
  }

  /**
   * Initializes a new instance of a Web3 wallet with the specified options.
   * @deprecated - Don't use this function unless you know exactly what you're doing.
   * @param params - The parameters required to initialize the wallet.
   * @param params.networkId - The network ID to connect to. Must be either `0` (testnet) or `1` (mainnet).
   * @param params.address - The wallet address to associate with the wallet instance.
   * @param params.fetcher - (Optional) An implementation of the `IFetcher` interface for fetching data.
   * @param params.submitter - (Optional) An implementation of the `ISubmitter` interface for submitting transactions.
   * @param params.projectId - (Optional) The project ID for analytics or tracking purposes.
   * @param params.appUrl - (Optional) The application URL for associating the wallet with a specific app.
   *
   * @returns A promise that resolves to an initialized instance of `Web3Wallet`.
   */
  static async initWallet({
    networkId,
    fetcher,
    submitter,
    bitcoinProvider,
    projectId,
    appUrl = "https://utxos.dev/",
    user,
    keyHashes,
    baseUrl,
    sparkMainnetStaticDepositAddress,
    sparkRegtestStaticDepositAddress,
    sparkscanApiKey,
  }: {
    networkId: 0 | 1;
    fetcher?: IFetcher;
    submitter?: ISubmitter;
    bitcoinProvider?: IBitcoinProvider;
    projectId: string;
    appUrl?: string;
    user?: UserSocialData;
    keyHashes: Web3WalletKeyHashes;
    sparkMainnetStaticDepositAddress: string;
    sparkRegtestStaticDepositAddress: string;
    baseUrl?: string;
    sparkscanApiKey?: string;
  }) {
    const bitcoin = await this.initBitcoinWallet({
      projectId,
      appUrl,
      networkId,
      bitcoinProvider,
      keyHashes,
    });

    const cardano = await this.initCardanoWallet({
      projectId,
      appUrl,
      networkId,
      fetcher,
      submitter,
      keyHashes,
    });

    const spark = await this.initSparkWallet(
      keyHashes,
      networkId,
      projectId,
      appUrl,
      sparkMainnetStaticDepositAddress,
      sparkRegtestStaticDepositAddress,
      sparkscanApiKey,
      baseUrl,
    );

    const _options: Web3WalletContructorOptions = {
      networkId: networkId,
      fetcher: fetcher,
      submitter: submitter,
      appUrl: appUrl,
      projectId: projectId,
      user: user,
      cardano,
      bitcoin,
      spark,
    };
    const wallet = new Web3Wallet(_options);

    return wallet;
  }
}

export class ApiError extends Error {
  public json: Record<string, any>;

  constructor(json: Record<string, any>) {
    super(json.info || "An error occurred");
    this.name = "ApiError";
    this.json = json;
  }
}
