import { MeshWallet } from "@meshsdk/wallet";
import { decryptData, encryptData } from "../../functions";
import { SDKWeb3ProjectWallet } from "../../types/core";
import { deserializeBech32Address } from "@meshsdk/core-cst";

export class DeveloperControlledWallets {
  readonly privateKey: string;
  readonly projectId: string;
  readonly apiKey: string;
  readonly appUrl: string;
  readonly networkId: 0 | 1;
  // project: Web3Project;

  constructor({
    projectId,
    apiKey,
    networkId,
    privateKey,
    appUrl,
  }: {
    projectId: string;
    apiKey: string;
    networkId: 0 | 1;
    privateKey: string;
    appUrl?: string;
  }) {
    {
      this.privateKey = privateKey;
      this.projectId = projectId;
      this.apiKey = apiKey;
      this.appUrl = appUrl ? appUrl : "https://web3.meshjs.dev/";
      this.networkId = networkId;
    }
  }

  async init() {
    // this.project = await getProject(this.projectId);
  }

  async createWallet({ tag }: { tag?: string }) {
    const mnemonic = MeshWallet.brew() as string[];
    const _wallet = new MeshWallet({
      networkId: this.networkId,
      key: {
        type: "mnemonic",
        words: mnemonic,
      },
    });
    await _wallet.init();

    const encryptedMnemonic = await encryptData(
      "this.project.publicKey", // get publicKey from project to encrypt
      mnemonic.join(" ")
    );

    const addresses = await _wallet.getAddresses();
    const address = addresses.baseAddressBech32!;
    const keyHashesMainnet = deserializeBech32Address(address);

    const pubKeyHash = keyHashesMainnet.pubKeyHash;

    const newWallet: SDKWeb3ProjectWallet = {
      id: pubKeyHash,
      address: address,
      mnemonic: encryptedMnemonic,
      networkId: this.networkId,
      tag: tag ? tag.trim() : null,
      projectId: this.projectId,
    };

    console.log(44, newWallet);

    const res = await fetch(this.appUrl + "api/project-wallet", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(newWallet),
    });

    console.log("created wallet", res.status, res.json());

    return _wallet;
  }

  async getWallets() {
    const res = await fetch(
      this.appUrl + "api/project-wallet/" + this.projectId,
      {
        headers: {
          "x-api-key": this.apiKey,
        },
      }
    );
    const wallets: SDKWeb3ProjectWallet[] = await res.json();
  }

  async getWallet(id: string) {
    // todo: get wallet from db
    const _wallet = {
      id: "a5b5114ae2a9fdc05448e52aa384223d3ec77a964e0257276edb9c18",
      mnemonic: JSON.stringify({
        ephemeralPublicKey:
          "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEL2qsOtrwXrq7OJaaBSxiyO2cJ/OIcZ0Ndaq8goz7FwOURjXN3la2pWBX7A3rDWgDc3x2sZL6zy5JiM65o00YOQ==",
        iv: "nHD5Udm3H166JI2k",
        ciphertext:
          "Du2aunbKxqdAfM69yKbb1Qs23NFIX/0RLRVjIZTSD6387Nhe3G8vAHqzaTCmmk4ljsrNa90GEq3l/jABfJXVYIBRpZmDOk+eT0nFhkLC+N3WPf2LS6R6ft2vFXha15CG55OOqLO5KG71+WdBFytk5+6dHXKEYz3e1VbQdhCd5QNbNkd8gfJ04b3gJI5yYNzPYkm/zqyA77dp3mix/Q+ZZ405NjYrjY7JPBLzEjXe",
      }),
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
