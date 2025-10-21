import axios, { AxiosInstance } from "axios";
import { ApiError } from "../wallet-user-controlled";
import { OpenWindowResult } from "../types";
import { openWindow } from "../functions";
import { Bech32mTokenIdentifier } from "@buildonspark/spark-sdk";
import * as Spark from "../types/spark";
import { WalletTransfer, SparkAddressFormat, BalanceWithMetadata, TokenBalanceWithMetadata } from "../types/spark";

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

/**
 * Web3SparkWallet - Spark Wallet Implementation for Mesh Web3 SDK
 * 
 * Provides Spark Wallet API-compliant implementation for Bitcoin Layer 2 operations,
 * token transfers, and message signing as part of the Mesh Web3 SDK.
 * 
 * @example
 * ```typescript
 * // Initialize wallet
 * const wallet = await Web3SparkWallet.enable({
 *   network: "REGTEST",
 *   projectId: "your-project-id",
 *   appUrl: "https://your-app.com"
 * });
 * 
 * // Get wallet information
 * const address = await wallet.getSparkAddress();
 * const publicKey = await wallet.getIdentityPublicKey();
 * const balance = await wallet.getBalance();
 * 
 * // Transfer Bitcoin
 * const txId = await wallet.transfer({
 *   receiverSparkAddress: "spark1q...",
 *   amountSats: 100000
 * });
 * ```
 */
export class Web3SparkWallet {
    private readonly _axiosInstance: AxiosInstance;
    readonly network: ValidSparkNetwork;
    private sparkAddress: string = "";
    private publicKey: string = "";
    private projectId?: string;
    private appUrl?: string;

    constructor(options: EnableSparkWalletOptions) {
        this._axiosInstance = axios.create({
            baseURL: options.baseUrl || "https://api.sparkscan.io",
            headers: {
                Accept: "application/json",
                ...(options.sparkscanApiKey && {
                    Authorization: `Bearer ${options.sparkscanApiKey}`
                }),
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

    /**
     * Enables and initializes a Web3SparkWallet instance
     * @param options - Configuration options for the wallet
     * @param options.network - Network to connect to ("MAINNET" | "REGTEST")
     * @param options.sparkscanApiKey - Optional API key for Sparkscan
     * @param options.projectId - Project ID for authentication
     * @param options.appUrl - Application URL for iframe communication
     * @param options.baseUrl - Optional custom base URL for API calls
     * @param options.key - Optional pre-existing wallet key information
     * @returns Promise resolving to an initialized Web3SparkWallet instance
     * @throws ApiError if wallet initialization fails or user declines
     */
    static async enable(
        options: EnableSparkWalletOptions,
    ): Promise<Web3SparkWallet> {
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

    // Spark-compliant API methods
    /**
     * Gets the identity public key of the wallet
     * @returns Promise resolving to the identity public key as a hex string
     * @throws ApiError if authentication is required and not provided
     * @see https://docs.spark.money/wallet/documentation/api-reference#getidentitypublickey
     */
    async getIdentityPublicKey(): Promise<string> {
        if (this.publicKey) {
            return this.publicKey;
        }

        if (!this.projectId || !this.appUrl) {
            throw new ApiError({
                code: 1,
                info: "getIdentityPublicKey requires projectId and appUrl for authentication",
            });
        }

        const networkId = this.network === "MAINNET" ? 1 : 0;
        const res: OpenWindowResult = await openWindow(
            {
                method: "get-wallet-info",
                projectId: this.projectId,
                chain: "spark",
                networkId: String(networkId),
            },
            this.appUrl,
        );

        if (res.success === false)
            throw new ApiError({
                code: 3,
                info: "UserDeclined - User declined to get identity public key.",
            });

        if (res.data.method !== "get-wallet-info") {
            throw new ApiError({
                code: 2,
                info: "Received the wrong response from the iframe.",
            });
        }

        this.publicKey = res.data.pubKeyHash;
        return this.publicKey;
    }

    /**
     * Gets the Spark Address of the wallet
     * @returns Promise resolving to the Spark Address as a string
     * @throws ApiError if authentication is required and not provided
     * @see https://docs.spark.money/wallet/documentation/api-reference#getsparkaddress
     */
    async getSparkAddress(): Promise<SparkAddressFormat> {
        if (this.sparkAddress) {
            return this.sparkAddress;
        }

        if (!this.projectId || !this.appUrl) {
            throw new ApiError({
                code: 1,
                info: "getSparkAddress requires projectId and appUrl for authentication",
            });
        }

        const networkId = this.network === "MAINNET" ? 1 : 0;
        const res: OpenWindowResult = await openWindow(
            {
                method: "get-wallet-info",
                projectId: this.projectId,
                chain: "spark",
                networkId: String(networkId),
            },
            this.appUrl,
        );

        if (res.success === false)
            throw new ApiError({
                code: 3,
                info: "UserDeclined - User declined to get Spark address.",
            });

        if (res.data.method !== "get-wallet-info") {
            throw new ApiError({
                code: 2,
                info: "Received the wrong response from the iframe.",
            });
        }

        this.sparkAddress = res.data.address;
        return this.sparkAddress;
    }



    /**
     * Transfers Bitcoin satoshis to another Spark address
     * @param params - Transfer parameters
     * @param params.receiverSparkAddress - The recipient's Spark address
     * @param params.amountSats - Amount to transfer in satoshis
     * @returns Promise resolving to WalletTransfer object with transfer details
     * @throws ApiError if transfer fails or user declines
     * @see https://docs.spark.money/wallet/documentation/api-reference#transfer-params
     */
    async transfer({
        receiverSparkAddress,
        amountSats,
    }: {
        receiverSparkAddress: string;
        amountSats: number;
    }): Promise<WalletTransfer> {
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

            return JSON.parse(res.data.tx) as WalletTransfer;
        } catch (error) {
            throw new ApiError({
                code: 4,
                info: "Failed to transfer: " + error,
            });
        }
    }

    /**
     * Transfers tokens to another Spark address
     * @param params - Token transfer parameters
     * @param params.tokenIdentifier - Bech32m token identifier (e.g., "btkn1...")
     * @param params.tokenAmount - Amount of tokens to transfer (bigint)
     * @param params.receiverSparkAddress - Recipient's Spark address
     * @param params.selectedOutputs - Optional specific outputs for transfer
     * @returns Promise resolving to the transaction ID string
     * @throws ApiError if transfer fails or user declines
     * @see https://docs.spark.money/wallet/documentation/api-reference#transfertokens-params
     */
    async transferTokens({
        tokenIdentifier,
        tokenAmount,
        receiverSparkAddress,
        selectedOutputs,
    }: {
        tokenIdentifier: string;
        tokenAmount: bigint;
        receiverSparkAddress: string;
        selectedOutputs?: any[];
    }): Promise<string> {
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
                tokenAmount: tokenAmount.toString()
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

    /**
     * Signs a message with a specific public key
     * @param message - The message to sign as Uint8Array
     * @param publicKey - The public key to use for signing as Uint8Array
     * @param compact - Optional flag to specify signature format (default: false)
     * @returns Promise resolving to the signature as Uint8Array
     * @throws ApiError if signing fails or user declines
     * @see https://docs.spark.money/wallet/documentation/signing-interface
     */
    async signMessageWithPublicKey(
        message: Uint8Array,
        publicKey: Uint8Array,
        compact?: boolean,
    ): Promise<Uint8Array> {
        if (!this.projectId || !this.appUrl) {
            throw new ApiError({
                code: 1,
                info: "signMessageWithPublicKey requires projectId and appUrl for authentication",
            });
        }

        try {
            const networkId = this.network === "MAINNET" ? 1 : 0;
            const messageString = Buffer.from(message).toString('hex');
            const publicKeyString = Buffer.from(publicKey).toString('hex');

            const payload = JSON.stringify({
                message: messageString,
                publicKey: publicKeyString,
                compact: compact ?? false
            });

            const res: OpenWindowResult = await openWindow(
                {
                    method: "sign-data",
                    projectId: this.projectId,
                    payload: payload,
                    address: this.sparkAddress,
                    chain: "spark",
                    networkId: String(networkId),
                },
                this.appUrl,
            );

            if (res.success === false)
                throw new ApiError({
                    code: 3,
                    info: "UserDeclined - User declined to sign message with public key.",
                });

            if (res.data.method !== "sign-data") {
                throw new ApiError({
                    code: 2,
                    info: "Received the wrong response from the iframe.",
                });
            }

            const signatureHex = res.data.signature.signature;
            return new Uint8Array(Buffer.from(signatureHex, 'hex'));
        } catch (error) {
            throw new ApiError({
                code: 6,
                info: "Failed to sign message with public key: " + error,
            });
        }
    }

    /**
     * Signs a message with the wallet's identity key
     * @param message - The message to sign as Uint8Array
     * @param compact - Optional flag to specify signature format (default: false)
     * @returns Promise resolving to the signature as Uint8Array
     * @throws ApiError if signing fails or user declines
     * @see https://docs.spark.money/wallet/documentation/signing-interface
     */
    async signMessageWithIdentityKey(
        message: Uint8Array,
        compact?: boolean,
    ): Promise<Uint8Array> {
        if (!this.projectId || !this.appUrl) {
            throw new ApiError({
                code: 1,
                info: "signMessageWithIdentityKey requires projectId and appUrl for authentication",
            });
        }

        try {
            const networkId = this.network === "MAINNET" ? 1 : 0;
            const messageString = Buffer.from(message).toString('hex');

            const payload = JSON.stringify({
                message: messageString,
                compact: compact ?? false
            });

            const res: OpenWindowResult = await openWindow(
                {
                    method: "sign-data",
                    projectId: this.projectId,
                    payload: payload,
                    address: this.sparkAddress,
                    chain: "spark",
                    networkId: String(networkId),
                },
                this.appUrl,
            );

            if (res.success === false)
                throw new ApiError({
                    code: 3,
                    info: "UserDeclined - User declined to sign message with identity key.",
                });

            if (res.data.method !== "sign-data") {
                throw new ApiError({
                    code: 2,
                    info: "Received the wrong response from the iframe.",
                });
            }

            const signatureHex = res.data.signature.signature;
            return new Uint8Array(Buffer.from(signatureHex, 'hex'));
        } catch (error) {
            throw new ApiError({
                code: 6,
                info: "Failed to sign message with identity key: " + error,
            });
        }
    }

    /**
     * Claims a static deposit from a Bitcoin transaction
     * @param txId - The transaction ID containing the static deposit
     * @returns Promise resolving to the claim transaction ID or undefined if failed
     * @throws ApiError if claim fails or user declines
     */
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

    /**
     * Gets the wallet balance including Bitcoin and token balances
     * @returns Promise resolving to an object containing:
     *   - balance: Total wallet balance in satoshis (bigint)
     *   - tokenBalances: Map<string, { balance: bigint, bech32mTokenIdentifier: string }>
     *     where the key is the token identifier and value contains:
     *     - balance: Token balance amount (bigint)
     *     - bech32mTokenIdentifier: The bech32m token identifier string
     * @throws ApiError if balance fetching fails
     * @see https://docs.spark.money/wallet/documentation/api-reference#getbalance
     */
    async getBalance(): Promise<{
        balance: bigint;
        tokenBalances: Map<string, { balance: bigint, bech32mTokenIdentifier: string }>;
    }> {
        try {
            const response = await this._axiosInstance.get(
                `address/${this.sparkAddress}?network=${this.network}`,
            );

            const balanceData = response.data as Spark.AddressSummary;
            const tokenBalancesMap = new Map<string, { balance: bigint, bech32mTokenIdentifier: string }>();

            if (balanceData.tokens && Array.isArray(balanceData.tokens)) {
                for (const token of balanceData.tokens) {
                    tokenBalancesMap.set(token.tokenIdentifier, {
                        balance: BigInt(token.balance),
                        bech32mTokenIdentifier: token.tokenIdentifier,
                    });
                }
            }

            return {
                balance: BigInt(balanceData.balance.btcHardBalanceSats || 0),
                tokenBalances: tokenBalancesMap,
            };
        } catch (error) {
            throw new ApiError({
                code: 5,
                info: "Failed to fetch balance from API: " + error,
            });
        }
    }

    /**
     * Gets transaction history for the wallet address
     * @param limit - Optional maximum number of transactions to retrieve
     * @param offset - Optional number of transactions to skip (for pagination)
     * @param asset - Optional asset filter (token identifier)
     * @param from_timestamp - Optional start timestamp filter
     * @param to_timestamp - Optional end timestamp filter
     * @param sort - Sort field ("created_at" | "updated_at", default: "created_at")
     * @param order - Sort order ("asc" | "desc", default: "desc")
     * @returns Promise resolving to Spark.TransactionsResponse containing:
     *   - transactions: Array of transaction objects with txid, direction, amounts, etc.
     *   - meta: Metadata object with totalItems, limit, and offset for pagination
     * @throws ApiError if request fails
     */
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
                `address/${this.sparkAddress}/transactions?${params.toString()}`
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

    /**
     * Gets the latest transaction ID for multiple Bitcoin addresses
     * @param addresses - Array of Bitcoin addresses to check (max 100 addresses)
     * @returns Promise resolving to Spark.LatestTxidResponse with latest transaction IDs
     * @throws ApiError if request fails, no addresses provided, or too many addresses (>100)
     */
    async getLatestTxid(addresses: string[]): Promise<Spark.LatestTxidResponse> {
        try {
            if (addresses.length === 0) {
                throw new ApiError({
                    code: 1,
                    info: "At least one address is required",
                });
            }

            if (addresses.length > 100) {
                throw new ApiError({
                    code: 1,
                    info: "Maximum 100 addresses allowed",
                });
            }

            const response = await this._axiosInstance.post(
                `bitcoin/addresses/latest-txid?network=${this.network}`,
                addresses
            );

            return response.data as Spark.LatestTxidResponse;
        } catch (error) {
            throw new ApiError({
                code: 5,
                info: "Failed to fetch latest transaction IDs: " + error,
            });
        }
    }

    /**
     * Activates a new Spark wallet for the user
     * @returns Promise resolving to wallet activation result containing:
     *   - sparkAddress: The newly created Spark address
     *   - staticDepositAddress: Bitcoin address for receiving deposits
     *   - publicKey: The wallet's public key hash
     * @throws ApiError if activation fails or user declines
     */
    async activateWallet(): Promise<{ sparkAddress: string; staticDepositAddress: string; publicKey: string }> {
        if (!this.projectId || !this.appUrl) {
            throw new ApiError({
                code: 1,
                info: "Activate wallet requires projectId and appUrl",
            });
        }

        const networkId = this.network === "MAINNET" ? 1 : 0;
        const res: OpenWindowResult = await openWindow(
            {
                method: "activate-wallet",
                projectId: this.projectId,
                chain: "spark",
                networkId: String(networkId),
            },
            this.appUrl,
        );

        if (res.success === false)
            throw new ApiError({
                code: 3,
                info: "UserDeclined - User declined to activate Spark wallet.",
            });

        if (res.data.method !== "activate-wallet") {
            throw new ApiError({
                code: 2,
                info: "Received the wrong response from the iframe.",
            });
        }

        this.sparkAddress = res.data.address;
        this.publicKey = res.data.pubKeyHash;

        return {
            sparkAddress: res.data.address,
            staticDepositAddress: res.data.staticDepositAddress,
            publicKey: res.data.pubKeyHash,
        };
    }

    /**
     * Gets the static deposit address (taproot address) associated with your Spark wallet
     * @returns Promise resolving to the taproot deposit address string
     * @throws ApiError if request fails or user declines
     */
    async getStaticDepositAddress(): Promise<string> {
        if (!this.projectId || !this.appUrl) {
            throw new ApiError({
                code: 1,
                info: "Get static deposit address requires projectId and appUrl",
            });
        }

        const networkId = this.network === "MAINNET" ? 1 : 0;
        const res: OpenWindowResult = await openWindow(
            {
                method: "get-deposit-address",
                projectId: this.projectId,
                chain: "spark",
                networkId: String(networkId),
            },
            this.appUrl,
        );

        if (res.success === false)
            throw new ApiError({
                code: 3,
                info: "UserDeclined - User declined to get deposit address.",
            });

        if (res.data.method !== "get-deposit-address") {
            throw new ApiError({
                code: 2,
                info: "Received the wrong response from the iframe.",
            });
        }

        return res.data.staticDepositAddress;
    }

    /**
     * Standardized transaction signing method for wallet bridge interface
     * Provides the same API as other chains (cardano.signTx, bitcoin.signTx)
     * allowing the wallet bridge to use uniform method calls across all chains
     * @param payload - JSON string containing transaction data (receiverSparkAddress, amountSats, optional tokenIdentifier/tokenAmount)
     * @returns Promise resolving to transaction ID string
     * @throws ApiError if transaction fails or user declines
     */
    async signTx(payload: string): Promise<string | WalletTransfer> {
        const data = JSON.parse(payload);

        if (data.tokenIdentifier) {
            return await this.transferTokens({
                tokenIdentifier: data.tokenIdentifier,
                tokenAmount: BigInt(data.tokenAmount),
                receiverSparkAddress: data.receiverSparkAddress,
            });
        } else {
            return await this.transfer({
                receiverSparkAddress: data.receiverSparkAddress,
                amountSats: data.amountSats,
            });
        }
    }

    /**
     * Standardized data signing method for wallet bridge interface
     * Provides the same API as other chains allowing uniform method calls
     * @param message - The message to sign as a string
     * @returns Promise resolving to signature as hex string
     * @throws ApiError if signing fails or user declines
     */
    async signData(message: string): Promise<string> {
        const result = await this.signMessage(message);
        return Buffer.from(result.signature).toString('hex');
    }

    async getNetworkId(): Promise<number> {
        return this.network === "MAINNET" ? 1 : 0;
    }

    /**
     * Gets comprehensive wallet information in a single call via iframe
     * Custom convenience method that combines multiple official Spark API calls:
     * - getSparkAddress()
     * - getIdentityPublicKey() 
     * - getStaticDepositAddress()
     * @returns Promise resolving to complete wallet info including addresses and network
     * @throws ApiError if wallet info retrieval fails or user declines
     * @note This is a Mesh SDK convenience method, not part of official Spark API
     */
    async getWalletInfo(): Promise<Spark.WalletInfo> {
        if (!this.projectId || !this.appUrl) {
            throw new ApiError({
                code: 1,
                info: "getWalletInfo requires projectId and appUrl for authentication",
            });
        }

        const networkId = this.network === "MAINNET" ? 1 : 0;
        const res: OpenWindowResult = await openWindow(
            {
                method: "get-wallet-info",
                projectId: this.projectId,
                chain: "spark",
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
            sparkAddress: res.data.address,
            staticDepositAddress: res.data.staticDepositAddress,
            publicKey: res.data.pubKeyHash,
            networkId: networkId
        };
    }

    /**
     * Gets wallet balance with complete token metadata from Sparkscan API
     * Custom convenience method that enhances the basic getBalance() call
     * with full token metadata (name, ticker, decimals, etc.)
     * @returns Promise resolving to balance with enriched token information
     * @throws ApiError if balance or metadata fetching fails
     * @note This is a Mesh SDK convenience method that enriches official Spark API data
     */
    async getBalanceWithMetadata(): Promise<BalanceWithMetadata> {
        try {
            const response = await this._axiosInstance.get(
                `address/${this.sparkAddress}?network=${this.network}`,
            );

            const balanceData = response.data as Spark.AddressSummary;
            const tokenBalancesWithMetadata: TokenBalanceWithMetadata[] = [];

            if (balanceData.tokens && Array.isArray(balanceData.tokens)) {
                for (const token of balanceData.tokens) {
                    tokenBalancesWithMetadata.push({
                        tokenIdentifier: token.tokenIdentifier,
                        balance: BigInt(token.balance),
                        bech32mTokenIdentifier: token.tokenIdentifier,
                        metadata: {
                            name: token.name,
                            ticker: token.ticker,
                            decimals: token.decimals,
                            issuerPublicKey: token.issuerPublicKey,
                            maxSupply: token.maxSupply ? BigInt(token.maxSupply) : null,
                            isFreezable: token.isFreezable,
                        }
                    });
                }
            }

            return {
                balance: BigInt(balanceData.balance.btcHardBalanceSats || 0),
                tokenBalances: tokenBalancesWithMetadata,
            };
        } catch (error) {
            throw new ApiError({
                code: 5,
                info: "Failed to fetch balance with metadata from API: " + error,
            });
        }
    }

    /**
     * Signs a text message with the wallet (legacy xverse-style method)
     * @param message - The message to sign as a string
     * @param compact - Optional flag to specify signature format (default: false)
     * @returns Promise resolving to SparkSignMessageResult with signature Uint8Array
     * @throws ApiError if signing fails or user declines
     * @deprecated Private xverse-style method, use signMessageWithIdentityKey for Spark-compliant signing
     */
    private async signMessage(message: string, compact?: boolean): Promise<Spark.SparkSignMessageResult> {
        if (!this.projectId || !this.appUrl) {
            throw new ApiError({
                code: 1,
                info: `Sign message requires authentication. Missing: ${!this.projectId ? 'projectId' : ''} ${!this.appUrl ? 'appUrl' : ''}. These must be provided when calling Web3SparkWallet.enable().`,
            });
        }

        try {
            const networkId = this.network === "MAINNET" ? 1 : 0;

            const payload = JSON.stringify({ message, compact: compact ?? false });
            const res: OpenWindowResult = await openWindow(
                {
                    method: "sign-data",
                    projectId: this.projectId,
                    payload: payload,
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

            const signatureHex = res.data.signature.signature;
            const signatureBytes = new Uint8Array(Buffer.from(signatureHex, 'hex'));

            return { signature: signatureBytes };
        } catch (error) {
            throw new ApiError({
                code: 6,
                info: "Failed to sign message: " + error,
            });
        }
    }

    private getAddress(): {
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
}


