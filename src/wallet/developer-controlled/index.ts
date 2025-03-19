import { MeshWallet } from "@meshsdk/wallet";
import { decryptData } from "../../functions";
import { SDKWeb3ProjectWallet } from "../../types/core";

export default class DeveloperControlledWallets {
  readonly privateKey: string;
  readonly projectId: string;
  readonly apiKey: string;
  readonly appUrl: string;

  constructor({
    privateKey,
    projectId,
    apiKey,
    appUrl,
  }: {
    privateKey: string;
    projectId: string;
    apiKey: string;
    appUrl?: string;
  }) {
    {
      this.privateKey = privateKey;
      this.projectId = projectId;
      this.apiKey = apiKey;
      this.appUrl = appUrl ? appUrl : "https://web3.meshjs.dev/";
    }
  }

  async createWallet() {
    const newWallet: SDKWeb3ProjectWallet = {};

    const res = await fetch(this.appUrl + "api/project-wallet", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(newWallet),
    });

    const wallet = (await res.json()) as SDKWeb3ProjectWallet;
    // Decide how to return the wallet.
  }

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
