import axios, { AxiosInstance } from "axios";
import { ApiError } from "../wallet-user-controlled";
import { OpenWindowResult, Web3AuthProvider } from "../types";
import * as Spark from "../types/spark";
import { openWindow } from "../functions";
import { getSparkAddressFromPubkey } from "../chains";

export type ValidSparkNetwork = "MAINNET" | "REGTEST";

export type EnableSparkWalletOptions = {
  network: ValidSparkNetwork;
  sparkscanApiKey?: string;
  projectId?: Web3AuthProvider;
  appUrl?: string;
  baseUrl?: string;
  key?: {
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
          Authorization: `Bearer ${options.sparkscanApiKey}`,
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
        method: "enable",
        projectId: options.projectId!,
        directTo: options.projectId!,
        refreshToken: "undefined",
        networkId: String(networkId),
        keepWindowOpen: "false",
      },
      options.appUrl,
    );

    if (res.success === false)
      throw new ApiError({
        code: 3,
        info: "UserDeclined - User declined to enable Spark wallet.",
      });

    if (res.data.method !== "enable") {
      throw new ApiError({
        code: 2,
        info: "Received the wrong response from the iframe.",
      });
    }

    const publicKey = options.network === "MAINNET"
      ? res.data.sparkMainnetPubKeyHash
      : res.data.sparkRegtestPubKeyHash;

    const sparkAddress = getSparkAddressFromPubkey(publicKey, options.network);

    return new Web3SparkWallet({
      network: options.network,
      sparkscanApiKey: options.sparkscanApiKey,
      projectId: options.projectId,
      appUrl: options.appUrl,
      key: {
        type: "address",
        address: sparkAddress,
        identityPublicKey: publicKey,
      },
    });
  }

  /**
   * Create a new token (basic implementation - will be enhanced by SparkTokenIssuer)
   */
  async createToken(params: Spark.TokenCreationParams): Promise<string> {
    if (!this.projectId || !this.appUrl) {
      throw new ApiError({
        code: 1,
        info: "Token creation requires projectId and appUrl for authentication",
      });
    }

    try {
      const networkId = this.network === "MAINNET" ? 1 : 0;

      const res: OpenWindowResult = await openWindow(
        {
          method: "spark-create-token",
          projectId: this.projectId,
          networkId: String(networkId),
          tokenName: params.tokenName,
          tokenTicker: params.tokenTicker,
          decimals: String(params.decimals),
          maxSupply: params.maxSupply.toString(),
          isFreezable: params.isFreezable ? "true" : "false",
        },
        this.appUrl,
      );

      if (res.success === false)
        throw new ApiError({
          code: 3,
          info: "UserDeclined - User declined to create token.",
        });

      if (res.data.method !== "spark-create-token") {
        throw new ApiError({
          code: 2,
          info: "Received the wrong response from the iframe.",
        });
      }

      return res.data.txId || res.data.tokenId || '';
    } catch (error) {
      throw new ApiError({
        code: 4,
        info: "Failed to create token: " + error,
      });
    }
  }

  /**
   * Mint tokens to a specific address (issuer only)
   * @param params - Minting parameters
   * @returns Promise resolving to the mint transaction ID
   */
  async mintTokens(params: Spark.MintTokenParams): Promise<string>;
  /**
   * Mint tokens to a specific address (issuer only) - legacy signature
   * @param tokenIdentifier - The token identifier (btkn1...)
   * @param amount - Amount of tokens to mint in base units
   * @param recipientAddress - Recipient address
   * @returns Promise resolving to the mint transaction ID
   */
  async mintTokens(tokenIdentifier: string, amount: bigint, recipientAddress: string): Promise<string>;
  async mintTokens(
    paramsOrTokenIdentifier: Spark.MintTokenParams | string,
    amount?: bigint,
    recipientAddress?: string
  ): Promise<string> {
    // Handle both signatures
    const params: Spark.MintTokenParams = typeof paramsOrTokenIdentifier === 'string' 
      ? { tokenIdentifier: paramsOrTokenIdentifier, amount: amount!, recipientAddress: recipientAddress! }
      : paramsOrTokenIdentifier;
    if (!this.projectId || !this.appUrl) {
      throw new ApiError({
        code: 1,
        info: "Token minting requires projectId and appUrl for authentication",
      });
    }

    try {
      const networkId = this.network === "MAINNET" ? 1 : 0;

      const res: OpenWindowResult = await openWindow(
        {
          method: "spark-mint-tokens",
          projectId: this.projectId,
          networkId: String(networkId),
          tokenIdentifier: params.tokenIdentifier,
          amount: params.amount.toString(),
          recipientAddress: params.recipientAddress,
        },
        this.appUrl,
      );

      if (res.success === false)
        throw new ApiError({
          code: 3,
          info: "UserDeclined - User declined to mint tokens.",
        });

      if (res.data.method !== "spark-mint-tokens") {
        throw new ApiError({
          code: 2,
          info: "Received the wrong response from the iframe.",
        });
      }

      return res.data.txId;
    } catch (error) {
      throw new ApiError({
        code: 4,
        info: "Failed to mint tokens: " + error,
      });
    }
  }

  /**
   * Freeze a Spark address from transferring tokens
   * Note: Spark does not support clawback, only freeze/unfreeze
   * @param tokenIdentifier - The token identifier (btkn1...)
   * @param address - The Spark address to freeze
   * @param reason - Optional reason for freezing
   * @returns Promise resolving to the freeze transaction ID
   */
  async freezeTokens(tokenIdentifier: string, address: string, reason?: string): Promise<string> {
    if (!this.projectId || !this.appUrl) {
      throw new ApiError({
        code: 1,
        info: "Token freezing requires projectId and appUrl for authentication",
      });
    }

    try {
      const networkId = this.network === "MAINNET" ? 1 : 0;

      const res: OpenWindowResult = await openWindow(
        {
          method: "spark-freeze-address",
          projectId: this.projectId,
          networkId: String(networkId),
          tokenIdentifier,
          address,
          reason,
        },
        this.appUrl,
      );

      if (res.success === false)
        throw new ApiError({
          code: 3,
          info: "UserDeclined - User declined to freeze tokens.",
        });

      if (res.data.method !== "spark-freeze-address") {
        throw new ApiError({
          code: 2,
          info: "Received the wrong response from the iframe.",
        });
      }

      return res.data.txId;
    } catch (error) {
      throw new ApiError({
        code: 4,
        info: "Failed to freeze tokens: " + error,
      });
    }
  }

  /**
   * Unfreeze a Spark address to allow token transfers
   * @param tokenIdentifier - The token identifier (btkn1...)
   * @param address - The Spark address to unfreeze
   * @returns Promise resolving to the unfreeze transaction ID
   */
  async unfreezeTokens(tokenIdentifier: string, address: string): Promise<string> {
    if (!this.projectId || !this.appUrl) {
      throw new ApiError({
        code: 1,
        info: "Token unfreezing requires projectId and appUrl for authentication",
      });
    }

    try {
      const networkId = this.network === "MAINNET" ? 1 : 0;

      const res: OpenWindowResult = await openWindow(
        {
          method: "spark-unfreeze-address",
          projectId: this.projectId,
          networkId: String(networkId),
          tokenIdentifier,
          address,
        },
        this.appUrl,
      );

      if (res.success === false)
        throw new ApiError({
          code: 3,
          info: "UserDeclined - User declined to unfreeze tokens.",
        });

      if (res.data.method !== "spark-unfreeze-address") {
        throw new ApiError({
          code: 2,
          info: "Received the wrong response from the iframe.",
        });
      }

      return res.data.txId;
    } catch (error) {
      throw new ApiError({
        code: 4,
        info: "Failed to unfreeze tokens: " + error,
      });
    }
  }

  /**
   * Burn tokens permanently from circulation
   * @param tokenIdentifier - The token identifier (btkn1...)
   * @param amount - Amount of tokens to burn in base units
   * @returns Promise resolving to the burn transaction ID
   */
  async burnTokens(tokenIdentifier: string, amount: bigint): Promise<string> {
    if (!this.projectId || !this.appUrl) {
      throw new ApiError({
        code: 1,
        info: "Token burning requires projectId and appUrl for authentication",
      });
    }

    try {
      const networkId = this.network === "MAINNET" ? 1 : 0;

      const res: OpenWindowResult = await openWindow(
        {
          method: "spark-burn-tokens",
          projectId: this.projectId,
          networkId: String(networkId),
          tokenIdentifier,
          amount: amount.toString(),
        },
        this.appUrl,
      );

      if (res.success === false)
        throw new ApiError({
          code: 3,
          info: "UserDeclined - User declined to burn tokens.",
        });

      if (res.data.method !== "spark-burn-tokens") {
        throw new ApiError({
          code: 2,
          info: "Received the wrong response from the iframe.",
        });
      }

      return res.data.txId;
    } catch (error) {
      throw new ApiError({
        code: 4,
        info: "Failed to burn tokens: " + error,
      });
    }
  }

  /**
   * Transfer Spark tokens to a single recipient
   * @param tokenIdentifier - The token identifier (btkn1...)
   * @param recipientAddress - Recipient's Spark address
   * @param amount - Amount to transfer in base units
   * @returns Promise resolving to the transfer transaction ID
   */
  async transferTokens(tokenIdentifier: string, recipientAddress: string, amount: bigint): Promise<string> {
    if (!this.projectId || !this.appUrl) {
      throw new ApiError({
        code: 1,
        info: "Token transfer requires projectId and appUrl for authentication",
      });
    }

    try {
      const networkId = this.network === "MAINNET" ? 1 : 0;

      const res: OpenWindowResult = await openWindow(
        {
          method: "spark-transfer-tokens",
          projectId: this.projectId,
          networkId: String(networkId),
          tokenIdentifier,
          amount: amount.toString(),
          recipientAddress,
        },
        this.appUrl,
      );

      if (res.success === false)
        throw new ApiError({
          code: 3,
          info: "UserDeclined - User declined the token transfer.",
        });

      if (res.data.method !== "spark-transfer-tokens") {
        throw new ApiError({
          code: 2,
          info: "Received the wrong response from the iframe.",
        });
      }

      return res.data.txId;
    } catch (error) {
      throw new ApiError({
        code: 4,
        info: "Failed to transfer tokens: " + error,
      });
    }
  }

  /**
   * Batch transfer Spark tokens to multiple recipients
   * @param tokenIdentifier - The token identifier (btkn1...)
   * @param transfers - Array of recipient addresses and amounts
   * @returns Promise resolving to array of transaction IDs
   */
  async batchTransferTokens(
    tokenIdentifier: string,
    transfers: Array<{ recipientAddress: string; amount: bigint }>
  ): Promise<string[]> {
    if (!this.projectId || !this.appUrl) {
      throw new ApiError({
        code: 1,
        info: "Batch transfer requires projectId and appUrl for authentication",
      });
    }

    try {
      const networkId = this.network === "MAINNET" ? 1 : 0;

      const res: OpenWindowResult = await openWindow(
        {
          method: "spark-batch-transfer",
          projectId: this.projectId,
          networkId: String(networkId),
          tokenIdentifier,
          transfers: JSON.stringify(transfers.map(t => ({
            recipientAddress: t.recipientAddress,
            amount: t.amount.toString(),
          }))),
        },
        this.appUrl,
      );

      if (res.success === false)
        throw new ApiError({
          code: 3,
          info: "UserDeclined - User declined the batch transfer.",
        });

      if (res.data.method !== "spark-batch-transfer") {
        throw new ApiError({
          code: 2,
          info: "Received the wrong response from the iframe.",
        });
      }

      return res.data.txIds || (res.data.txId ? [res.data.txId] : []);
    } catch (error) {
      throw new ApiError({
        code: 4,
        info: "Failed to execute batch transfer: " + error,
      });
    }
  }

  /**
   * Get all token balances for an address using Sparkscan API
   * Follows the official API: GET /v1/address/{address}/tokens
   * @param address - Optional address to query (defaults to wallet address)
   * @returns Promise resolving to AddressTokensResponse with all token balances
   * @see https://docs.sparkscan.io/api/address#get-address-tokens
   */
  async getAddressTokens(address?: string): Promise<Spark.AddressTokensResponse> {
    try {
      const targetAddress = address || this.sparkAddress;
      if (!targetAddress) {
        throw new Error("Address is required");
      }

      const params = new URLSearchParams({
        network: this.network,
      });

      const response = await this._axiosInstance.get<Spark.AddressTokensResponse>(
        `/v1/address/${targetAddress}/tokens?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      throw new ApiError({
        code: 5,
        info: `Failed to get address tokens: ${error}`,
      });
    }
  }


  /**
   * Query token transactions using Sparkscan API
   * Follows the official API: GET /v1/tokens/{identifier}/transactions
   * @param tokenIdentifier - Required token identifier (btkn1...)
   * @param limit - Optional limit (default: 25, max: 100)
   * @param offset - Optional offset for pagination (default: 0)
   * @returns Promise resolving to TokenTransactionsResponse
   * @see https://docs.sparkscan.io/api/tokens#get-token-transactions
   */
  async queryTokenTransactions(
    tokenIdentifier: string,
    limit: number = 25,
    offset: number = 0
  ): Promise<Spark.TokenTransactionsResponse> {
    try {
      if (!tokenIdentifier) {
        throw new Error("Token identifier is required");
      }

      const queryLimit = Math.min(Math.max(1, limit), 100);

      const params = new URLSearchParams({
        network: this.network,
        limit: queryLimit.toString(),
        offset: offset.toString(),
      });

      const response = await this._axiosInstance.get<Spark.TokenTransactionsResponse>(
        `/v1/tokens/${tokenIdentifier}/transactions?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      throw new ApiError({
        code: 5,
        info: `Failed to query token transactions: ${error}`,
      });
    }
  }
}
