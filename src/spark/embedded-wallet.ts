import { SparkWallet } from "@buildonspark/spark-sdk";
import * as Spark from "../types/spark";
import { WalletTransfer } from "../types/spark";

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

    async getWalletInfo(): Promise<Spark.WalletInfo> {
        const sparkAddress = await this.sparkWallet.getSparkAddress();
        const staticDepositAddress = await this.sparkWallet.getStaticDepositAddress();
        const identityPublicKey = await this.sparkWallet.getIdentityPublicKey();

        return {
            sparkAddress,
            staticDepositAddress,
            publicKey: identityPublicKey,
        };
    }

    async signData(payload: string): Promise<string> {
        let message: string;
        let compact: boolean | undefined;
        
        try {
            const parsed = JSON.parse(payload);
            message = parsed.message;
            compact = parsed.compact;
        } catch {
            message = payload;
            compact = undefined;
        }
        
        const result = await this.sparkWallet.signMessageWithIdentityKey(message, compact);
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
        const quote = await this.sparkWallet.getClaimStaticDepositQuote(transactionId);
        const result = await this.sparkWallet.claimStaticDeposit({
            transactionId: transactionId,
            creditAmountSats: quote.creditAmountSats,
            sspSignature: quote.signature,
            outputIndex: quote.outputIndex,
        });
        
        return result?.transferId;
    }
}