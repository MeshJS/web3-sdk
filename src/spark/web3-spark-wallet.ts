import axios, { AxiosInstance } from "axios";
import { ApiError } from "../wallet-user-controlled";
import { OpenWindowResult } from "../types";
import { openWindow } from "../functions";
import { Bech32mTokenIdentifier, SparkWallet } from "@buildonspark/spark-sdk";
import { OutputWithPreviousTransactionData } from "@buildonspark/spark-sdk/dist/proto/spark_token";
import * as Spark from "../types/spark";

export type ValidSparkNetwork = "MAINNET" | "REGTEST";

export type EnableSparkWalletOptions = {
    network: ValidSparkNetwork;
    sparkscanApiKey?: string;
    projectId?: string;
    appUrl?: string;
    baseUrl?: string;
    key?:
    | {
        type: "address";
        address: string;
        identityPublicKey?: string;
    };
};

export class Web3SparkWallet {
    private readonly _axiosInstance: AxiosInstance;
    readonly network: ValidSparkNetwork;
    private sparkAddress: string = "";
    private publicKey: string = "";
    private projectId?: string;
    private appUrl?: string;

    constructor(options: EnableSparkWalletOptions) {
        this._axiosInstance = axios.create({
            // baseURL: `https://api.sparkscan.io/v1`, // todo, when in SDK, point to sparkscan
            // baseURL: `/api/sparkscan/`,
            baseURL: options.baseUrl, // For now let's add baseUrl
            headers: {
                Authorization: `Bearer ${options.sparkscanApiKey}`,
            },
        });
        this.network = options.network;
        this.projectId = options.projectId;
        this.appUrl = options.appUrl;

        if (options.key?.type === "address") {
            this.sparkAddress = options.key.address;
            this.publicKey = options.key.identityPublicKey || "";
        }
    }

    static async enable(
        options: EnableSparkWalletOptions,
    ): Promise<Web3SparkWallet> {
        // todo: default: open iframe, and get wallet info, should return publicKey, this is used for devs integrating spark wallet
        // todo: if address, use address and identityPublicKey, is read only.

        if (options.key?.type === "address") {
            return new Web3SparkWallet(options);
        }

        const networkId = options.network === "MAINNET" ? 1 : 0;
        const res: OpenWindowResult = await openWindow(
            {
                method: "get-wallet-info",
                projectId: options.projectId!,
                chain: "spark",
                networkId: String(networkId),
            },
            options.appUrl,
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

        return new Web3SparkWallet({
            network: options.network,
            sparkscanApiKey: options.sparkscanApiKey,
            projectId: options.projectId,
            appUrl: options.appUrl,
            key: {
                type: "address",
                address: res.data.address,
                identityPublicKey: res.data.pubKeyHash,
            }
        });
    }

    getNetworkId(): number {
        return this.network === "MAINNET" ? 1 : 0;
    }

    getAddress(): {
        address: string;
        network: string;
        publicKey: string;
    } {
        return {
            address: this.sparkAddress,
            network: this.network,
            publicKey: this.publicKey,
        };
    }


    async transfer(
        receiverSparkAddress: string,
        amountSats: number,
    ): Promise<string> {
        if (!this.projectId || !this.appUrl) {
            throw new ApiError({
                code: 1,
                info: "Transfer requires projectId and appUrl for authentication",
            });
        }

        try {
            const networkId = this.network === "MAINNET" ? 1 : 0;
            const payload = JSON.stringify({
                receiverSparkAddress,
                amountSats,
            });

            const res: OpenWindowResult = await openWindow(
                {
                    method: "sign-tx",
                    projectId: this.projectId,
                    unsignedTx: payload,
                    partialSign: "false",
                    chain: "spark",
                    networkId: String(networkId),
                },
                this.appUrl,
            );

            if (res.success === false)
                throw new ApiError({
                    code: 3,
                    info: "UserDeclined - User declined the transfer.",
                });

            if (res.data.method !== "sign-tx") {
                throw new ApiError({
                    code: 2,
                    info: "Received the wrong response from the iframe.",
                });
            }

            return res.data.tx;
        } catch (error) {
            throw new ApiError({
                code: 4,
                info: "Failed to transfer: " + error,
            });
        }
    }

    async transferTokens(
        receiverSparkAddress: string,
        tokenIdentifier: Bech32mTokenIdentifier,
        tokenAmount: bigint,
        outputSelectionStrategy?: "SMALL_FIRST" | "LARGE_FIRST",
        selectedOutputs?: OutputWithPreviousTransactionData[],
    ): Promise<string> {
        if (!this.projectId || !this.appUrl) {
            throw new ApiError({
                code: 1,
                info: "Token transfer requires projectId and appUrl for authentication",
            });
        }

        try {
            const networkId = this.network === "MAINNET" ? 1 : 0;
            const payload = JSON.stringify({
                receiverSparkAddress,
                tokenIdentifier,
                tokenAmount: tokenAmount.toString(),
                outputSelectionStrategy,
                selectedOutputs,
            });

            const res: OpenWindowResult = await openWindow(
                {
                    method: "sign-tx",
                    projectId: this.projectId,
                    unsignedTx: payload,
                    partialSign: "false",
                    chain: "spark",
                    networkId: String(networkId),
                },
                this.appUrl,
            );

            if (res.success === false)
                throw new ApiError({
                    code: 3,
                    info: "UserDeclined - User declined the token transfer.",
                });

            if (res.data.method !== "sign-tx") {
                throw new ApiError({
                    code: 2,
                    info: "Received the wrong response from the iframe.",
                });
            }

            return res.data.tx;
        } catch (error) {
            throw new ApiError({
                code: 4,
                info: "Failed to transfer token: " + error,
            });
        }
    }

    async signMessage(message: string, compact?: boolean | undefined) {
        if (!this.projectId || !this.appUrl) {
            throw new ApiError({
                code: 1,
                info: `Sign message requires authentication. Missing: ${!this.projectId ? 'projectId' : ''} ${!this.appUrl ? 'appUrl' : ''}. These must be provided when calling Web3SparkWallet.enable().`,
            });
        }

        try {
            const networkId = this.network === "MAINNET" ? 1 : 0;

            const res: OpenWindowResult = await openWindow(
                {
                    method: "sign-data",
                    projectId: this.projectId,
                    payload: message,
                    address: this.sparkAddress,
                    chain: "spark",
                    networkId: String(networkId),
                },
                this.appUrl,
            );

            if (res.success === false)
                throw new ApiError({
                    code: 3,
                    info: "UserDeclined - User declined to sign message.",
                });

            if (res.data.method !== "sign-data") {
                throw new ApiError({
                    code: 2,
                    info: "Received the wrong response from the iframe.",
                });
            }

            return res.data.signature;
        } catch (error) {
            throw new ApiError({
                code: 6,
                info: "Failed to sign message: " + error,
            });
        }
    }

    async claimStaticDeposit(txId: string): Promise<string | undefined> {
        if (!this.projectId || !this.appUrl) {
            throw new ApiError({
                code: 1,
                info: "Claim deposit requires projectId and appUrl for authentication",
            });
        }

        try {
            const networkId = this.network === "MAINNET" ? 1 : 0;
            const payload = JSON.stringify({
                transactionId: txId,
            });

            const res: OpenWindowResult = await openWindow(
                {
                    method: "claim-deposit",
                    projectId: this.projectId,
                    payload: payload,
                    chain: "spark",
                    networkId: String(networkId),
                },
                this.appUrl,
            );

            if (res.success === false)
                throw new ApiError({
                    code: 3,
                    info: "UserDeclined - User declined the claim deposit.",
                });

            if (res.data.method !== "claim-deposit") {
                throw new ApiError({
                    code: 2,
                    info: "Received the wrong response from the iframe.",
                });
            }

            return res.data.txId;
        } catch (error) {
            throw new ApiError({
                code: 7,
                info: "Failed to claim static deposit: " + error,
            });
        }
    }

    async getBalance(): Promise<{
        balance: bigint;
        tokenBalances: Spark.TokenBalances;
    }> {
        try {
            const response = await this._axiosInstance.get(
                `/address/${this.sparkAddress}?network=${this.network}`,
            );

            const balanceData = response.data;
            const tokenBalancesMap = new Map();

            if (balanceData.tokens && Array.isArray(balanceData.tokens)) {
                for (const token of balanceData.tokens) {
                    tokenBalancesMap.set(token.tokenIdentifier, {
                        balance: BigInt(token.balance),
                        tokenInfo: {
                            tokenPublicKey: token.issuerPublicKey || "",
                            tokenName: token.name || "",
                            tokenTicker: token.ticker || "",
                            decimals: token.decimals || "0",
                            maxSupply: token.maxSupply || "0",
                        },
                    });
                }
            }

            return {
                balance: BigInt(balanceData.balance.btcSoftBalanceSats || 0),
                tokenBalances: tokenBalancesMap,
            };
        } catch (error) {
            throw new ApiError({
                code: 5,
                info: "Failed to fetch balance from API: " + error,
            });
        }
    }

    async getTransfers(
        limit?: number,
        offset?: number,
        asset?: string | null,
        from_timestamp?: string | null,
        to_timestamp?: string | null,
        sort: "created_at" | "updated_at" = "created_at",
        order: "asc" | "desc" = "desc"
    ): Promise<Spark.TransactionsResponse> {
        try {
            const params = new URLSearchParams();
            params.append("network", this.network);

            if (limit !== undefined) params.append("limit", limit.toString());
            if (offset !== undefined) params.append("offset", offset.toString());
            if (asset !== null && asset !== undefined) params.append("asset", asset);
            if (from_timestamp !== null && from_timestamp !== undefined) params.append("from_timestamp", from_timestamp);
            if (to_timestamp !== null && to_timestamp !== undefined) params.append("to_timestamp", to_timestamp);
            params.append("sort", sort);
            params.append("order", order);

            const response = await this._axiosInstance.get(
                `/address/${this.sparkAddress}/transactions?${params.toString()}`
            );

            return {
                transactions: response.data.data || [],
                meta: response.data.meta || { totalItems: 0, limit: 0, offset: 0 }
            };
        } catch (error) {
            throw new ApiError({
                code: 5,
                info: "Failed to fetch address transactions: " + error,
            });
        }
    }
}


