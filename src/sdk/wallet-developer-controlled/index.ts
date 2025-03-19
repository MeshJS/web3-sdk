import { Web3Sdk } from "..";
import { MeshWallet } from "@meshsdk/wallet";
import { decryptData, encryptData } from "../../functions";
import { deserializeBech32Address } from "@meshsdk/core-cst";
import { Web3ProjectWallet } from "../../types";

export class WalletDeveloperControlled {
  readonly sdk: Web3Sdk;

  constructor({ sdk }: { sdk: Web3Sdk }) {
    {
      this.sdk = sdk;
    }
  }

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
      return _wallet;
    }

    throw new Error("Failed to create wallet");
  }

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
      });
      await wallet.init();

      return wallet;
    }

    throw new Error("Failed to get wallet");
  }
}
