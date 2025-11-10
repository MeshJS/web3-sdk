import { Web3Sdk } from "..";
import { MeshWallet } from "@meshsdk/wallet";
import { decryptWithPrivateKey, encryptWithPublicKey } from "../../functions";
import { Web3ProjectCardanoWallet } from "../../types";
import { deserializeBech32Address } from "@meshsdk/core-cst";
import { v4 as uuidv4 } from "uuid";

/**
 * CardanoWalletDeveloperControlled - Manages Cardano-specific developer-controlled wallets
 */
export class CardanoWalletDeveloperControlled {
  readonly sdk: Web3Sdk;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    this.sdk = sdk;
  }

  /**
   * Creates a new Cardano wallet associated with the current project.
   */
  async createWallet({
    tags,
  }: { tags?: string[] } = {}): Promise<Web3ProjectCardanoWallet> {
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

    const web3Wallet: Web3ProjectCardanoWallet = {
      id: uuidv4(),
      key: encryptedMnemonic,
      tags: tags || [],
      projectId: this.sdk.projectId,
      pubKeyHash: pubKeyHash,
      stakeCredentialHash: stakeCredentialHash,
    };

    const { data, status } = await this.sdk.axiosInstance.post(
      `api/project-wallet/cardano`,
      web3Wallet,
    );

    if (status === 200) {
      return data as Web3ProjectCardanoWallet;
    }

    throw new Error("Failed to create Cardano wallet");
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
    networkId: 0 | 1,
    decryptKey = false,
  ): Promise<{
    info: Web3ProjectCardanoWallet;
    wallet: MeshWallet;
  }> {
    if (this.sdk.privateKey === undefined) {
      throw new Error("Private key not found");
    }

    const { data, status } = await this.sdk.axiosInstance.get(
      `api/project-wallet/${this.sdk.projectId}/cardano/${walletId}`,
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