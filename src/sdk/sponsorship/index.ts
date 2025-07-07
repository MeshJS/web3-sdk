import { Web3Sdk } from "..";

/**
 * The `Sponsorship` class provides methods to manage and interact with sponsorships
 * in the Web3 SDK.
 */
export class Sponsorship {
  readonly sdk: Web3Sdk;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    {
      this.sdk = sdk;
    }
  }

  // async createSponsorship({
  //   num_utxos_trigger_prepare,
  //   num_utxos_prepare,
  //   utxo_amount,
  // }: {
  //   num_utxos_trigger_prepare: number;
  //   num_utxos_prepare: number;
  //   utxo_amount: number;
  // }) {
  //   // create mesh developer controlled wallet
  //   const walletInfo = await this.sdk.wallet.createWallet({
  //     tags: ["sponsor"],
  //   });

  //   const wallet = await this.sdk.wallet.getWallet(
  //     walletInfo.id,
  //     this.sdk.network == "mainnet" ? 1 : 0,
  //   );

  //   // todo create sponsorship and save to DB
  //   const sponsorship = {
  //     id: "sponsorshipId-uuid",
  //     projectId: this.sdk.projectId,
  //     projectWalletId: walletInfo.id,
  //     num_utxos_trigger_prepare: num_utxos_trigger_prepare,
  //     num_utxos_prepare: num_utxos_prepare,
  //     utxo_amount: utxo_amount,
  //   };

  //   return {
  //     sponsorship: sponsorship,
  //     wallet: wallet.wallet,
  //     walletInfo: wallet.info,
  //   };
  // }

  // async getSponsorshipConfig({ sponsorshipId }: { sponsorshipId: string }) {
  //   // todo read from DB
  //   const sponsorship = {
  //     id: sponsorshipId,
  //     projectId: this.sdk.projectId,
  //     projectWalletId: "walletInfo.id",
  //     num_utxos_trigger_prepare: 10,
  //     num_utxos_prepare: 10,
  //     utxo_amount: 500000,
  //   };

  //   const wallet = await this.sdk.wallet.getWallet(
  //     sponsorship.projectWalletId,
  //     this.sdk.network == "mainnet" ? 1 : 0,
  //   );

  //   return {
  //     sponsorship: sponsorship,
  //     wallet: wallet.wallet,
  //     walletInfo: wallet.info,
  //   };
  // }

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
  }: {
    sponsorshipId: string;
    tx: string;
  }): Promise<string> {
    console.log(11, "sponsorTx", { sponsorshipId, tx });
    const { data, status } = await this.sdk.axiosInstance.post(
      `api/sponsorship/process`,
      {
        sponsorshipId,
        txHex: tx,
        projectId: this.sdk.projectId,
        network: this.sdk.network,
      },
    );

    console.log(12, "sponsorTx response", { data, status });

    if (status === 200) {
      return data as string;
    }

    throw new Error("Failed to create wallet");
  }

  // /**
  //  * Prepares a sponsorship policy.
  //  *
  //  * @param params - An object containing the sponsorship details.
  //  * @param params.sponsorshipId - The unique identifier of the sponsorship to prepare.
  //  * @returns A promise that resolves when the sponsorship preparation is complete.
  //  */
  // async prepareSponsorship({
  //   sponsorshipId,
  // }: {
  //   sponsorshipId: string;
  // }): Promise<boolean> {
  //   return true;
  // }

  // async getSponsorshipStatus({
  //   sponsorshipId,
  // }: {
  //   sponsorshipId: string;
  // }): Promise<{}> {
  //   return {};
  // }
}
