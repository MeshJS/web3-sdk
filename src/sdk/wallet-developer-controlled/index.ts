import { Web3Sdk } from "..";
import { MeshWallet } from "@meshsdk/wallet";
import { decryptWithPrivateKey, encryptWithPublicKey } from "../../functions";
import { deserializeBech32Address } from "@meshsdk/core-cst";
import { Web3ProjectWallet, Web3ProjectWalletInfo } from "../../types";

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
  async createWallet({ tag }: { tag?: string } = {}): Promise<{
    info: Web3ProjectWalletInfo;
    wallet: MeshWallet;
  }> {
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

    const encryptedMnemonic = await encryptWithPublicKey(
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
      const walletInfo: Web3ProjectWalletInfo = {
        id: web3Wallet.id,
        address: web3Wallet.address,
        networkId: web3Wallet.networkId,
        tag: web3Wallet.tag,
      };

      return { info: walletInfo, wallet: _wallet };
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
  async getWallets(): Promise<Web3ProjectWalletInfo[]> {
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
      return result as Web3ProjectWalletInfo[];
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
  async getWallet(walletId: string): Promise<{
    info: Web3ProjectWalletInfo;
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

      const mnemonic = await decryptWithPrivateKey(
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

      const walletInfo: Web3ProjectWalletInfo = {
        id: web3Wallet.id,
        address: web3Wallet.address,
        networkId: web3Wallet.networkId,
        tag: web3Wallet.tag,
      };

      return { info: walletInfo, wallet: wallet };
    }

    throw new Error("Failed to get wallet");
  }
}
