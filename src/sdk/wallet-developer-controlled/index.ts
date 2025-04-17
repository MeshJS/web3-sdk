import { Web3Sdk } from "..";
import { MeshWallet } from "@meshsdk/wallet";
import { decryptWithPrivateKey, encryptWithPublicKey } from "../../functions";
import { Web3ProjectWallet } from "../../types";
import { deserializeBech32Address } from "@meshsdk/core-cst";
import { v4 as uuidv4 } from "uuid";

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
   * Creates a new wallet associated with the current project.
   * This method generates a new wallet encrypts it with the project's public key, and registers the wallet with the backend service.
   *
   * @param {Object} [options] - Optional parameters for wallet creation.
   * @param {string} [options.tag] - An optional tag to associate with the wallet.
   *
   * @returns {Promise<MeshWallet>} A promise that resolves to the created wallet instance.
   *
   * @throws {Error} If the project's public key is not found.
   * @throws {Error} If the wallet creation request to the backend fails.
   */
  async createWallet({
    tags,
  }: { tags?: string[] } = {}): Promise<Web3ProjectWallet> {
    const project = await this.sdk.getProject();

    if (!project.publicKey) {
      throw new Error("Project public key not found");
    }

    const mnemonic = MeshWallet.brew() as string[];
    const encryptedMnemonic = await encryptWithPublicKey({
      publicKey: project.publicKey,
      data: mnemonic.join(" "),
    });

    const _wallet = new MeshWallet({
      networkId: 1,
      key: {
        type: "mnemonic",
        words: mnemonic,
      },
      fetcher: this.sdk.providerFetcher,
      submitter: this.sdk.providerSubmitter,
    });
    await _wallet.init();

    const addresses = await _wallet.getAddresses();
    const baseAddressBech32 = addresses.baseAddressBech32!;

    const { pubKeyHash, stakeCredentialHash } =
      deserializeBech32Address(baseAddressBech32);

    // create wallet

    const web3Wallet: Web3ProjectWallet = {
      id: uuidv4(), // todo, to be removed should be generated at DB
      key: encryptedMnemonic,
      tags: tags || [],
      projectId: this.sdk.projectId,
      pubKeyHash: pubKeyHash,
      stakeCredentialHash: stakeCredentialHash,
    };

    const { data, status } = await this.sdk.axiosInstance.post(
      `api/project-wallet`,
      web3Wallet
    );

    if (status === 200) {
      return data as Web3ProjectWallet;
    }

    throw new Error("Failed to create wallet");
  }

  /**
   * Retrieves a list of wallets associated with the current project.
   *
   * @returns {Promise<Web3ProjectWallet[]>} A promise that resolves to an array of wallets,
   * each containing the wallet's `id`, `address`, `networkId`, and `tag`.
   *
   * @throws {Error} Throws an error if the request to fetch wallets fails.
   */
  async getWallets(): Promise<Web3ProjectWallet[]> {
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}`
    );

    if (status === 200) {
      return data as Web3ProjectWallet[];
    }

    throw new Error("Failed to get wallets");
  }

  /**
   * Retrieves a wallet by its ID and decrypts the key with the project's private key.
   *
   * @param walletId - The unique identifier of the wallet to retrieve.
   * @returns A promise that resolves to an initialized `MeshWallet` instance.
   * @throws Will throw an error if the private key is not found or if the wallet retrieval fails.
   */
  async getWallet(
    walletId: string,
    networkId: 0 | 1
  ): Promise<{
    info: Web3ProjectWallet;
    wallet: MeshWallet;
  }> {
    if (this.sdk.privateKey === undefined) {
      throw new Error("Private key not found");
    }

    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/${walletId}`
    );

    if (status === 200) {
      const web3Wallet = data as Web3ProjectWallet;

      const mnemonic = await decryptWithPrivateKey({
        privateKey: this.sdk.privateKey,
        encryptedDataJSON: web3Wallet.key,
      });

      const wallet = new MeshWallet({
        networkId: networkId,
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

  async getWalletsByTag(tag: string): Promise<Web3ProjectWallet[]> {
    if (this.sdk.privateKey === undefined) {
      throw new Error("Private key not found");
    }

    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/tag/${tag}`
    );

    if (status === 200) {
      const web3Wallets = data as Web3ProjectWallet[];
      return web3Wallets;
    }

    throw new Error("Failed to get wallet");
  }
}
