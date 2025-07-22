import { Web3Sdk } from "..";
import { UTxO, MeshTxBuilder } from "@meshsdk/core";
import { meshUniversalStaticUtxo } from "../index";
import { SponsorshipTxParserPostRequestBody } from "../../types";

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
  getStaticInfo(amount: "5" | "99" = "5") {
    if (this.sdk.network === "mainnet") {
      throw new Error("Sponsorship is not available on mainnet yet.");
    }

    return {
      changeAddress: meshUniversalStaticUtxo.testnet["5"].output.address,
      utxo: meshUniversalStaticUtxo.testnet[amount],
      collateral: meshUniversalStaticUtxo.testnet["5"],
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
  }): Promise<
    { success: true; data: string } | { success: false; error: string }
  > {
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
    console.log("sponsorshipConfig", sponsorshipConfig);

    const signedRebuiltTxHex = await this.sponsorTxAndSign({
      txHex: tx,
      config: sponsorshipConfig,
    });

    return { success: true, data: signedRebuiltTxHex };
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

    console.log("sponsorshipWalletUtxos", sponsorshipWalletUtxos);
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
      let _rebuiltTxHex: string | undefined = undefined;

      // try build transaction with the selected UTXO
      try {
        const body: SponsorshipTxParserPostRequestBody = {
          txHex,
          address: sponsorshipWalletAddress,
          utxos: JSON.stringify(sponsorshipWalletUtxos),
          sponsorUtxo: JSON.stringify(selectedUtxo),
          network: this.sdk.network,
        };

        console.log("Rebuilding transaction with selected UTXO:", body);

        const { data, status } = await this.sdk.axiosInstance.post(
          `api/sponsorship/tx-parser`,
          body,
        );
        if (status !== 200) {
          throw new Error("Failed to parse Tx on server!");
        }

        const { rebuiltTxHex } = data;
        _rebuiltTxHex = rebuiltTxHex;
      } catch (error) {
        // if this fails, it means the UTXO could be used, so we pull from `refreshTxHash` and try again
        console.log("First attempt failed, trying with refreshTxHash", error);

        const { data: resRefreshTxHash, status: refreshStatus } =
          await this.sdk.axiosInstance.get(
            `api/sponsorship/${config.id}/refreshTxHash`,
          );

        if (refreshStatus !== 200 || !resRefreshTxHash.refreshTxHash) {
          throw new Error("Failed to get refresh transaction hash");
        }

        const txHash = resRefreshTxHash.refreshTxHash as string;

        let hasFoundUsableUtxo = false;

        // Try multiple output indices until finding an unused one
        for (
          let attempt = 0;
          attempt < config.numUtxosPrepare && !hasFoundUsableUtxo;
          attempt++
        ) {
          // Select a random output index
          const selectedIndex = Math.floor(
            Math.random() * config.numUtxosPrepare,
          );

          try {
            // Check if this UTXO is already used
            const isUtxoUsed = await this.dbGetIfUtxoUsed(
              config.projectWalletId,
              txHash,
              selectedIndex,
            );

            if (!isUtxoUsed) {
              await this.dbAppendUtxosUsed(config, txHash, selectedIndex);

              // Create a new UTXO
              const newSelectedUtxo: UTxO = {
                input: {
                  txHash: txHash,
                  outputIndex: selectedIndex,
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

              // Try to rebuild the transaction with this UTXO
              const body: SponsorshipTxParserPostRequestBody = {
                txHex,
                address: sponsorshipWalletAddress,
                utxos: JSON.stringify(sponsorshipWalletUtxos),
                sponsorUtxo: JSON.stringify(newSelectedUtxo),
                network: this.sdk.network,
              };

              const { data, status } = await this.sdk.axiosInstance.post(
                `api/sponsorship/tx-parser`,
                body,
              );

              if (status === 200) {
                _rebuiltTxHex = data.rebuiltTxHex;
                hasFoundUsableUtxo = true;
                break;
              }
            }
          } catch (innerError) {
            console.log(`Attempt ${attempt + 1} failed:`, innerError);
          }
        }
      }

      if (_rebuiltTxHex == undefined) {
        throw new Error("Failed to rebuild transaction with selected UTXO.");
      }

      const signedRebuiltTxHex = await sponsorWallet.signTx(
        _rebuiltTxHex,
        true,
      );
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
        parseInt(utxo.output.amount[0].quantity) !== config.utxoAmount * 1000000
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
        parseInt(utxo.output.amount[0].quantity) ===
          config.utxoAmount * 1000000 &&
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

    /**
     * need to detemine total number of balance available in all inputs, both utxosAsInput and utxosNotSpentAfterDuration
     * to determine how many UTXOs we can create
     * This is done by dividing the total balance by the amount of each UTXO
     * and then creating that many UTXOs.
     */

    // Calculate total balance from all inputs
    let totalBalance = 0;

    // Add balance from UTXOs that are not the exact sponsor amount
    for (const utxo of utxosAsInput) {
      const lovelaceAmount = utxo.output.amount.find(
        (amount) => amount.unit === "lovelace",
      );
      if (lovelaceAmount) {
        totalBalance += parseInt(lovelaceAmount.quantity);
      }
    }

    // Add balance from UTXOs that were pending for too long
    for (const utxo of utxosNotSpentAfterDuration) {
      const lovelaceAmount = utxo.output.amount.find(
        (amount) => amount.unit === "lovelace",
      );
      if (lovelaceAmount) {
        totalBalance += parseInt(lovelaceAmount.quantity);
      }
    }

    // Calculate how many UTXOs we can create based on available balance
    const utxoAmountLovelace = config.utxoAmount * 1000000;
    const maxUtxosWeCanCreate = Math.floor(totalBalance / utxoAmountLovelace);

    // Use the minimum of what we want to prepare and what we can actually create
    const numUtxosToCreate = Math.min(
      config.numUtxosPrepare,
      maxUtxosWeCanCreate,
    );

    console.log(`Total balance: ${totalBalance} lovelace`);
    console.log(`UTXO amount: ${utxoAmountLovelace} lovelace`);
    console.log(`Max UTXOs we can create: ${maxUtxosWeCanCreate}`);
    console.log(`UTXOs to create: ${numUtxosToCreate}`);

    // Create UTXO outputs
    for (let i = 0; i < numUtxosToCreate; i++) {
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

    await this.sdk.axiosInstance.post(
      `api/sponsorship/${config.id}/refreshTxHash`,
      {
        txHash: txHash,
      },
    );

    return txHash;
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
