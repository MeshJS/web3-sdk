import { MeshWallet } from "@meshsdk/wallet";
import { decryptData } from "../../functions";

export default class DeveloperControlledWallets {
  readonly privateKey: string;
  readonly projectId: string;
  readonly apiKey: string;

  constructor({
    privateKey,
    projectId,
    apiKey,
  }: {
    privateKey: string;
    projectId: string;
    apiKey: string;
  }) {
    {
      this.privateKey = privateKey;
      this.projectId = projectId;
      this.apiKey = apiKey;
    }
  }

  async createWallet() {}

  async getWallets() {}

  async getWallet(id: string) {
    // todo: get wallet from db
    const _wallet = {
      id: "a5b5114ae2a9fdc05448e52aa384223d3ec77a964e0257276edb9c18",
      mnemonic: "encryptedMnemonic",
      networkId: 0 as 0 | 1,
    };

    const mnemonic = await decryptData(this.privateKey, _wallet.mnemonic);

    const wallet = new MeshWallet({
      networkId: _wallet.networkId,
      key: {
        type: "mnemonic",
        words: mnemonic.split(" "),
      },
    });
    await wallet.init();

    return wallet;
  }
}
