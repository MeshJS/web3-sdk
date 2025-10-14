import { MeshWallet, CreateMeshWalletOptions } from "@meshsdk/wallet";
import { DataSignature, IFetcher, ISubmitter } from "@meshsdk/common";
import { EmbeddedWallet, TransactionPayload } from "@meshsdk/bitcoin";
import {
  OpenWindowResult,
  UserSocialData,
  Web3WalletKeyHashes,
} from "../types";
import { Web3AuthProvider } from "../types";
import { openWindow } from "../functions";
import { resolveWalletAddress } from "../functions/chains/get-wallet-key";
import {
  SparkTransactionPayload,
  Web3SparkWallet,
} from "../spark/web3-spark-wallet";
import { deserializeTx } from "@meshsdk/core-cst";

export type EnableWeb3WalletOptions = {
  network: "mainnet" | "testnet";
  fetcher?: IFetcher;
  submitter?: ISubmitter;
  projectId?: string;
  appUrl?: string;
  directTo?: Web3AuthProvider;
  refreshToken?: string;
  keepWindowOpen?: boolean;
};

type InitWeb3WalletOptions = {
  network: "mainnet" | "testnet";
  fetcher?: IFetcher;
  submitter?: ISubmitter;
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
      networkId: options.network === "testnet" ? 0 : 1,
      key: {
        type: "address",
        address:
          "addr_test1qpvx0sacufuypa2k4sngk7q40zc5c4npl337uusdh64kv0uafhxhu32dys6pvn6wlw8dav6cmp4pmtv7cc3yel9uu0nq93swx9",
      },
    });

    this.bitcoin = new EmbeddedWallet({
      testnet: options.network === "testnet" ? true : false,
      key: {
        type: "address",
        address: "bcrt1qssadlsnjxkp2hf93yxge2kukh4m87743jfqx5k",
      },
    });

    this.spark = new Web3SparkWallet({
      network: options.network === "mainnet" ? "MAINNET" : "REGTEST",
      key: {
        type: "address",
        address:
          "sprt1pgssx7zt9eduf4jwvhqyw730qgdnj77g0q0u47fwtp05vwkagz6wd8mkmd4yeu",
      },
    });
  }

  /**
   * Initializes a new instance of the Web3Wallet class.
   *
   * @param options - The options to initialize the wallet.
   * @param options.network - The network (testnet [preprod] or mainnet).
   * @param options.fetcher - An optional fetcher for network requests.
   * @param options.submitter - An optional submitter for transaction submissions.
   * @param options.projectId - An optional project ID for analytics or tracking.
   * @param options.appUrl - An optional application URL for the wallet.
   * @param options.directTo - An optional parameter to specify the user-controlled wallet direct-to option.
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
        networkId: String(options.network === "testnet" ? 0 : 1),
        keepWindowOpen: options.keepWindowOpen ? "true" : "false",
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
      network: options.network,
      fetcher: options.fetcher,
      submitter: options.submitter,
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
    });

    return wallet;
  }

  getUser() {
    return this.user;
  }

  /* PRIVATE FUNCTIONS */

  private async signTx(
    unsignedTx: string,
    partialSign = false,
    chain?: string,
  ): Promise<string> {
    chain = chain ?? "cardano";
    const networkId = await this.getNetworkId(chain);
    const res: OpenWindowResult = await openWindow(
      {
        method: "sign-tx",
        projectId: this.projectId!,
        unsignedTx,
        partialSign: partialSign === true ? "true" : "false",
        chain: chain,
        networkId: String(networkId),
      },
      this.appUrl,
    );

    if (res.success === false)
      throw new ApiError({
        code: 2,
        info: "UserDeclined - User declined to sign the transaction.",
      });

    if (res.data.method !== "sign-tx") {
      throw new ApiError({
        code: 2,
        info: "Received the wrong response from the iframe.",
      });
    }

    return res.data.tx;
  }

  /**
   * This endpoint utilizes the [CIP-8 - Message Signing](https://cips.cardano.org/cips/cip8/) to sign arbitrary data, to verify the data was signed by the owner of the private key.
   *
   * @param payload - the payload to sign
   * @param address - the address to use for signing (optional)
   * @returns a signature
   */
  private async getChangeAddress(chain?: string): Promise<string | undefined> {
    if (chain === "bitcoin" && this.bitcoin) {
      return this.bitcoin.getAddress().address;
    } else if (this.cardano) {
      return await this.cardano.getChangeAddress();
    } else if (this.spark) {
      return (await this.spark.getWalletInfo()).sparkAddress;
    }
    throw new ApiError({
      code: 5,
      info: "No wallet initialized",
    });
  }

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

  private async signData(
    payload: string,
    address?: string,
    chain?: string,
  ): Promise<DataSignature | string> {
    chain = chain ?? "cardano";
    if (address === undefined) {
      address = await this.getChangeAddress(chain)!;
    }
    const networkId = await this.getNetworkId(chain);

    const res: OpenWindowResult = await openWindow(
      {
        method: "sign-data",
        projectId: this.projectId!,
        payload,
        address,
        networkId: String(networkId),
        chain: chain,
      },
      this.appUrl,
    );

    if (res.success === false)
      throw new ApiError({
        code: 3,
        info: "UserDeclined - User declined to sign the data.",
      });

    if (res.data.method !== "sign-data") {
      throw new ApiError({
        code: 2,
        info: "Received the wrong response from the iframe.",
      });
    }

    return res.data.signature;
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
    network,
    fetcher,
    submitter,
    keyHashes,
    projectId,
    appUrl,
    user,
  }: {
    network: "mainnet" | "testnet";
    fetcher?: IFetcher;
    submitter?: ISubmitter;
    projectId?: string;
    appUrl?: string;
    user?: UserSocialData;
    keyHashes: Web3WalletKeyHashes;
  }) {
    const wallet = new Web3Wallet({
      network,
      fetcher,
      submitter,
      projectId,
      appUrl,
      user,
    });

    const cardanoNetworkId = network === "testnet" ? 0 : 1;
    const cardanoWallet = new MeshWallet({
      networkId: cardanoNetworkId,
      key: resolveWalletAddress("cardano", keyHashes, network),
      fetcher: fetcher,
      submitter: submitter,
    });
    await cardanoWallet.init();

    cardanoWallet.signTx = async (
      unsignedTx: string,
      partialSign = false,
      returnFullTx = true,
    ) => {
      const txCbor = await wallet.signTx(unsignedTx, partialSign, "cardano");
      if (returnFullTx === false) {
        const tx = deserializeTx(txCbor);
        return tx.witnessSet().toCbor().toString();
      } else {
        return txCbor;
      }
    };

    cardanoWallet.signData = async (payload: string, address?: string) => {
      return wallet.signData(
        payload,
        address,
        "cardano",
      ) as Promise<DataSignature>;
    };

    wallet.cardano = cardanoWallet;

    const bitcoinWallet = new EmbeddedWallet({
      testnet: network === "testnet",
      key: resolveWalletAddress("bitcoin", keyHashes, network),
    });

    bitcoinWallet.signTx = async (payload: TransactionPayload) => {
      return wallet.signTx(
        JSON.stringify(payload),
        false,
        "bitcoin",
      ) as Promise<string>;
    };

    bitcoinWallet.signData = async (payload: string, address?: string) => {
      return wallet.signData(payload, address, "bitcoin") as Promise<string>;
    };

    wallet.bitcoin = bitcoinWallet;

    const sparkWallet = new Web3SparkWallet({
      network: network === "mainnet" ? "MAINNET" : "REGTEST",
      key: resolveWalletAddress("spark", keyHashes, network),
    });

    sparkWallet.signTx = async (payload: SparkTransactionPayload) => {
      return wallet.signTx(JSON.stringify(payload), false, "spark");
    };

    sparkWallet.signData = async (payload: string, address?: string) => {
      return wallet.signData(payload, address, "spark") as Promise<string>;
    };

    wallet.spark = sparkWallet;

    return wallet;
  }

  async exportWallet(chain?: string): Promise<{
    success: boolean;
    data: { method: "export-wallet" };
  }> {
    chain = chain ?? "cardano";
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

  async getWalletInfo(chain?: string) {
    chain = chain ?? "spark";
    const networkId = await this.getNetworkId(chain);
    const res: OpenWindowResult = await openWindow(
      {
        method: "get-wallet-info",
        projectId: this.projectId!,
        chain: chain,
        networkId: String(networkId),
      },
      this.appUrl,
    );

    if (res.success === false)
      throw new ApiError({
        code: 3,
        info: "UserDeclined - User declined to get wallet info.",
      });

    if (res.data.method !== "get-wallet-info") {
      throw new ApiError({
        code: 2,
        info: "Received the wrong response from the iframe.",
      });
    }

    return {
      sparkAddress: res.data.sparkAddress,
      staticDepositAddress: res.data.staticDepositAddress,
      balance: BigInt(res.data.balance),
      tokenBalances: res.data.tokenBalances,
      identityPublicKey: res.data.identityPublicKey,
      depositUtxos: res.data.depositUtxos,
      transactionHistory: res.data.transactionHistory,
    };
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
}

export class ApiError extends Error {
  public json: Record<string, any>;

  constructor(json: Record<string, any>) {
    super(json.info || "An error occurred");
    this.name = "ApiError";
    this.json = json;
  }
}
