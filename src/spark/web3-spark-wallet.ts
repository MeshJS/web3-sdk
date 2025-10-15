import { encodeSparkAddress } from "@meshsdk/web3-sdk";
import axios, { AxiosInstance } from "axios";

export type ValidSparkNetwork = "MAINNET" | "REGTEST";

export type CreateSparkWalletOptions = {
  network: ValidSparkNetwork;
  sparkscanApiKey?: string;
  key: {
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

  constructor(options: CreateSparkWalletOptions) {
    this._axiosInstance = axios.create({
      // baseURL: `https://api.sparkscan.io/v1`, // todo, when in SDK, point to sparkscan
      baseURL: `/api/sparkscan/`,
      headers: {
        Authorization: `Bearer ${options.sparkscanApiKey}`,
      },
    });
    this.network = options.network;

    if (options.key.type === "address") {
      this.sparkAddress = options.key.address;
      this.publicKey = options.key.identityPublicKey || "";
    }
  }

  static async enable(
    options: CreateSparkWalletOptions,
  ): Promise<Web3SparkWallet> {
    // todo: default: open iframe, and get wallet info, should return publicKey, this is used for devs integrating spark wallet
    // todo: if address, use address and identityPublicKey, is read only.

    const publicKey =
      "0203602f58ffe4aa2eb2e2a61025e1d2bc5816f6c9fe3b762110becffc34f1cdbd";

    const sparkAddress = encodeSparkAddress({
      identityPublicKey: publicKey,
      network: options.network,
    });

    return new Web3SparkWallet({
      network: options.network,
      key: {
        type: "address",
        address: sparkAddress,
        identityPublicKey: publicKey,
      },
    });
  }

  async spark_getAddress(): Promise<{
    address: string;
    network: string;
    publicKey: string;
  }> {
    return {
      address: this.sparkAddress,
      network: this.network,
      publicKey: this.publicKey,
    };
  }

  async spark_getBalance(): Promise<{
    balance: bigint;
    tokenBalances: Map<
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
    >;
  }> {
    try {
      const response = await this._axiosInstance.get(
        `/balance-address?address=${this.sparkAddress}&network=${this.network}`,
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
        balance: BigInt(balanceData.balance.btcHardBalanceSats || 0),
        tokenBalances: tokenBalancesMap,
      };
    } catch (error) {
      throw new Error("Failed to fetch balance from API:" + error);
    }
  }

  async spark_transfer(
    receiverSparkAddress: string,
    amountSats: string,
  ): Promise<{ txid: string }> {
    // Implement the transfer logic here
    return { txid: "sample_txid" };
  }

  async spark_transferToken(
    receiverSparkAddress: string,
    tokenIdentifier: string,
    tokenAmount: string,
  ): Promise<{ txid: string }> {
    // Implement the token transfer logic here
    return { txid: "sample_token_txid" };
  }
}

// import { SparkWallet } from "@buildonspark/spark-sdk";

// export type ValidSparkNetwork = "MAINNET" | "REGTEST" | "TESTNET" | "SIGNET";

// export type CreateSparkWalletOptions = {
//   network?: ValidSparkNetwork;
//   key:
//   | {
//     type: "mnemonic";
//     words: string[];
//   }
//   | {
//     type: "address";
//     address: string;
//     identityPublicKey?: string;
//     depositAddress?: string;
//   };
// };

// export interface SparkTokenBalance {
//   unit: string;
//   balance: bigint;
//   name?: string;
// }

export interface SparkTransaction {
  id: string;
  amount: number;
  status: string;
  timestamp?: Date;
  type?: "sent" | "received";
}

export interface SparkDepositUtxo {
  txid: string;
  vout: number;
}

// export interface SparkWalletData {
//   sparkAddress: string;
//   staticDepositAddress: string;
//   balance: bigint;
//   tokenBalances: Map<string, SparkTokenBalance> | SparkTokenBalance[];
//   transactionHistory: SparkTransaction[];
//   depositUtxos: SparkDepositUtxo[];
//   identityPublicKey: string;
// }

// export interface SparkWalletInfo {
//   network: ValidSparkNetwork;
//   networks?: {
//     mainnet?: SparkWalletData;
//     regtest?: SparkWalletData;
//   };
// }

// export interface SparkClaimResult {
//   success: boolean;
//   message: string;
//   claimResult?: {
//     creditAmountSats: number;
//     transferId: string;
//   };
// }

// export interface SparkDepositClaimRecord {
//   txHash: string;
//   outputIndex: number;
//   sparkAddress: string;
//   walletId: string;
//   claimedAt: string;
//   sparkTransferId?: string;
//   amountSats?: number;
//   network: string;
// }

// export interface SparkTransactionPayload {
//   receiverSparkAddress?: string;
//   amountSats?: number;
//   operation?: "send" | "claim-deposit";
//   transactionId?: string;
// }

// export type SparkOperationResult = string | SparkWalletInfo | SparkClaimResult;

// /**
//  * Web3SparkWallet provides integration layer for Spark wallet functionality within Web3Wallet.
//  * Wraps @buildonspark/spark-sdk with Web3-specific authentication and state management.
//  */
// export class Web3SparkWallet {
//   private _sparkWallet?: SparkWallet;
//   private readonly _isReadOnly: boolean;
//   private readonly _address?: string;
//   private readonly _identityPublicKey?: string;
//   private readonly _network: ValidSparkNetwork;
//   private readonly _mnemonic?: string[];

//   constructor(options: CreateSparkWalletOptions) {
//     this._network = options.network || "REGTEST";

//     if (options.key.type === "mnemonic") {
//       // Store mnemonic for later initialization
//       this._mnemonic = options.key.words;
//       this._isReadOnly = false;
//     } else {
//       // Read-only wallet initialized with just address and identity key
//       this._address = options.key.address;
//       this._identityPublicKey = options.key.identityPublicKey;
//       this._isReadOnly = true;
//     }
//   }

//   /**
//    * Initialize the SparkWallet (required for mnemonic-based wallets)
//    * Similar to how MeshWallet.init() works
//    */
//   async init(): Promise<void> {
//     if (this._isReadOnly || !this._mnemonic) {
//       return;
//     }

//     const sparkWalletResult = await SparkWallet.initialize({
//       mnemonicOrSeed: this._mnemonic.join(" "),
//       options: {
//         network: this._network
//       }
//     });

//     this._sparkWallet = sparkWalletResult.wallet;
//   }

//   /**
//    * Get Spark wallet address
//    */
//   get sparkAddress(): string | undefined {
//     return this._address;
//   }

//   /**
//    * Get Spark wallet for advanced operations
//    */
//   get wallet(): SparkWallet | undefined {
//     return this._sparkWallet;
//   }

//   /**
//    * Get network ID for the current network
//    * @returns 0 for REGTEST, 1 for MAINNET
//    */
//   getNetworkId(): number {
//     return this._network === "MAINNET" ? 1 : 0;
//   }

//   /**
//    * Get wallet information for current network only
//    */
//   async getWalletInfo(): Promise<SparkWalletData> {
//     if (this._isReadOnly) {
//       throw new Error("Cannot get full wallet info with a read-only wallet. Use authentication-based approach instead.");
//     }

//     if (!this._sparkWallet) {
//       throw new Error("Wallet not initialized properly.");
//     }

//     const [sparkAddress, staticDepositAddress, identityPublicKey, balanceData, transactionHistory] = await Promise.all([
//       this._sparkWallet.getSparkAddress(),
//       this._sparkWallet.getStaticDepositAddress(),
//       this._sparkWallet.getIdentityPublicKey(),
//       this._sparkWallet.getBalance(),
//       this._sparkWallet.getTransfers?.() || Promise.resolve([])
//     ]);

//     const depositUtxos = await this._sparkWallet.getUtxosForDepositAddress(staticDepositAddress);
//     const depositUtxosData: SparkDepositUtxo[] = depositUtxos ?
//       depositUtxos.map((utxo: any) => ({
//         txid: utxo.txid,
//         vout: utxo.vout
//       })).filter((utxo) => utxo.txid && utxo.vout !== undefined) : [];

//     // Transform token balances
//     const transformedTokenBalances: SparkTokenBalance[] = [];
//     if (balanceData.tokenBalances && balanceData.tokenBalances.size > 0) {
//       for (const [unit, tokenData] of balanceData.tokenBalances) {
//         transformedTokenBalances.push({
//           unit: unit.toString(),
//           balance: tokenData.balance,
//           name: tokenData.tokenMetadata?.tokenName
//         });
//       }
//     }

//     // Transform transaction history
//     const transformedHistory: SparkTransaction[] = [];
//     const transferArray: any[] = Array.isArray(transactionHistory)
//       ? transactionHistory
//       : transactionHistory?.transfers || [];

//     for (const tx of transferArray) {
//       transformedHistory.push({
//         id: tx.id,
//         amount: tx.totalValue,
//         status: tx.status,
//         timestamp: tx.createdTime ? new Date(tx.createdTime) : undefined,
//         type: tx.transferDirection === 'OUTGOING' ? 'sent' : 'received'
//       });
//     }

//     return {
//       sparkAddress,
//       staticDepositAddress,
//       balance: balanceData.balance,
//       tokenBalances: transformedTokenBalances,
//       transactionHistory: transformedHistory,
//       depositUtxos: depositUtxosData,
//       identityPublicKey
//     };
//   }

//   /**
//    * Get identity public key
//    */
//   async getIdentityPublicKey(): Promise<string> {
//     if (this._isReadOnly && this._identityPublicKey) {
//       return this._identityPublicKey;
//     }

//     if (!this._sparkWallet) {
//       throw new Error("Wallet not initialized properly.");
//     }

//     return this._sparkWallet.getIdentityPublicKey();
//   }

//   /**
//    * Get static deposit address
//    */
//   async getStaticDepositAddress(): Promise<string> {
//     if (this._isReadOnly) {
//       throw new Error("Cannot get deposit address from a read-only wallet.");
//     }

//     if (!this._sparkWallet) {
//       throw new Error("Wallet not initialized properly.");
//     }

//     return this._sparkWallet.getStaticDepositAddress();
//   }

//   /**
//    * Claim Bitcoin deposit
//    */
//   async claimBitcoinDeposit(transactionId: string): Promise<any> {
//     if (this._isReadOnly) {
//       throw new Error("Cannot claim deposits with a read-only wallet.");
//     }

//     if (!this._sparkWallet) {
//       throw new Error("Wallet not initialized properly.");
//     }

//     try {
//       // Step 1: Get a quote for your deposit (can be called anytime after transaction)
//       const quote = await this._sparkWallet.getClaimStaticDepositQuote(transactionId);

//       // Step 2: Claim the deposit using the quote details
//       // Note: This will only succeed after 3 confirmations on the deposit transaction
//       const claimResult = await this._sparkWallet.claimStaticDeposit({
//         transactionId: transactionId,
//         creditAmountSats: quote.creditAmountSats,
//         sspSignature: quote.signature,
//       });

//       return {
//         success: true,
//         message: `Deposit claimed successfully for ${quote.creditAmountSats} sats`,
//         claimResult: {
//           creditAmountSats: quote.creditAmountSats,
//           transferId: claimResult?.transferId || ''
//         }
//       };
//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';

//       // Handle specific Spark SDK errors
//       if (errorMessage.includes('UTXO is already claimed')) {
//         throw new Error('This transaction has already been claimed. Each Bitcoin transaction can only be claimed once.');
//       }

//       if (errorMessage.includes('InvalidOperationException')) {
//         throw new Error('Invalid claim operation. Please check that the transaction ID is correct and has sufficient confirmations.');
//       }

//       if (errorMessage.includes('StaticDepositQuote failed')) {
//         throw new Error('Unable to get deposit quote. The transaction may not be ready for claiming or may already be processed.');
//       }

//       // Re-throw the original error if we don't have a specific handler
//       throw error;
//     }
//   }

//   /**
//    * Send to another Spark wallet user
//    */
//   async sendToUser(receiverAddress: string, amountSats: number): Promise<string> {
//     if (this._isReadOnly) {
//       throw new Error("Cannot send with a read-only wallet.");
//     }

//     if (!this._sparkWallet) {
//       throw new Error("Wallet not initialized properly.");
//     }

//     const transfer = await this._sparkWallet.transfer({
//       receiverSparkAddress: receiverAddress,
//       amountSats: amountSats,
//     });

//     return transfer.id || 'unknown';
//   }

//   /**
//    * Sign a Spark transaction or perform operations
//    * @param payload - The transaction payload with operation type
//    * @returns The operation result
//    */
//   async signTx(payload: SparkTransactionPayload): Promise<SparkOperationResult> {
//     if (payload.operation === "claim-deposit") {
//       if (!payload.transactionId) {
//         throw new Error("transactionId is required for claim-deposit operation");
//       }
//       return this.claimBitcoinDeposit(payload.transactionId);
//     } else {
//       if (!payload.receiverSparkAddress || !payload.amountSats) {
//         throw new Error("receiverSparkAddress and amountSats are required for transaction signing");
//       }
//       return this.sendToUser(payload.receiverSparkAddress, payload.amountSats);
//     }
//   }

//   /**
//    * Sign a message using the wallet
//    * @param message - The message to be signed
//    * @returns The signature as a string
//    * @throws {Error} If wallet is read-only
//    */
//   async signMessage(message: string): Promise<string> {
//     if (this._isReadOnly) {
//       throw new Error("Cannot sign messages with a read-only wallet.");
//     }

//     if (!this._sparkWallet) {
//       throw new Error("Wallet not initialized properly.");
//     }

//     return this._sparkWallet.signMessageWithIdentityKey(message);
//   }

//   /**
//    * Sign data (placeholder for interface compatibility)
//    */
//   async signData(message: string): Promise<string> {
//     if (this._isReadOnly) {
//       throw new Error("Cannot sign data with a read-only wallet.");
//     }

//     return this.signMessage(message);
//   }

//   /**
//    * Refund a static deposit with fee validation
//    * Enforces minimum 300 sats fee as per Spark best practices
//    * @param params - Refund parameters
//    * @returns Refund result with transaction hex if successful
//    * @throws {Error} If wallet is read-only or not properly initialized
//    */
//   async refundStaticDeposit(params: {
//     depositTransactionId: string;
//     destinationAddress: string;
//     satsPerVbyteFee: number;
//     outputIndex?: number;
//   }): Promise<{
//     success: boolean;
//     message: string;
//     txHex?: string;
//   }> {
//     if (this._isReadOnly) {
//       throw new Error("Cannot refund deposits with a read-only wallet.");
//     }

//     if (!this._sparkWallet) {
//       throw new Error("Wallet not initialized properly.");
//     }

//     const MIN_REFUND_FEE_SATS = 300;

//     if (params.satsPerVbyteFee < MIN_REFUND_FEE_SATS) {
//       return {
//         success: false,
//         message: `Fee must be at least ${MIN_REFUND_FEE_SATS} sats for static deposit refunds`
//       };
//     }

//     try {
//       const txHex = await this._sparkWallet.refundStaticDeposit({
//         depositTransactionId: params.depositTransactionId,
//         destinationAddress: params.destinationAddress,
//         satsPerVbyteFee: params.satsPerVbyteFee,
//         outputIndex: params.outputIndex
//       });

//       return {
//         success: true,
//         message: `Refund transaction created with fee ${params.satsPerVbyteFee} sats/vbyte`,
//         txHex
//       };
//     } catch (error) {
//       return {
//         success: false,
//         message: `Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`
//       };
//     }
//   }
// }
