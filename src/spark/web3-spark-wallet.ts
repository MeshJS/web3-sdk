import axios, { AxiosInstance } from "axios";
import { ApiError } from "../wallet-user-controlled";
import { AddressSummary, OpenWindowResult } from "../types";
import { openWindow } from "../functions";

export type Web3SparkWalletOptions = {
  networkId: 0 | 1;
  appUrl: string;
  projectId: string;
  address: string;
  sparkApiUrl: string;
  publicKeyHex: string;
  sparkApiKey?: string;
};
export class Web3SparkWallet {
  networkId: 0 | 1;
  appUrl: string;
  projectId: string;
  address: string;
  sparkApiUrl: string;
  publicKeyHex: string;
  sparkApiKey?: string;
  private readonly _axiosInstance: AxiosInstance;

  constructor(options: Web3SparkWalletOptions) {
    this.networkId = options.networkId;
    this.appUrl = options.appUrl;
    this.projectId = options.projectId;
    this.address = options.address;
    this.sparkApiUrl = options.sparkApiUrl;
    this.publicKeyHex = options.publicKeyHex;
    this.sparkApiKey = options.sparkApiKey;

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
    const res: OpenWindowResult = await openWindow({
      method: "spark-transfer",
      projectId: this.projectId,
      networkId: String(this.networkId),
      receiverSparkAddress,
      amountSats: String(amountSats),
    });

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

    return res.data.txid;
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
    const res: OpenWindowResult = await openWindow({
      method: "spark-transfer-token",
      projectId: this.projectId,
      networkId: String(this.networkId),
      receiverSparkAddress,
      tokenAmount: String(tokenAmount),
      tokenIdentifier: String(tokenIdentifier),
    });

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

    return res.data.txid;
  }

  public async signMessage({ message }: { message: string }) {
    const res: OpenWindowResult = await openWindow({
      method: "spark-sign-message",
      projectId: this.projectId,
      networkId: String(this.networkId),
      message,
    });

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

    return res.data.signature;
  }
}
