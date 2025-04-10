import { MeshWallet, CreateMeshWalletOptions } from "@meshsdk/wallet";
import { DataSignature, IFetcher, ISubmitter } from "@meshsdk/common";
import {
  UserControlledWalletDirectTo,
  WindowSignDataReq,
  WindowSignDataRes,
  WindowSignTxReq,
  WindowSignTxRes,
} from "../types";
import { WindowWalletReq, WindowWalletRes } from "../types";
import { getAddressFromHashes, openWindow } from "../functions";

export type InitWeb3WalletOptions = {
  networkId: 0 | 1;
  fetcher?: IFetcher;
  submitter?: ISubmitter;
  projectId?: string;
  appUrl?: string;
  directTo?: UserControlledWalletDirectTo;
};

/**
 * Mesh wallet-as-a-service are designed to be strictly non-custodial,
 * meaning neither the developer nor Mesh can access the user's private key.
 */
export class Web3Wallet extends MeshWallet {
  projectId?: string;
  appUrl?: string;

  constructor(
    options: CreateMeshWalletOptions & { projectId?: string; appUrl?: string }
  ) {
    super(options);
    this.projectId = options.projectId;
    this.appUrl = options.appUrl;
  }

  static async enable(options: InitWeb3WalletOptions): Promise<Web3Wallet> {
    const res = await getWalletFromWindow({
      networkId: options.networkId,
      projectId: options.projectId,
      appUrl: options.appUrl,
      directTo: options.directTo,
    });

    if (res.success === false)
      throw new ApiError({
        code: -3,
        info: "Refused - The request was refused due to lack of access - e.g. wallet disconnects.",
      });

    const address = getAddressFromHashes(
      res.data.pubKeyHash,
      res.data.stakeCredentialHash,
      options.networkId
    );

    const wallet = await Web3Wallet.initWallet({
      networkId: options.networkId,
      address,
      fetcher: options.fetcher,
      submitter: options.submitter,
      projectId: options.projectId,
      appUrl: options.appUrl,
    });

    return wallet;
  }

  /**
   * Requests user to sign the provided transaction (tx). The wallet should ask the user for permission, and if given, try to sign the supplied body and return a signed transaction. partialSign should be true if the transaction provided requires multiple signatures.
   *
   * @param unsignedTx - a transaction in CBOR
   * @param partialSign - if the transaction is partially signed (default: false)
   * @returns a signed transaction in CBOR
   */
  async signTx(unsignedTx: string, partialSign = false): Promise<string> {
    const _payload: WindowSignTxReq = {
      method: "sign-tx",
      unsignedTx,
      networkId: (await this.getNetworkId()) as 0 | 1,
      projectId: this.projectId,
    };

    const res: WindowSignTxRes = await openWindow(
      "/client/sign-tx",
      _payload,
      this.appUrl
    );

    if (res.success === false)
      throw new ApiError({
        code: 2,
        info: "UserDeclined - User declined to sign the transaction.",
      });

    return res.tx;
  }

  /**
   * This endpoint utilizes the [CIP-8 - Message Signing](https://cips.cardano.org/cips/cip8/) to sign arbitrary data, to verify the data was signed by the owner of the private key.
   *
   * @param payload - the payload to sign
   * @param address - the address to use for signing (optional)
   * @returns a signature
   */
  async signData(payload: string, address?: string): Promise<DataSignature> {
    if (address === undefined) {
      address = await this.getChangeAddress()!;
    }

    const _payload: WindowSignDataReq = {
      method: "sign-data",
      payload,
      networkId: (await this.getNetworkId()) as 0 | 1,
      projectId: this.projectId,
    };

    const res: WindowSignDataRes = await openWindow(
      "/client/sign-data",
      _payload,
      this.appUrl
    );

    if (res.success === false)
      throw new ApiError({
        code: 3,
        info: "UserDeclined - User declined to sign the data.",
      });

    return res.signature;
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
  }: {
    networkId: 0 | 1;
    address: string;
    fetcher?: IFetcher;
    submitter?: ISubmitter;
    projectId?: string;
    appUrl?: string;
  }) {
    const _options: CreateMeshWalletOptions & {
      projectId?: string;
      appUrl?: string;
    } = {
      networkId: networkId,
      key: {
        type: "address",
        address: address,
      },
      fetcher: fetcher,
      submitter: submitter,
      projectId: projectId,
      appUrl: appUrl,
    };
    const wallet = new Web3Wallet(_options);
    await wallet.init();
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

export async function getWalletFromWindow({
  networkId,
  projectId,
  appUrl,
  directTo,
}: WindowWalletReq): Promise<
  | {
      success: false;
      error: {
        errorMessage?: string;
        errorCode?: number;
      };
    }
  | {
      success: true;
      data: { pubKeyHash: string; stakeCredentialHash: string };
    }
> {
  const payload: WindowWalletReq = {
    networkId: networkId,
    projectId,
    directTo,
  };

  const walletRes: WindowWalletRes = await openWindow(
    "/client/wallet",
    payload,
    appUrl
  );

  if (walletRes.success) {
    return {
      success: true,
      data: {
        pubKeyHash: walletRes.pubKeyHash,
        stakeCredentialHash: walletRes.stakeCredentialHash,
      },
    };
  }

  return {
    success: false,
    error: {
      errorMessage: "No wallet",
    },
  };
}
