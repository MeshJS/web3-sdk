import { Web3Sdk } from "..";
import { MeshWallet } from "@meshsdk/wallet";
import { decryptWithPrivateKey } from "../../functions";
import { Web3ProjectCardanoWallet, TokenCreationParams } from "../../types";

/**
 * CardanoWalletDeveloperControlled - Manages Cardano-specific developer-controlled wallets
 */
export class CardanoWalletDeveloperControlled {
  readonly sdk: Web3Sdk;

  constructor({
    sdk,
  }: {
    sdk: Web3Sdk;
  }) {
    this.sdk = sdk;
  }

  /**
   * Retrieves all Cardano wallets for the project
   */
  async getWallets(): Promise<Web3ProjectCardanoWallet[]> {
    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/cardano`,
    );

    if (status === 200) {
      return data as Web3ProjectCardanoWallet[];
    }

    throw new Error("Failed to get Cardano wallets");
  }

  /**
   * Retrieves a specific Cardano wallet by ID
   */
  async getWallet(
    walletId: string,
    decryptKey = false,
  ): Promise<{
    info: Web3ProjectCardanoWallet;
    wallet: MeshWallet;
  }> {
    if (this.sdk.privateKey === undefined) {
      throw new Error("Private key not found");
    }

    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/${walletId}?chain=cardano`,
    );

    if (status === 200) {
      const web3Wallet = data as Web3ProjectCardanoWallet;

      const mnemonic = await decryptWithPrivateKey({
        privateKey: this.sdk.privateKey,
        encryptedDataJSON: web3Wallet.key,
      });

      if (decryptKey) {
        web3Wallet.key = mnemonic;
      }

      const networkId = this.sdk.network === "mainnet" ? 1 : 0;
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

    throw new Error("Failed to get Cardano wallet");
  }

  /**
   * Get Cardano wallets by tag
   */
  async getWalletsByTag(tag: string): Promise<Web3ProjectCardanoWallet[]> {
    if (this.sdk.privateKey === undefined) {
      throw new Error("Private key not found");
    }

    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/cardano/tag/${tag}`,
    );

    if (status === 200) {
      return data as Web3ProjectCardanoWallet[];
    }

    throw new Error("Failed to get Cardano wallets by tag");
  }
}
