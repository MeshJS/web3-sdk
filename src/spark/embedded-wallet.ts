import {
  Bech32mTokenIdentifier,
  SparkWallet,
  getNetworkFromSparkAddress,
} from "@buildonspark/spark-sdk";
import * as Spark from "../types/spark";
import { WalletTransfer } from "../types/spark";
import { OutputWithPreviousTransactionData } from "@buildonspark/spark-sdk/dist/proto/spark_token";

// TODO: improve this
// Wrapper around SparkWallet for iframe operations,
// similar to how EmbeddedWallet works for Bitcoin
// Handles payload parsing and extracts responses
// instead of cluttering the auth state machine
export class EmbeddedSparkWallet {
  private sparkWallet: SparkWallet;

  constructor(sparkWallet: SparkWallet) {
    this.sparkWallet = sparkWallet;
  }

  async signData(payload: string): Promise<string> {
    const parsed = JSON.parse(payload);
    const message = parsed.message;
    const compact = parsed.compact;

    const result = await this.sparkWallet.signMessageWithIdentityKey(
      message,
      compact,
    );
    return result;
  }

  async signTx(payload: string): Promise<string | WalletTransfer> {
    const transferData = JSON.parse(payload);

    if (transferData.tokenIdentifier) {
      const result = await this.sparkWallet.transferTokens({
        tokenIdentifier: transferData.tokenIdentifier,
        receiverSparkAddress: transferData.receiverSparkAddress,
        tokenAmount: BigInt(transferData.tokenAmount),
        outputSelectionStrategy: transferData.outputSelectionStrategy,
        selectedOutputs: transferData.selectedOutputs,
      });
      return result;
    } else {
      const result = await this.sparkWallet.transfer({
        receiverSparkAddress: transferData.receiverSparkAddress,
        amountSats: transferData.amountSats,
      });
      return result;
    }
  }

  async claimDeposit(transactionId: string): Promise<string | undefined> {
    const quote =
      await this.sparkWallet.getClaimStaticDepositQuote(transactionId);
    const result = await this.sparkWallet.claimStaticDeposit({
      transactionId: transactionId,
      creditAmountSats: quote.creditAmountSats,
      sspSignature: quote.signature,
      outputIndex: quote.outputIndex,
    });

    return result?.transferId;
  }

  // Official Spark API methods
  /**
   * Gets the identity public key of the wallet
   * @returns Promise resolving to the identity public key as a hex string
   * @see https://docs.spark.money/wallet/documentation/api-reference#getidentitypublickey
   */
  async getIdentityPublicKey(): Promise<string> {
    return await this.sparkWallet.getIdentityPublicKey();
  }

  /**
   * Gets the Spark Address of the wallet
   * @returns Promise resolving to the Spark Address as a string
   * @see https://docs.spark.money/wallet/documentation/api-reference#getsparkaddress
   */
  async getSparkAddress(): Promise<string> {
    return await this.sparkWallet.getSparkAddress();
  }

  /**
   * Gets the static deposit address (taproot address) associated with the Spark wallet
   * @returns Promise resolving to the taproot deposit address string
   * @see https://docs.spark.money/wallet/documentation/api-reference#getstaticdepositaddress
   */
  async getStaticDepositAddress(): Promise<string> {
    return await this.sparkWallet.getStaticDepositAddress();
  }

  /**
   * Gets the wallet balance including Bitcoin and token balances
   * @returns Promise resolving to balance and token balances map
   * @see https://docs.spark.money/wallet/documentation/api-reference#getbalance
   */
  async getBalance(): Promise<{
    balance: bigint;
    tokenBalances: Map<
      string,
      { balance: bigint; bech32mTokenIdentifier: string }
    >;
  }> {
    const balanceResult = await this.sparkWallet.getBalance();

    // Convert the balance to the expected format
    const tokenBalancesMap = new Map<
      string,
      { balance: bigint; bech32mTokenIdentifier: string }
    >();

    if (
      balanceResult.tokenBalances &&
      Array.isArray(balanceResult.tokenBalances)
    ) {
      for (const token of balanceResult.tokenBalances) {
        tokenBalancesMap.set(token.tokenIdentifier, {
          balance: BigInt(token.balance),
          bech32mTokenIdentifier: token.tokenIdentifier,
        });
      }
    }

    return {
      balance: BigInt(balanceResult.balance),
      tokenBalances: tokenBalancesMap,
    };
  }

  /**
   * Gets the network ID of the wallet
   * @returns Promise resolving to network ID (0 for regtest, 1 for mainnet)
   */
  async getNetworkId(): Promise<number> {
    const address = await this.sparkWallet.getSparkAddress();
    const network = getNetworkFromSparkAddress(address);
    return network === "MAINNET" ? 1 : 0;
  }

  /**
   * Signs a message with the wallet's identity key
   * @param message - The message to sign as Uint8Array
   * @param compact - Optional flag to specify signature format
   * @returns Promise resolving to the signature as Uint8Array
   * @see https://docs.spark.money/wallet/documentation/signing-interface
   */
  async signMessageWithIdentityKey(
    message: Uint8Array,
    compact?: boolean,
  ): Promise<Uint8Array> {
    const messageString = Buffer.from(message).toString("hex");
    const result = await this.sparkWallet.signMessageWithIdentityKey(
      messageString,
      compact,
    );
    return new Uint8Array(Buffer.from(result, "hex"));
  }

  /**
   * Transfers Bitcoin satoshis to another Spark address
   * @param params - Transfer parameters
   * @param params.receiverSparkAddress - The recipient's Spark address
   * @param params.amountSats - Amount to transfer in satoshis
   * @returns Promise resolving to WalletTransfer object with transfer details
   * @see https://docs.spark.money/wallet/documentation/api-reference#transfer
   */
  async transfer({
    receiverSparkAddress,
    amountSats,
  }: {
    receiverSparkAddress: string;
    amountSats: number;
  }): Promise<WalletTransfer> {
    return await this.sparkWallet.transfer({
      receiverSparkAddress,
      amountSats,
    });
  }

  /**
   * Transfers tokens to another Spark address
   * @param params - Token transfer parameters
   * @param params.tokenIdentifier - Bech32m token identifier (e.g., "btkn1...")
   * @param params.tokenAmount - Amount of tokens to transfer (bigint)
   * @param params.receiverSparkAddress - Recipient's Spark address
   * @param params.selectedOutputs - Optional specific outputs for transfer
   * @returns Promise resolving to the transaction ID string
   * @see https://docs.spark.money/wallet/documentation/api-reference#transfertokens
   */
  async transferTokens({
    tokenIdentifier,
    tokenAmount,
    receiverSparkAddress,
    selectedOutputs,
  }: {
    tokenIdentifier: Bech32mTokenIdentifier;
    tokenAmount: bigint;
    receiverSparkAddress: string;
    selectedOutputs?: OutputWithPreviousTransactionData[];
  }): Promise<string> {
    return await this.sparkWallet.transferTokens({
      tokenIdentifier,
      tokenAmount,
      receiverSparkAddress,
      outputSelectionStrategy: selectedOutputs ? "SMALL_FIRST" : "LARGE_FIRST",
      selectedOutputs,
    });
  }
}
