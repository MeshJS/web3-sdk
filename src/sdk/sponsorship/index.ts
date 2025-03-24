import { Web3Sdk } from "..";

export class Sponsorship {
  readonly sdk: Web3Sdk;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    {
      this.sdk = sdk;
    }
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
