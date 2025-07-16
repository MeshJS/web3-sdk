import { Web3Sdk } from "..";
import { UTxO, MeshTxBuilder, TxParser } from "@meshsdk/core";
import { CSLSerializer } from "@meshsdk/core-csl";

type SponsorshipConfig = {
  id: string;
  projectId: string;
  projectWalletId: string;
  numUtxosTriggerPrepare: number;
  numUtxosPrepare: number;
  utxoAmount: number;
  sponsorshipInfo: string | null;
};

type SponsorshipOutput = {
  projectWalletId: string;
  txHash: string;
  outputIndex: number;
  createdAt: Date;
  isPending: boolean;
  isSpent: boolean;
};

const CONFIG_DURATION_CONSUME_UTXOS = 1000 * 60; // 1 minute
const meshUniversalStaticUtxo = {
  input: {
    outputIndex: 0,
    txHash: "b280c64936f71a909b395cb46f84e8e22ed04e929e02b0b0ded06a7a805981c0",
  },
  output: {
    address:
      "addr_test1qqdv0gjenpa6rujd54e8hwyr8vma20vn3e0s5yuernxpj2r3cya2a7t7st0dntg4ljdf24ft0yzzqz20t0drdstszvsqm4u0qs",
    amount: [{ unit: "lovelace", quantity: "5000000" }],
  },
};

/**
 * The `Sponsorship` class provides methods to process transaction sponsorships
 */
export class Sponsorship {
  private readonly sdk: Web3Sdk;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    {
      this.sdk = sdk;
    }
  }

  /**
   * Retrieves static information about the sponsorship, including the change address
   * and a predefined UTXO used for sponsorship.
   *
   * @returns An object containing the change address and the static UTXO.
   */
  getStaticInfo() {
    return {
      changeAddress: meshUniversalStaticUtxo.output.address,
      utxo: meshUniversalStaticUtxo,
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
  }: {
    sponsorshipId: string;
    tx: string;
  }): Promise<string> {
    /**
     * get sponsorship config
     */

    const { data, status } = await this.sdk.axiosInstance.post(
      `api/sponsorship/${sponsorshipId}`,
      {
        sponsorshipId,
        txHex: tx,
        projectId: this.sdk.projectId,
        network: this.sdk.network,
      },
    );

    if (status !== 200) {
      throw new Error(
        "Invalid sponsorship ID or failed to fetch sponsorship config",
      );
    }

    const sponsorshipConfig = data as SponsorshipConfig;

    const signedRebuiltTxHex = await this.sponsorTxAndSign({
      txHex: tx,
      config: sponsorshipConfig,
    });

    return signedRebuiltTxHex;
  }

  /**
   * functions to sponsor a transaction and sign it with the sponsor wallet.
   */

  /**
   * This function looks for UTXOs in the sponsor wallet that can be used to sponsor a transaction.
   * If there are not enough UTXOs, it prepares more UTXOs using the `prepareSponsorUtxosTx` method.
   * It then rebuilds the original transaction by adding the selected UTXO as an input (`rebuildTx`) and signs it with the sponsor wallet.
   */
  private async sponsorTxAndSign({
    txHex,
    config,
  }: {
    txHex: string;
    config: SponsorshipConfig;
  }) {
    let prepareUtxo = false;
    let sponsorshipTxHash: string | undefined = undefined;

    const sponsorWallet = await this.getSponsorWallet(config.projectWalletId);
    const sponsorshipWalletUtxos = await sponsorWallet.getUtxos();
    const sponsorshipWalletAddress = await sponsorWallet.getChangeAddress();

    const dbPendingUtxos = await this.dbGetIsPendingUtxo(
      config.projectWalletId,
    );
    const pendingUtxoIds = dbPendingUtxos.map((utxo: any) => {
      return `${utxo.txHash}#${utxo.outputIndex}`;
    });

    console.log("sponsorshipWalletUtxos", sponsorshipWalletUtxos);
    const utxosAvailableAsInput = sponsorshipWalletUtxos.filter((utxo: any) => {
      return (
        utxo.output.amount[0].unit === "lovelace" &&
        utxo.output.amount[0].quantity ===
          (config.utxoAmount * 1000000).toString() &&
        !pendingUtxoIds.includes(
          `${utxo.input.txHash}#${utxo.input.outputIndex}`,
        )
      );
    });

    console.log("UTXOs available as input:", utxosAvailableAsInput);

    // If sponsor wallet's UTXOs set has less than num_utxos_trigger_prepare, trigger to create more UTXOs
    if (utxosAvailableAsInput.length <= config.numUtxosTriggerPrepare) {
      console.log("Preparing more UTXOs");
      prepareUtxo = true;
    }

    // Make more UTXOs if prepareUtxo=true
    if (prepareUtxo) {
      sponsorshipTxHash = await this.prepareSponsorUtxosTx({
        config: config,
      });
      console.log("prepareSponsorUtxosTx txHash:", sponsorshipTxHash);
    }

    let selectedUtxo: UTxO | undefined = undefined;

    // If we just prepared the UTXOs, we can use the sponsorship tx hash as input
    if (sponsorshipTxHash) {
      selectedUtxo = {
        input: {
          txHash: sponsorshipTxHash,
          outputIndex: 0,
        },
        output: {
          amount: [
            {
              unit: "lovelace",
              quantity: (config.utxoAmount * 1000000).toString(),
            },
          ],
          address: sponsorshipWalletAddress as string,
        },
      };

      // and mark this as used
      await this.dbAppendUtxosUsed(config, sponsorshipTxHash, 0);
    }

    // Select a random UTXO that is not used
    while (selectedUtxo === undefined && utxosAvailableAsInput.length > 0) {
      const selectedIndex = Math.floor(
        Math.random() * utxosAvailableAsInput.length,
      );
      const _selectedUtxo = utxosAvailableAsInput[selectedIndex]!;
      utxosAvailableAsInput.splice(selectedIndex, 1);

      const isUtxoUsed = await this.dbGetIfUtxoUsed(
        config.projectWalletId,
        _selectedUtxo.input.txHash,
        _selectedUtxo.input.outputIndex,
      );

      if (!isUtxoUsed) {
        selectedUtxo = _selectedUtxo;
        await this.dbAppendUtxosUsed(
          config,
          selectedUtxo.input.txHash,
          selectedUtxo.input.outputIndex,
        );
      }
    }

    if (selectedUtxo) {
      const rebuiltTxHex = await this.rebuildTx({
        txHex,
        sponsorshipWalletUtxos,
        sponsorshipWalletAddress,
        selectedUtxo,
      });

      const signedRebuiltTxHex = await sponsorWallet.signTx(rebuiltTxHex, true);

      return signedRebuiltTxHex;
    }

    throw new Error("No available UTXOs to sponsor the transaction.");
  }

  private async getSponsorWallet(projectWalletId: string) {
    const networkId = this.sdk.network === "mainnet" ? 1 : 0;
    const wallet = await this.sdk.wallet.getWallet(projectWalletId, networkId);
    return wallet.wallet;
  }

  /**
   * Prepares UTXOs for sponsorship by creating new UTXOs in the sponsor wallet.
   * It uses existing UTXOs that are not the exact sponsor amount and those that have been pending for too long.
   * It creates a transaction that consumes these UTXOs and produces new UTXOs of the specified amount.
   */
  private async prepareSponsorUtxosTx({
    config,
  }: {
    config: SponsorshipConfig;
  }) {
    const wallet = await this.getSponsorWallet(config.projectWalletId);
    const utxos = await wallet.getUtxos();
    const changeAddress = await wallet.getChangeAddress();

    // Get any UTXOs that is not the sponsor amount, use these as inputs to create more UTXOs
    const utxosAsInput = utxos.filter((utxo: any) => {
      return (
        utxo.output.amount[0].unit === "lovelace" &&
        utxo.output.amount[0].quantity !== config.utxoAmount * 1000000
      );
    });
    console.log("UTXOs used as inputs to prepare UTXOs:", utxosAsInput);

    // Get any UTXOs that is the sponsor amount, but has been in pending state for longer than duration_consume_utxos
    const dbPendingUtxos = await this.dbGetIsPendingUtxo(
      config.projectWalletId,
    );

    const pendingUtxosThatAreOld = dbPendingUtxos.filter((utxo: any) => {
      return (
        utxo.isPending &&
        !utxo.isSpent &&
        new Date(utxo.createdAt).getTime() + CONFIG_DURATION_CONSUME_UTXOS <
          Date.now()
      );
    });

    const utxosIdsThatAreOld = pendingUtxosThatAreOld.map((utxo: any) => {
      return `${utxo.txHash}#${utxo.outputIndex}`;
    });

    const utxosNotSpentAfterDuration = utxos.filter((utxo: any) => {
      return (
        utxo.output.amount[0].unit === "lovelace" &&
        utxo.output.amount[0].quantity === config.utxoAmount * 1000000 &&
        utxosIdsThatAreOld.includes(
          `${utxo.input.txHash}#${utxo.input.outputIndex}`,
        )
      );
    });
    console.log("UTXOs pending for too long:", utxosNotSpentAfterDuration);

    // Create transactions to make more UTXOs
    const txBuilder = new MeshTxBuilder({
      fetcher: this.sdk.providerFetcher,
    });

    txBuilder.changeAddress(changeAddress);

    // Add the UTXOs that are not exactly the sponsor amount
    for (let i = 0; i < utxosAsInput.length; i++) {
      const utxo = utxosAsInput[i]!;
      txBuilder.txIn(
        utxo.input.txHash,
        utxo.input.outputIndex,
        utxo.output.amount,
        utxo.output.address,
      );
    }

    // Add the UTXOs that are not spent after duration_consume_utxos
    for (let i = 0; i < utxosNotSpentAfterDuration.length; i++) {
      const utxo = utxosNotSpentAfterDuration[i]!;
      txBuilder.txIn(
        utxo.input.txHash,
        utxo.input.outputIndex,
        utxo.output.amount,
        utxo.output.address,
      );

      await this.dbMarkUtxoAsConsumed(
        config,
        utxo.input.txHash,
        utxo.input.outputIndex,
      );
    }

    // Create UTXO outputs
    for (let i = 0; i < config.numUtxosPrepare; i++) {
      txBuilder.txOut(changeAddress, [
        {
          unit: "lovelace",
          quantity: (config.utxoAmount * 1000000).toString(),
        },
      ]);
    }

    const unsignedTx = await txBuilder.complete();
    const signedTx = await wallet.signTx(unsignedTx);

    const txHash = await this.sdk.providerSubmitter!.submitTx(signedTx);

    console.log("UTXOs after prepareUtxo:", (await wallet.getUtxos()).length);

    return txHash;
  }

  /**
   * Rebuilds the transaction by adding the selected UTXO as an input and collateral.
   * It filters out the static UTXOs from the inputs, collaterals, and outputs.
   */
  private async rebuildTx({
    txHex,
    sponsorshipWalletUtxos,
    sponsorshipWalletAddress,
    selectedUtxo,
  }: {
    txHex: string;
    sponsorshipWalletUtxos: UTxO[];
    sponsorshipWalletAddress: string;
    selectedUtxo: UTxO;
  }) {
    sponsorshipWalletUtxos.push(meshUniversalStaticUtxo);
    sponsorshipWalletUtxos.push(selectedUtxo);

    const serializer = new CSLSerializer();
    const txParser = new TxParser(serializer, this.sdk.providerFetcher);

    const txBuilderBody = await txParser.parse(txHex, sponsorshipWalletUtxos);

    // 1. filter out the static utxos and remove from inputs
    const txInputs = txBuilderBody.inputs.filter((input) => {
      return input.txIn.address !== meshUniversalStaticUtxo.output.address;
    });

    // 2. filter out the static utxos and remove from collaterals
    const txCollateral = txBuilderBody.collaterals.filter((collateral) => {
      return collateral.txIn.address !== meshUniversalStaticUtxo.output.address;
    });

    // 3. filter out the static utxos and remove from outputs
    const txOuts = txBuilderBody.outputs.filter((output) => {
      return output.address !== meshUniversalStaticUtxo.output.address;
    });

    txBuilderBody.inputs = txInputs;
    txBuilderBody.collaterals = txCollateral;
    txBuilderBody.outputs = txOuts;

    const txBuilder = new MeshTxBuilder({
      fetcher: this.sdk.providerFetcher,
    });

    txBuilder.meshTxBuilderBody = txBuilderBody;
    const rebuiltTxHex = await txBuilder
      .changeAddress(sponsorshipWalletAddress)
      .txIn(
        selectedUtxo.input.txHash,
        selectedUtxo.input.outputIndex,
        selectedUtxo.output.amount,
        selectedUtxo.output.address,
        0,
      )
      .txInCollateral(
        selectedUtxo.input.txHash,
        selectedUtxo.input.outputIndex,
        selectedUtxo.output.amount,
        selectedUtxo.output.address,
      )
      .complete();

    const endParser = new TxParser(serializer, this.sdk.providerFetcher);
    const finalTxBody = await endParser.parse(
      rebuiltTxHex,
      sponsorshipWalletUtxos,
    );

    console.log("finalTxBody", finalTxBody);

    const changeOutput = finalTxBody.outputs[finalTxBody.outputs.length - 1];

    if (changeOutput && changeOutput.amount.length > 1) {
      throw new Error("Change output cannot contain tokens");
    }
    return rebuiltTxHex;
  }

  /**
   * DB functions
   */

  private async dbGetIsPendingUtxo(projectWalletId: string) {
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/sponsorship/output/${projectWalletId}/pending`,
    );

    if (status === 200) {
      return data as SponsorshipOutput[];
    }

    throw new Error("Failed to get pending UTXOs");
  }

  private async dbGetIfUtxoUsed(
    projectWalletId: string,
    txHash: string,
    outputIndex: number,
  ) {
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/sponsorship/output/${projectWalletId}/${txHash}/${outputIndex}`,
    );

    if (status === 200) {
      const output = data as SponsorshipOutput;
      return output ? output.isSpent : false;
    }

    throw new Error("Failed to check if UTXO is used");
  }

  private async dbUpdateUtxos(
    projectWalletId: string,
    txHash: string,
    outputIndex: number,
    isPending: boolean = true,
    isSpent: boolean = false,
  ) {
    const { data, status } = await this.sdk.axiosInstance.put(
      `api/sponsorship/output/${projectWalletId}/${txHash}/${outputIndex}`,
      {
        isPending,
        isSpent,
      },
    );

    if (status === 200) {
      return data as SponsorshipOutput;
    }

    throw new Error("Failed to mark UTXO as used");
  }

  private async dbAppendUtxosUsed(
    config: SponsorshipConfig,
    txHash: string,
    outputIndex: number,
  ) {
    return this.dbUpdateUtxos(
      config.projectWalletId,
      txHash,
      outputIndex,
      true,
      false,
    );
  }

  private async dbMarkUtxoAsConsumed(
    config: SponsorshipConfig,
    txHash: string,
    outputIndex: number,
  ) {
    // Mark UTXO as consumed (spent) by calling dbAppendUtxosUsed with isPending=false and isSpent=true
    return this.dbUpdateUtxos(
      config.projectWalletId,
      txHash,
      outputIndex,
      false,
      true,
    );
  }
}
