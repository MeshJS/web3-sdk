import { MeshWallet } from "@meshsdk/wallet";
import { IFetcher, ISubmitter } from "@meshsdk/common";
import { EmbeddedWallet, IBitcoinProvider } from "@meshsdk/bitcoin";
import {
  OpenWindowResult,
  UserSocialData,
  Web3WalletKeyHashes,
  Web3AuthProvider,
} from "../types";
import {
  getCardanoAddressFromPubkey,
  getSparkAddressFromPubkey,
  openWindow,
} from "../functions";
import {
  Web3SparkWallet,
  EnableSparkWalletOptions,
  ValidSparkNetwork,
} from "../spark/web3-spark-wallet";
import { getBitcoinAddressFromPubkey } from "../functions/chains/bitcoin";

export type EnableWeb3WalletOptions = {
  networkId: 0 | 1;
  fetcher?: IFetcher;
  submitter?: ISubmitter;
  bitcoinProvider?: IBitcoinProvider;
  projectId?: string;
  appUrl?: string;
  directTo?: Web3AuthProvider;
  refreshToken?: string;
  keepWindowOpen?: boolean;
  baseUrl?: string;
  sparkscanApiKey?: string;
};

type InitWeb3WalletOptions = {
  networkId: 0 | 1;
  fetcher?: IFetcher;
  submitter?: ISubmitter;
  bitcoinProvider?: IBitcoinProvider;
  projectId?: string;
  appUrl?: string;
  user?: UserSocialData;
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
  appUrl?: string;
  user?: UserSocialData;
  cardano: MeshWallet;
  bitcoin: EmbeddedWallet;
  spark: Web3SparkWallet;

  constructor(options: InitWeb3WalletOptions) {
    this.projectId = options.projectId;
    this.appUrl = options.appUrl;
    this.user = options.user;

    // Initialize with placeholder instances that will be properly set in initWallet
    this.cardano = new MeshWallet({
      networkId: options.networkId || 0,
      key: {
        type: "address",
        address:
          "addr_test1qpvx0sacufuypa2k4sngk7q40zc5c4npl337uusdh64kv0uafhxhu32dys6pvn6wlw8dav6cmp4pmtv7cc3yel9uu0nq93swx9",
      },
    });

    this.bitcoin = new EmbeddedWallet({
      network: options.networkId === 1 ? "Mainnet" : "Testnet",
      key: {
        type: "address",
        address: "bcrt1qssadlsnjxkp2hf93yxge2kukh4m87743jfqx5k",
      },
    });

    this.spark = new Web3SparkWallet({
      network: options.networkId === 1 ? "MAINNET" : "REGTEST",
      sparkscanApiKey: "",
      key: {
        type: "address",
        address:
          "sprt1pgssyqmq9av0le9296ew9fssyhsa90zczmmvnl3mwcs3p0k0ls60rnda43drxq",
      },
    });
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
        directTo: options.directTo,
        refreshToken: options.refreshToken,
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
        bitcoinPubKeyHash: res.data.bitcoinPubKeyHash,
        sparkMainnetPubKeyHash: res.data.sparkMainnetPubKeyHash,
        sparkRegtestPubKeyHash: res.data.sparkRegtestPubKeyHash,
      },
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
    const networkId = await this.getNetworkId(chain);
    const res: OpenWindowResult = await openWindow(
      {
        method: "export-wallet",
        projectId: this.projectId!,
        chain: chain,
        networkId: String(networkId),
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

  /* PRIVATE FUNCTIONS */

  /** depre */
  // private async signTx(
  //   unsignedTx: string,
  //   partialSign = false,
  //   chain?: string,
  // ): Promise<string> {
  //   chain = chain ?? "cardano";
  //   const networkId = await this.getNetworkId(chain);
  //   const res: OpenWindowResult = await openWindow(
  //     {
  //       method: "sign-tx",
  //       projectId: this.projectId!,
  //       unsignedTx,
  //       partialSign: partialSign === true ? "true" : "false",
  //       chain: chain,
  //       networkId: String(networkId),
  //     },
  //     this.appUrl,
  //   );

  //   if (res.success === false)
  //     throw new ApiError({
  //       code: 2,
  //       info: "UserDeclined - User declined to sign the transaction.",
  //     });

  //   if (res.data.method !== "sign-tx") {
  //     throw new ApiError({
  //       code: 2,
  //       info: "Received the wrong response from the iframe.",
  //     });
  //   }

  //   return res.data.tx;
  // }

  /** depre */
  // private async getChangeAddress(chain?: string): Promise<string | undefined> {
  //   if (chain === "bitcoin" && this.bitcoin) {
  //     const addresses = await this.bitcoin.getAddresses();
  //     return addresses[0]?.address;
  //   } else if (this.cardano) {
  //     return await this.cardano.getChangeAddress();
  //   } else if (this.spark) {
  //     return await this.spark.getSparkAddress();
  //   }
  //   throw new ApiError({
  //     code: 5,
  //     info: "No wallet initialized",
  //   });
  // }

  private async getNetworkId(chain?: string): Promise<number> {
    if (chain === "bitcoin" && this.bitcoin) {
      return this.bitcoin.getNetworkId();
    } else if (this.cardano) {
      return this.cardano.getNetworkId();
    } else if (this.spark) {
      return this.spark.getNetworkId();
    }
    throw new ApiError({
      code: 5,
      info: "No wallet initialized",
    });
  }

  /** depre */
  // private async signData(
  //   payload: string,
  //   address?: string,
  //   chain?: string,
  // ): Promise<DataSignature | string> {
  //   chain = chain ?? "cardano";
  //   if (address === undefined) {
  //     address = await this.getChangeAddress(chain)!;
  //   }
  //   const networkId = await this.getNetworkId(chain);

  //   const res: OpenWindowResult = await openWindow(
  //     {
  //       method: "sign-data",
  //       projectId: this.projectId!,
  //       payload,
  //       address,
  //       networkId: String(networkId),
  //       chain: chain,
  //     },
  //     this.appUrl,
  //   );

  //   if (res.success === false)
  //     throw new ApiError({
  //       code: 3,
  //       info: "UserDeclined - User declined to sign the data.",
  //     });

  //   if (res.data.method !== "sign-data") {
  //     throw new ApiError({
  //       code: 2,
  //       info: "Received the wrong response from the iframe.",
  //     });
  //   }

  //   return res.data.signature;
  // }

  static async initBitcoinWallet(options: {}) {}

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
          info: "UserDeclined - User declined to sign the transaction.",
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

  private static initSparkWallet(
    keyHashes: Web3WalletKeyHashes,
    networkId: 0 | 1,
    projectId?: string,
    appUrl?: string,
    sparkscanApiKey?: string,
    baseUrl?: string,
  ): Web3SparkWallet {
    const identityPublicKey =
      networkId === 1
        ? keyHashes.sparkMainnetPubKeyHash
        : keyHashes.sparkRegtestPubKeyHash;

    const sparkOptions: EnableSparkWalletOptions = {
      network: (networkId === 1 ? "MAINNET" : "REGTEST") as ValidSparkNetwork,
      projectId,
      appUrl,
      sparkscanApiKey: sparkscanApiKey || "",
      baseUrl,
      ...(identityPublicKey && {
        key: {
          type: "address" as const,
          address: getSparkAddressFromPubkey(
            networkId === 1
              ? keyHashes.sparkMainnetPubKeyHash
              : keyHashes.sparkRegtestPubKeyHash,
            networkId === 1 ? "MAINNET" : "REGTEST",
          ),
          identityPublicKey,
        },
      }),
    };

    try {
      return new Web3SparkWallet(sparkOptions);
    } catch (error) {
      console.warn(
        "Failed to create Spark wallet with key, using fallback:",
        error,
      );
      const { key, ...fallbackOptions } = sparkOptions;
      return new Web3SparkWallet(fallbackOptions);
    }
  }

  /**
   * Initializes a new instance of a Web3 wallet with the specified options.
   *
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
  private static async initWallet({
    networkId,
    fetcher,
    submitter,
    bitcoinProvider,
    projectId,
    appUrl,
    user,
    keyHashes,
    baseUrl,
    sparkscanApiKey,
  }: {
    networkId: 0 | 1;
    fetcher?: IFetcher;
    submitter?: ISubmitter;
    bitcoinProvider?: IBitcoinProvider;
    projectId: string;
    appUrl: string;
    user?: UserSocialData;
    keyHashes: Web3WalletKeyHashes;
    baseUrl?: string;
    sparkscanApiKey?: string;
  }) {
    const _options: {
      networkId: 0 | 1;
      fetcher?: IFetcher | undefined;
      submitter?: ISubmitter;
      appUrl?: string;
      projectId?: string;
      user?: UserSocialData;
    } = {
      networkId: networkId,
      fetcher: fetcher,
      submitter: submitter,
      appUrl: appUrl,
      projectId: projectId,
      user: user,
    };
    const wallet = new Web3Wallet(_options);

    //* to be removed as now calling this.initCardanoWallet */
    // const cardanoWallet = new MeshWallet({
    //   networkId: networkId,
    //   key: resolveWalletAddress("cardano", keyHashes, networkId),
    //   fetcher: fetcher,
    //   submitter: submitter,
    // });
    // await cardanoWallet.init();

    // cardanoWallet.signTx = async (
    //   unsignedTx: string,
    //   partialSign = false,
    //   returnFullTx = true,
    // ) => {
    //   const txCbor = await wallet.signTx(unsignedTx, partialSign, "cardano");
    //   if (returnFullTx === false) {
    //     const tx = deserializeTx(txCbor);
    //     return tx.witnessSet().toCbor().toString();
    //   } else {
    //     return txCbor;
    //   }
    // };

    // cardanoWallet.signData = async (payload: string, address?: string) => {
    //   return wallet.signData(
    //     payload,
    //     address,
    //     "cardano",
    //   ) as Promise<DataSignature>;
    // };

    wallet.cardano = await this.initCardanoWallet({
      projectId,
      appUrl,
      networkId,
      fetcher,
      submitter,
      keyHashes,
    });

    const bitcoinWallet = new EmbeddedWallet({
      network: networkId === 1 ? "Mainnet" : "Testnet",
      key: {
        type: "address",
        address: getBitcoinAddressFromPubkey(
          keyHashes.bitcoinPubKeyHash,
          networkId,
        ),
      },
      provider: bitcoinProvider,
    });

    bitcoinWallet.signMessage = async (params) => {
      const signature = (await wallet.signData(
        params.message,
        params.address,
        "bitcoin",
      )) as string;
      return {
        signature,
        messageHash: "",
        address: params.address,
      };
    };

    bitcoinWallet.signPsbt = async (params) => {
      const txData = JSON.stringify(params);
      const signedTx = await wallet.signTx(txData, false, "bitcoin");
      return { psbt: signedTx };
    };

    wallet.bitcoin = bitcoinWallet;
    // wallet.bitcoin = await this.initBitcoinWallet();

    wallet.spark = this.initSparkWallet(
      keyHashes,
      networkId,
      _options.projectId,
      _options.appUrl,
      sparkscanApiKey,
      baseUrl,
    );
    // wallet.spark = await this.initSparkWallet();

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
