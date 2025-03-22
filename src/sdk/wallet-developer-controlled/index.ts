import { Web3Sdk } from "..";
import { MeshWallet } from "@meshsdk/wallet";
import { decryptData, encryptData } from "../../functions";
import { deserializeBech32Address } from "@meshsdk/core-cst";
import { Web3ProjectWallet } from "../../types";

/**
 * The `WalletDeveloperControlled` class provides functionality for managing developer-controlled wallets
 * within a Web3 project. It allows for creating wallets, retrieving wallet information, and accessing
 * specific wallets using their identifiers.
 */
export class WalletDeveloperControlled {
  readonly sdk: Web3Sdk;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    {
      this.sdk = sdk;
    }
  }

  /**
   * Creates a new wallet for the current project.
   *
   * @param tag - An optional tag to associate with the wallet for identification purposes.
   * @returns A promise that resolves to the created wallet's details, including its ID, address,
   *          encrypted mnemonic, network ID, and associated project ID.
   * @throws An error if the project public key is not found or if the wallet creation fails.
   */
  async createWallet({ tag }: { tag?: string } = {}) {
    const project = await this.sdk.getProject();

    if (!project.publicKey) {
      throw new Error("Project public key not found");
    }

    const mnemonic = MeshWallet.brew() as string[];
    const _wallet = new MeshWallet({
      networkId: this.sdk.networkId,
      key: {
        type: "mnemonic",
        words: mnemonic,
      },
      fetcher: this.sdk.providerFetcher,
      submitter: this.sdk.providerSubmitter,
    });
    await _wallet.init();

    const addresses = await _wallet.getAddresses();
    const address = addresses.baseAddressBech32!;
    const keyHashesMainnet = deserializeBech32Address(address);
    const pubKeyHash = keyHashesMainnet.pubKeyHash;

    const encryptedMnemonic = await encryptData(
      project.publicKey,
      mnemonic.join(" ")
    );

    const web3Wallet: Web3ProjectWallet = {
      id: pubKeyHash,
      address: address,
      mnemonic: encryptedMnemonic,
      networkId: this.sdk.networkId,
      tag: tag ? tag.trim() : null,
      projectId: this.sdk.projectId,
    };

    const { status } = await this.sdk.axiosInstance.post(
      `api/project-wallet`,
      web3Wallet
    );

    if (status === 200) {
      return { info: web3Wallet, wallet: _wallet };
    }

    throw new Error("Failed to create wallet");
  }

  /**
   * Retrieves all wallets associated with the current project.
   *
   * @returns A promise that resolves to an array of wallets, each containing its ID, address,
   *          network ID, and optional tag.
   * @throws An error if the wallet retrieval fails.
   */
  async getWallets() {
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}`
    );

    if (status === 200) {
      const result = data.map((wallet: Web3ProjectWallet) => {
        return {
          id: wallet.id,
          address: wallet.address,
          networkId: wallet.networkId,
          tag: wallet.tag,
        };
      });
      return result as Web3ProjectWallet[];
    }

    throw new Error("Failed to get wallets");
  }

  /**
   * Retrieves a specific wallet by its identifier.
   *
   * @param walletId - The unique identifier of the wallet to retrieve.
   * @returns A promise that resolves to an instance of `MeshWallet` initialized with the wallet's
   *          decrypted mnemonic and other configuration details.
   * @throws An error if the private key is not found or if the wallet retrieval fails.
   */
  async getWallet(walletId: string) {
    if (this.sdk.privateKey === undefined) {
      throw new Error("Private key not found");
    }

    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/${walletId}`
    );

    if (status === 200) {
      const web3Wallet = data as Web3ProjectWallet;

      const mnemonic = await decryptData(
        this.sdk.privateKey,
        web3Wallet.mnemonic
      );

      const wallet = new MeshWallet({
        networkId: this.sdk.networkId,
        key: {
          type: "mnemonic",
          words: mnemonic.split(" "),
        },
        fetcher: this.sdk.providerFetcher,
        submitter: this.sdk.providerSubmitter,
      });
      await wallet.init();

      return { info: web3Wallet, wallet: wallet };
    }

    throw new Error("Failed to get wallet");
  }
}
