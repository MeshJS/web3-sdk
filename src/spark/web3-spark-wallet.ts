import { SparkWallet, SparkWalletEvents } from "@buildonspark/spark-sdk";

export type ValidSparkNetwork = "MAINNET" | "REGTEST" | "TESTNET" | "SIGNET";

export type CreateSparkWalletOptions = {
  network?: ValidSparkNetwork;
  key:
  | {
    type: "mnemonic";
    words: string[];
  }
  | {
    type: "address";
    address: string;
    identityPublicKey: string;
    depositAddress?: string;
  };
};

export interface SparkTokenBalance {
  unit: string;
  balance: bigint;
  name?: string;
}

export interface SparkTransaction {
  id: string;
  amount: number;
  status: string;
  timestamp?: Date;
  type?: 'sent' | 'received' | 'claim';
}

export interface SparkWalletData {
  sparkAddress: string;
  staticDepositAddress: string;
  balance: bigint;
  tokenBalances: Map<string, SparkTokenBalance> | SparkTokenBalance[];
  transactionHistory: SparkTransaction[];
  depositTxIds: string[];
  identityPublicKey: string;
}

export interface SparkWalletInfo {
  network: ValidSparkNetwork;
  networks?: {
    mainnet?: SparkWalletData;
    regtest?: SparkWalletData;
  };
}

export interface SparkClaimResult {
  success: boolean;
  message: string;
  claimResult?: {
    creditAmountSats: number;
    transactionId: string;
  };
}

export interface SparkTransactionPayload {
  receiverSparkAddress?: string;
  amountSats?: number;
  operation?: "send" | "claim-deposit";
  transactionId?: string;
}

export type SparkOperationResult = string | SparkWalletInfo | SparkClaimResult;

/**
 * Web3SparkWallet provides integration layer for Spark wallet functionality within Web3Wallet.
 * Wraps @buildonspark/spark-sdk with Web3-specific authentication and state management.
 */
export class Web3SparkWallet {
  private _sparkWallet?: SparkWallet;
  private readonly _isReadOnly: boolean;
  private readonly _address?: string;
  private readonly _identityPublicKey?: string;
  private readonly _network: ValidSparkNetwork;
  private readonly _mnemonic?: string[];

  constructor(options: CreateSparkWalletOptions) {
    this._network = options.network || "REGTEST";

    if (options.key.type === "mnemonic") {
      // Store mnemonic for later initialization
      this._mnemonic = options.key.words;
      this._isReadOnly = false;
    } else {
      // Read-only wallet initialized with just address and identity key
      this._address = options.key.address;
      this._identityPublicKey = options.key.identityPublicKey;
      this._isReadOnly = true;
    }
  }

  /**
   * Initialize the SparkWallet (required for mnemonic-based wallets)
   * Similar to how MeshWallet.init() works
   */
  async init(): Promise<void> {
    if (this._isReadOnly || !this._mnemonic) {
      return;
    }

    const sparkWalletResult = await SparkWallet.initialize({
      mnemonicOrSeed: this._mnemonic.join(" "),
      options: {
        network: this._network
      }
    });

    this._sparkWallet = sparkWalletResult.wallet;
  }

  /**
   * Get Spark wallet address
   */
  get sparkAddress(): string | undefined {
    return this._address;
  }

  /**
   * Get Spark wallet for advanced operations
   */
  get wallet(): SparkWallet | undefined {
    return this._sparkWallet;
  }

  /**
   * Get wallet information for current network only
   */
  async getWalletInfo(): Promise<SparkWalletData> {
    if (this._isReadOnly) {
      throw new Error("Cannot get full wallet info with a read-only wallet. Use authentication-based approach instead.");
    }

    if (!this._sparkWallet) {
      throw new Error("Wallet not initialized properly.");
    }

    const [sparkAddress, staticDepositAddress, balanceData, transactionHistory] = await Promise.all([
      this._sparkWallet.getSparkAddress(),
      this._sparkWallet.getStaticDepositAddress(),
      this._sparkWallet.getBalance(),
      this._sparkWallet.getTransfers?.() || Promise.resolve([])
    ]);
    
    const depositUtxos = await this._sparkWallet.getUtxosForDepositAddress(staticDepositAddress);
    const depositTxIds = depositUtxos ? depositUtxos.map((utxo: any) => utxo.txid).filter(Boolean) : [];

    // Transform token balances
    const transformedTokenBalances: SparkTokenBalance[] = [];
    if (balanceData.tokenBalances && balanceData.tokenBalances.size > 0) {
      for (const [unit, tokenData] of balanceData.tokenBalances) {
        transformedTokenBalances.push({
          unit: unit.toString(),
          balance: tokenData.balance,
          name: tokenData.tokenMetadata?.tokenName
        });
      }
    }

    // Transform transaction history
    const transformedHistory: SparkTransaction[] = [];
    const transferArray: any[] = Array.isArray(transactionHistory)
      ? transactionHistory
      : transactionHistory?.transfers || [];

    for (const tx of transferArray) {
      transformedHistory.push({
        id: tx.id,
        amount: tx.totalValue,
        status: tx.status,
        timestamp: tx.createdTime ? new Date(tx.createdTime) : undefined,
        type: tx.transferDirection === 'OUTGOING' ? 'sent' : 'received'
      });
    }

    return {
      sparkAddress,
      staticDepositAddress,
      balance: balanceData.balance,
      tokenBalances: transformedTokenBalances,
      transactionHistory: transformedHistory,
      depositTxIds,
      identityPublicKey
    };
  }

  /**
   * Get comprehensive wallet information for both networks
   * Queries MAINNET and REGTEST in parallel for seamless network switching
   */
  async getMultiNetworkWalletInfo(): Promise<SparkWalletInfo> {
    if (this._isReadOnly) {
      throw new Error("Cannot get multi-network wallet info with a read-only wallet.");
    }

    // Query both networks in parallel if we have mnemonic
    if (this._mnemonic) {
      try {
        const [mainnetData, regtestData] = await Promise.all([
          this._queryNetworkData("MAINNET"),
          this._queryNetworkData("REGTEST")
        ]);

        return {
          network: this._network,
          networks: {
            mainnet: mainnetData,
            regtest: regtestData
          }
        };
      } catch (error) {
        console.warn("Failed to query multi-network data, returning current network only:", error);
      }
    }

    // Fallback to current network only
    const currentData = await this.getWalletInfo();
    return {
      network: this._network,
      networks: {
        [this._network.toLowerCase()]: currentData
      }
    };
  }

  /**
   * Helper method to query wallet data for a specific network
   */
  private async _queryNetworkData(network: ValidSparkNetwork): Promise<SparkWalletData> {
    const tempWallet = new Web3SparkWallet({
      network,
      key: { type: "mnemonic", words: this._mnemonic || [] }
    });

    await tempWallet.init();
    return tempWallet.getWalletInfo();
  }

  /**
   * Get identity public key
   */
  async getIdentityPublicKey(): Promise<string> {
    if (this._isReadOnly && this._identityPublicKey) {
      return this._identityPublicKey;
    }

    if (!this._sparkWallet) {
      throw new Error("Wallet not initialized properly.");
    }

    return this._sparkWallet.getIdentityPublicKey();
  }

  /**
   * Get static deposit address
   */
  async getStaticDepositAddress(): Promise<string> {
    if (this._isReadOnly) {
      throw new Error("Cannot get deposit address from a read-only wallet.");
    }

    if (!this._sparkWallet) {
      throw new Error("Wallet not initialized properly.");
    }

    return this._sparkWallet.getStaticDepositAddress();
  }

  /**
   * Claim Bitcoin deposit
   */
  async claimBitcoinDeposit(transactionId: string): Promise<any> {
    if (this._isReadOnly) {
      throw new Error("Cannot claim deposits with a read-only wallet.");
    }

    if (!this._sparkWallet) {
      throw new Error("Wallet not initialized properly.");
    }

    try {
      // Step 1: Get a quote for your deposit (can be called anytime after transaction)
      const quote = await this._sparkWallet.getClaimStaticDepositQuote(transactionId);

      // Step 2: Claim the deposit using the quote details
      // Note: This will only succeed after 3 confirmations on the deposit transaction
      const claimResult = await this._sparkWallet.claimStaticDeposit({
        transactionId: transactionId,
        creditAmountSats: quote.creditAmountSats,
        sspSignature: quote.signature,
      });

      return {
        success: true,
        message: `Deposit claimed successfully for ${quote.creditAmountSats} sats`,
        claimResult: {
          creditAmountSats: quote.creditAmountSats,
          transactionId: claimResult?.transferId || ''
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Parse Spark GraphQL errors
      if (errorMessage.includes('UTXO is spent or not found')) {
        return {
          success: false,
          message: `⚠️ This deposit has already been claimed or the UTXO is not found. Transaction ID: ${transactionId}`
        };
      }

      if (errorMessage.includes('InvalidInputException')) {
        return {
          success: false,
          message: `❌ Invalid transaction parameters. Check the transaction ID and try again. Transaction ID: ${transactionId}`
        };
      }

      if (errorMessage.toLowerCase().includes('confirmation')) {
        return {
          success: false,
          message: `⏳ Deposit not ready for claiming. Bitcoin transaction needs 3+ confirmations. Transaction ID: ${transactionId}`
        };
      }

      return {
        success: false,
        message: `❌ Claim failed: ${errorMessage}. Transaction ID: ${transactionId}`
      };
    }
  }

  /**
   * Send to another Spark wallet user
   */
  async sendToUser(receiverAddress: string, amountSats: number): Promise<string> {
    if (this._isReadOnly) {
      throw new Error("Cannot send with a read-only wallet.");
    }

    if (!this._sparkWallet) {
      throw new Error("Wallet not initialized properly.");
    }

    const transfer = await this._sparkWallet.transfer({
      receiverSparkAddress: receiverAddress,
      amountSats: amountSats,
    });

    return transfer.id || 'unknown';
  }

  /**
   * Sign a Spark transaction or perform operations
   * @param payload - The transaction payload with operation type
   * @returns The operation result
   */
  async signTx(payload: SparkTransactionPayload): Promise<SparkOperationResult> {
    if (payload.operation === "claim-deposit") {
      if (!payload.transactionId) {
        throw new Error("transactionId is required for claim-deposit operation");
      }
      return this.claimBitcoinDeposit(payload.transactionId);
    }

    if (payload.operation === "send") {
      if (!payload.receiverSparkAddress || !payload.amountSats) {
        throw new Error("receiverSparkAddress and amountSats are required for send operation");
      }
      return this.sendToUser(payload.receiverSparkAddress, payload.amountSats);
    }

    // Backwards compatibility - treat as send if no operation specified
    if (!payload.receiverSparkAddress || !payload.amountSats) {
      throw new Error("receiverSparkAddress and amountSats are required for transaction signing");
    }

    return this.sendToUser(payload.receiverSparkAddress, payload.amountSats);
  }

  /**
   * Sign a message using the wallet
   * @param message - The message to be signed
   * @returns The signature as a string
   * @throws {Error} If wallet is read-only
   */
  async signMessage(message: string): Promise<string> {
    if (this._isReadOnly) {
      throw new Error("Cannot sign messages with a read-only wallet.");
    }

    if (!this._sparkWallet) {
      throw new Error("Wallet not initialized properly.");
    }

    return this._sparkWallet.signMessageWithIdentityKey(message);
  }

  /**
   * Sign data (placeholder for interface compatibility)
   */
  async signData(message: string): Promise<string> {
    if (this._isReadOnly) {
      throw new Error("Cannot sign data with a read-only wallet.");
    }

    return this.signMessage(message);
  }

  /**
   * Refund a static deposit with fee validation
   * Enforces minimum 300 sats fee as per Spark best practices
   * @param params - Refund parameters
   * @returns Refund result with transaction hex if successful
   * @throws {Error} If wallet is read-only or not properly initialized
   */
  async refundStaticDeposit(params: {
    depositTransactionId: string;
    destinationAddress: string;
    satsPerVbyteFee: number;
    outputIndex?: number;
  }): Promise<{
    success: boolean;
    message: string;
    txHex?: string;
  }> {
    if (this._isReadOnly) {
      throw new Error("Cannot refund deposits with a read-only wallet.");
    }

    if (!this._sparkWallet) {
      throw new Error("Wallet not initialized properly.");
    }

    const MIN_REFUND_FEE_SATS = 300;

    // Early return for validation - best practice for SDK APIs
    if (params.satsPerVbyteFee < MIN_REFUND_FEE_SATS) {
      return {
        success: false,
        message: `Fee must be at least ${MIN_REFUND_FEE_SATS} sats for static deposit refunds`
      };
    }

    try {
      const txHex = await this._sparkWallet.refundStaticDeposit({
        depositTransactionId: params.depositTransactionId,
        destinationAddress: params.destinationAddress,
        satsPerVbyteFee: params.satsPerVbyteFee,
        outputIndex: params.outputIndex
      });

      return {
        success: true,
        message: `Refund transaction created with fee ${params.satsPerVbyteFee} sats/vbyte`,
        txHex
      };
    } catch (error) {
      return {
        success: false,
        message: `Refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Add event listener for wallet events
   * @param event - Event name to listen for
   * @param listener - Callback function
   * @returns This instance for chaining
   */
  on(event: keyof SparkWalletEvents, listener: any): this {
    if (!this._sparkWallet) {
      throw new Error("Wallet not initialized. Call init() first.");
    }
    this._sparkWallet.on(event, listener);
    return this;
  }

  /**
   * Add one-time event listener for wallet events
   * @param event - Event name to listen for
   * @param listener - Callback function
   * @returns This instance for chaining
   */
  once(event: keyof SparkWalletEvents, listener: any): this {
    if (!this._sparkWallet) {
      throw new Error("Wallet not initialized. Call init() first.");
    }
    this._sparkWallet.once(event, listener);
    return this;
  }

  /**
   * Remove event listener for wallet events
   * @param event - Event name
   * @param listener - Callback function to remove
   * @returns This instance for chaining
   */
  off(event: keyof SparkWalletEvents, listener: any): this {
    if (!this._sparkWallet) {
      throw new Error("Wallet not initialized. Call init() first.");
    }
    this._sparkWallet.off(event, listener);
    return this;
  }
}