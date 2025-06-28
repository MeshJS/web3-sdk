import { Web3Sdk } from "..";
import { WalletDeveloperControlled } from "../wallet-developer-controlled";

/**
 * The `Sponsorship` class provides methods to manage and interact with sponsorships
 * in the Web3 SDK.
 */
export class Sponsorship {
  readonly sdk: Web3Sdk;
  walletDeveloperControlled: WalletDeveloperControlled;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    {
      this.sdk = sdk;
      this.walletDeveloperControlled = new WalletDeveloperControlled({
        sdk: this.sdk,
      });
    }
  }

  async createSponsorship({
    num_utxos_trigger_prepare,
    num_utxo_prepare,
    duration_consume_utxos,
    utxo_sponsor_amount,
  }: {
    num_utxos_trigger_prepare: number;
    num_utxo_prepare: number;
    duration_consume_utxos: number;
    utxo_sponsor_amount: number;
  }) {
    // todo create sponsorship and save to DB
    const sponsorship = {
      id: "sponsorshipId-uuid",
      num_utxos_trigger_prepare: num_utxos_trigger_prepare,
      num_utxo_prepare: num_utxo_prepare,
      duration_consume_utxos: duration_consume_utxos,
      utxo_sponsor_amount: utxo_sponsor_amount,
    };

    // create mesh developer controlled wallet
    const walletInfo = await this.walletDeveloperControlled.createWallet({
      tags: [sponsorship.id],
    });

    const wallet = await this.walletDeveloperControlled.getWallet(
      walletInfo.id,
      this.sdk.network == "mainnet" ? 1 : 0
    );

    return {
      sponsorship: sponsorship,
      wallet: wallet,
    };
  }

  async getSponsorshipConfig({ sponsorshipId }: { sponsorshipId: string }) {
    // todo read from DB
    const sponsorship = {
      id: sponsorshipId,
      num_utxos_trigger_prepare: 10,
      num_utxo_prepare: 10,
      duration_consume_utxos: 600000,
      utxo_sponsor_amount: 500000,
    };

    const wallets = await this.walletDeveloperControlled.getWalletsByTag(
      sponsorship.id
    );

    if (wallets.length === 0 || wallets.length > 1) {
      throw new Error(
        "No wallet found or multiple wallets found for sponsorship"
      );
    }

    return {
      sponsorship: sponsorship,
      wallet: wallets[0]!,
    };
  }

  /**
   * Sponsors a transaction by associating it with a specific sponsorship ID and optionally
   * modifying its fee-related parameters.
   *
   * @param params - The parameters for sponsoring the transaction.
   * @param params.sponsorshipId - The unique identifier for the sponsorship.
   * @param params.tx - The transaction in CBOR format to be sponsored.
   * @param params.feeChangeAddress - (Optional) Either `feeChangeAddress` or `feeOutputIndex`. The address to which any change from the fee will be sent, the fee balance will be the first output with this address.
   * @param params.feeOutputIndex - (Optional) Either `feeChangeAddress` or `feeOutputIndex`. The index of the output in the transaction where the fee is specified, the fee balanace will combine with the output with this index.
   * @returns A promise that resolves to the new transaction in CBOR format after sponsorship.
   */
  async sponsorTx({
    sponsorshipId,
    tx,
    feeChangeAddress,
    feeOutputIndex,
  }: {
    sponsorshipId: string;
    tx: string;
    feeChangeAddress?: string;
    feeOutputIndex?: number;
  }): Promise<string> {
    return "newTxCbor";
  }

  /**
   * Prepares a sponsorship policy.
   *
   * @param params - An object containing the sponsorship details.
   * @param params.sponsorshipId - The unique identifier of the sponsorship to prepare.
   * @returns A promise that resolves when the sponsorship preparation is complete.
   */
  async prepareSponsorship({
    sponsorshipId,
  }: {
    sponsorshipId: string;
  }): Promise<boolean> {
    return true;
  }

  async getSponsorshipStatus({
    sponsorshipId,
  }: {
    sponsorshipId: string;
  }): Promise<{}> {
    return {};
  }
}
