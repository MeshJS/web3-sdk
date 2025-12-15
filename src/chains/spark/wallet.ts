import axios, { AxiosInstance } from "axios";
import {
  openWindow,
  AddressSummary,
  OpenWindowResult,
  ApiError,
  ExitSpeed,
} from "../../";

export type ValidSparkNetwork = "MAINNET" | "REGTEST";

export type Web3SparkWalletOptions = {
  networkId: 0 | 1;
  appUrl: string;
  projectId: string;
  address: string;
  sparkApiUrl: string;
  publicKeyHex: string;
  sparkApiKey?: string;
  sparkMainnetStaticDepositAddress: string;
  sparkRegtestStaticDepositAddress: string;
};
export class Web3SparkWallet {
  networkId: 0 | 1;
  appUrl: string;
  projectId: string;
  address: string;
  sparkApiUrl: string;
  publicKeyHex: string;
  sparkApiKey?: string;
  sparkMainnetStaticDepositAddress: string;
  sparkRegtestStaticDepositAddress: string;

  private readonly _axiosInstance: AxiosInstance;

  constructor(options: Web3SparkWalletOptions) {
    this.networkId = options.networkId;
    this.appUrl = options.appUrl;
    this.projectId = options.projectId;
    this.address = options.address;
    this.sparkApiUrl = options.sparkApiUrl;
    this.publicKeyHex = options.publicKeyHex;
    this.sparkApiKey = options.sparkApiKey;
    this.sparkMainnetStaticDepositAddress =
      options.sparkMainnetStaticDepositAddress;
    this.sparkRegtestStaticDepositAddress =
      options.sparkRegtestStaticDepositAddress;

    this._axiosInstance = axios.create({
      baseURL: options.sparkApiUrl,
      headers: {
        Accept: "application/json",
        ...(options.sparkApiKey && {
          Authorization: `Bearer ${options.sparkApiKey}`,
        }),
      },
    });
  }

  /** https://docs.xverse.app/sats-connect/spark-methods/spark_getaddress */
  public getAddress() {
    return {
      address: this.address,
      network: this.networkId === 0 ? "regtest" : "mainnet",
      publicKey: this.publicKeyHex,
    };
  }

  /** https://docs.xverse.app/sats-connect/spark-methods/spark_getbalance */
  public async getBalance() {
    if (this.sparkApiKey === undefined) {
      throw new ApiError({
        code: 5,
        info: "Failed to fetch from spark api (no API key)",
      });
    }

    const response = await this._axiosInstance.get(
      `address/${this.address}?network=${this.networkId === 0 ? "REGTEST" : "MAINNET"}`,
    );

    const addressSummary = response.data as AddressSummary;

    const tokenBalancesMap = new Map<
      string,
      {
        balance: bigint;
        tokenInfo: {
          tokenPublicKey: string;
          tokenName: string;
          tokenTicker: string;
          decimals: string;
          maxSupply: string;
        };
      }
    >();

    if (addressSummary.tokens && Array.isArray(addressSummary.tokens)) {
      for (const token of addressSummary.tokens) {
        tokenBalancesMap.set(token.tokenIdentifier, {
          balance: BigInt(token.balance),
          tokenInfo: {
            tokenName: token.name,
            tokenPublicKey: token.issuerPublicKey,
            tokenTicker: token.ticker,
            maxSupply: token.maxSupply === null ? "" : String(token.maxSupply),
            decimals: String(token.decimals),
          },
        });
      }
    }

    return {
      balance: BigInt(addressSummary.balance.btcHardBalanceSats || 0),
      tokenBalances: tokenBalancesMap,
    };
  }

  /** https://docs.xverse.app/sats-connect/spark-methods/spark_transfer */
  public async transfer({
    receiverSparkAddress,
    amountSats,
  }: {
    receiverSparkAddress: string;
    amountSats: number;
  }) {
    const res: OpenWindowResult = await openWindow(
      {
        method: "spark-transfer",
        projectId: this.projectId,
        networkId: String(this.networkId),
        receiverSparkAddress,
        amountSats: String(amountSats),
      },
      this.appUrl,
    );

    if (res.success === false) {
      throw new ApiError({
        code: 3,
        info: "UserDeclined - User declined the transfer.",
      });
    }

    if (res.data.method !== "spark-transfer") {
      throw new ApiError({
        code: 2,
        info: "Recieved the wrong response from wallet popover.",
      });
    }

    return { txid: res.data.txid };
  }

  public async transferToken({
    receiverSparkAddress,
    tokenIdentifier,
    tokenAmount,
  }: {
    receiverSparkAddress: string;
    tokenIdentifier: string;
    tokenAmount: number;
  }) {
    const res: OpenWindowResult = await openWindow(
      {
        method: "spark-transfer-token",
        projectId: this.projectId,
        networkId: String(this.networkId),
        receiverSparkAddress,
        tokenAmount: String(tokenAmount),
        tokenIdentifier: String(tokenIdentifier),
      },
      this.appUrl,
    );

    if (res.success === false) {
      throw new ApiError({
        code: 3,
        info: "UserDeclined - User declined the transfer.",
      });
    }

    if (res.data.method !== "spark-transfer-token") {
      throw new ApiError({
        code: 2,
        info: "Recieved the wrong response from wallet popover.",
      });
    }

    return { txid: res.data.txid };
  }

  public async claimStaticDeposit({ txId }: { txId: string }) {
    const res: OpenWindowResult = await openWindow(
      {
        method: "spark-claim-static-deposit",
        txId,
        projectId: this.projectId,
        networkId: String(this.networkId),
      },
      this.appUrl,
    );

    if (res.success === false) {
      throw new ApiError({
        code: 3,
        info: "UserDeclined - User declined the transfer.",
      });
    }

    if (res.data.method !== "spark-claim-static-deposit") {
      throw new ApiError({
        code: 2,
        info: "Recieved the wrong response from wallet popover.",
      });
    }

    return {
      transferId: res.data.transferId,
    };
  }

  public async withdrawToBitcoin({
    exitSpeed,
    amountSats,
    deductFeeFromWithdrawalAmount,
    withdrawalAddress,
  }: {
    exitSpeed: ExitSpeed;
    amountSats: number;
    deductFeeFromWithdrawalAmount: boolean;
    withdrawalAddress: string;
  }) {
    const res: OpenWindowResult = await openWindow(
      {
        method: "spark-withdraw-to-bitcoin",
        exitSpeed,
        withdrawalAddress,
        amountSats: String(amountSats),
        deductFeeFromWithdrawalAmount:
          deductFeeFromWithdrawalAmount === true ? "true" : "false",
        projectId: this.projectId,
        networkId: String(this.networkId),
      },
      this.appUrl,
    );

    if (res.success === false) {
      throw new ApiError({
        code: 3,
        info: "UserDeclined - User declined the transfer.",
      });
    }

    if (res.data.method !== "spark-withdraw-to-bitcoin") {
      throw new ApiError({
        code: 2,
        info: "Recieved the wrong response from wallet popover.",
      });
    }

    return {
      withdrawalId: res.data.withdrawalId,
    };
  }

  public async signMessage({ message }: { message: string }) {
    const res: OpenWindowResult = await openWindow(
      {
        method: "spark-sign-message",
        projectId: this.projectId,
        networkId: String(this.networkId),
        message,
      },
      this.appUrl,
    );

    if (res.success === false) {
      throw new ApiError({
        code: 3,
        info: "UserDeclined - User declined the transfer.",
      });
    }

    if (res.data.method !== "spark-sign-message") {
      throw new ApiError({
        code: 2,
        info: "Recieved the wrong response from wallet popover.",
      });
    }

    return {
      signature: res.data.signature,
    };
  }
}
