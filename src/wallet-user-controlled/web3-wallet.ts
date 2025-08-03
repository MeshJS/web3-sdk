import { MeshWallet, CreateMeshWalletOptions } from "@meshsdk/wallet";
import { DataSignature, IFetcher, ISubmitter } from "@meshsdk/common";
import {
  EmbeddedWallet,
  resolveAddress,
  TransactionPayload,
} from "@meshsdk/bitcoin";
import { OpenWindowResult, UserSocialData } from "../types";
import { Web3AuthProvider } from "../types";
import { getAddressFromHashes, openWindow } from "../functions";

export type EnableWeb3WalletOptions = {
  networkId: 0 | 1;
  fetcher?: IFetcher;
  submitter?: ISubmitter;
  projectId?: string;
  appUrl?: string;
  directTo?: Web3AuthProvider;
  chain?: string;
  refreshToken?: string;
};

type InitWeb3WalletOptions = CreateMeshWalletOptions & {
  projectId?: string;
  appUrl?: string;
  user?: UserSocialData;
  chain?: string;
};

/**
 * Mesh wallet-as-a-service are designed to be strictly non-custodial,
 * meaning neither the developer nor Mesh can access the user's private key.
 */
export class Web3Wallet {
  projectId?: string;
  appUrl?: string;
  user?: UserSocialData;
  chain?: string;

  cardano?: MeshWallet;
  bitcoin?: EmbeddedWallet;

  constructor(options: InitWeb3WalletOptions) {
    this.projectId = options.projectId;
    this.appUrl = options.appUrl;
    this.user = options.user;
    this.chain = options.chain;
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
   *
   * @returns A promise that resolves to an instance of Web3Wallet.
   */
  static async enable(options: EnableWeb3WalletOptions): Promise<Web3Wallet> {
    const res: OpenWindowResult = await openWindow(
      {
        method: "enable",
        projectId: options.projectId!,
        directTo: options.directTo,
        chain: options.chain,
        refreshToken: options.refreshToken
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

    let address: string;

    if (options.chain === "cardano" || options.chain === undefined) {
      address = getAddressFromHashes(
        res.data.cardanoPubKeyHash,
        res.data.cardanoStakeCredentialHash,
        options.networkId,
      );
    } else if (options.chain === "bitcoin" && res.data.bitcoinPubKeyHash) {
      const { address: _bitcoinAddress } = resolveAddress(
        res.data.bitcoinPubKeyHash,
        options.networkId === 1 ? "mainnet" : "testnet",
      );
      address = _bitcoinAddress;
    }

    const wallet = await Web3Wallet.initWallet({
      networkId: options.networkId,
      address: address!,
      fetcher: options.fetcher,
      submitter: options.submitter,
      projectId: options.projectId,
      appUrl: options.appUrl,
      user: res.data.user,
      chain: options.chain,
    });

    return wallet;
  }

  getUser() {
    return this.user;
  }

  /**
   * Requests user to sign the provided transaction (tx). The wallet should ask the user for permission, and if given, try to sign the supplied body and return a signed transaction. partialSign should be true if the transaction provided requires multiple signatures.
   *
   * @param unsignedTx - a transaction in CBOR
   * @param partialSign - if the transaction is partially signed (default: false)
   * @returns a signed transaction in CBOR
   */
  async signTx(unsignedTx: string, partialSign = false): Promise<string> {
    const res: OpenWindowResult = await openWindow(
      {
        method: "sign-tx",
        projectId: this.projectId!,
        unsignedTx,
        partialSign: partialSign === true ? "true" : "false",
        chain: this.chain,
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
  async getChangeAddress(): Promise<string | undefined> {
    if (this.chain === "bitcoin" && this.bitcoin) {
      return this.bitcoin.getAddress().address;
    } else if (this.cardano) {
      return await this.cardano.getChangeAddress();
    }
    throw new ApiError({
      code: 5,
      info: "No wallet initialized",
    });
  }

  async getNetworkId(): Promise<number> {
    if (this.chain === "bitcoin" && this.bitcoin) {
      return this.bitcoin.getNetworkId();
    } else if (this.cardano) {
      return this.cardano.getNetworkId();
    }
    throw new ApiError({
      code: 5,
      info: "No wallet initialized",
    });
  }

  async signData(
    payload: string,
    address?: string,
  ): Promise<DataSignature | string> {
    if (address === undefined) {
      address = await this.getChangeAddress()!;
    }
    const networkId = await this.getNetworkId();

    const res: OpenWindowResult = await openWindow(
      {
        method: "sign-data",
        projectId: this.projectId!,
        payload,
        address,
        networkId: String(networkId),
        chain: this.chain,
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

  async exportWallet(): Promise<{
    success: boolean;
    data: { method: "export-wallet" };
  }> {
    const networkId = await this.getNetworkId();
    const res: OpenWindowResult = await openWindow(
      {
        method: "export-wallet",
        projectId: this.projectId!,
        chain: this.chain,
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
  static async initWallet({
    networkId,
    address,
    fetcher,
    submitter,
    projectId,
    appUrl,
    user,
    chain,
  }: {
    networkId: 0 | 1;
    address: string;
    fetcher?: IFetcher;
    submitter?: ISubmitter;
    projectId?: string;
    appUrl?: string;
    user?: UserSocialData;
    chain?: string;
  }) {
    const _options: InitWeb3WalletOptions = {
      networkId: networkId,
      key: {
        type: "address",
        address: address,
      },
      fetcher: fetcher,
      submitter: submitter,
      projectId: projectId,
      appUrl: appUrl,
      user: user,
      chain: chain,
    };
    const wallet = new Web3Wallet(_options);

    if (!chain || chain === "cardano") {
      const cardanoWallet = new MeshWallet({
        networkId: networkId,
        key: {
          type: "address",
          address: address,
        },
        fetcher: fetcher,
        submitter: submitter,
      });
      await cardanoWallet.init();

      cardanoWallet.signTx = async (
        unsignedTx: string,
        partialSign = false,
      ) => {
        return wallet.signTx(unsignedTx, partialSign);
      };

      cardanoWallet.signData = async (payload: string, address?: string) => {
        return wallet.signData(payload, address) as Promise<DataSignature>;
      };

      wallet.cardano = cardanoWallet;
    } else if (chain === "bitcoin") {
      const bitcoinWallet = new EmbeddedWallet({
        testnet: networkId === 0,
        key: {
          type: "address",
          address: address,
        },
      });

      bitcoinWallet.signTx = async (payload: TransactionPayload) => {
        return wallet.signTx(JSON.stringify(payload)) as Promise<string>;
      };

      bitcoinWallet.signData = async (payload: string, address?: string) => {
        return wallet.signData(payload) as Promise<string>;
      };

      wallet.bitcoin = bitcoinWallet;
    }

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
