import axios, { AxiosInstance } from "axios";
import { WalletDeveloperControlled } from "./wallet-developer-controlled/";
import { Web3Project } from "../types";
import { IFetcher, ISubmitter } from "@meshsdk/common";
import { Sponsorship } from "./sponsorship";
import { Tokenization } from "./tokenization";

export const meshUniversalStaticUtxo = {
  mainnet: {
    "5": {
      input: {
        outputIndex: 0,
        txHash:
          "89e9888acc50ec7cc840f3e44ea06d8db1461dd1ba37218e914fcd171d83e4b8",
      },
      output: {
        address:
          "addr1q8sj3xj6q99m4g9tu9mm2lzzdafy04035eya7hjhpus55r204nlu6dmhgpruq7df228h9gpujt0mtnfcnkcaj3wj457qh5366a",
        amount: [
          {
            unit: "lovelace",
            quantity: "5000000",
          },
        ],
      },
    },
    "99": {
      input: {
        outputIndex: 0,
        txHash:
          "cb058a1402fcbcd98be15de8c44ea1a44211119050e8028d3c81878158a5d29d",
      },
      output: {
        address:
          "addr1q8sj3xj6q99m4g9tu9mm2lzzdafy04035eya7hjhpus55r204nlu6dmhgpruq7df228h9gpujt0mtnfcnkcaj3wj457qh5366a",
        amount: [
          {
            unit: "lovelace",
            quantity: "99000000",
          },
        ],
      },
    },
  },
  testnet: {
    "5": {
      input: {
        outputIndex: 0,
        txHash:
          "5a1edf7da58eff2059030abd456947a96cb2d16b9d8c3822ffff58d167ed8bfc",
      },
      output: {
        address:
          "addr_test1qrsj3xj6q99m4g9tu9mm2lzzdafy04035eya7hjhpus55r204nlu6dmhgpruq7df228h9gpujt0mtnfcnkcaj3wj457q5zv6kz",
        amount: [
          {
            unit: "lovelace",
            quantity: "5000000",
          },
        ],
      },
    },
    "99": {
      input: {
        outputIndex: 0,
        txHash:
          "8222b0327a95e8c357016a5df64d93d7cf8a585a07c55327ae618a7e00d58d9e",
      },
      output: {
        address:
          "addr_test1qrsj3xj6q99m4g9tu9mm2lzzdafy04035eya7hjhpus55r204nlu6dmhgpruq7df228h9gpujt0mtnfcnkcaj3wj457q5zv6kz",
        amount: [
          {
            unit: "lovelace",
            quantity: "99000000",
          },
        ],
      },
    },
  },
};

export class Web3Sdk {
  readonly axiosInstance: AxiosInstance;

  readonly appUrl: string;
  readonly projectId: string;
  readonly apiKey: string;
  readonly privateKey: string | undefined;
  readonly providerFetcher: IFetcher | undefined;
  readonly providerSubmitter: ISubmitter | undefined;
  readonly network: "mainnet" | "testnet";

  project: Web3Project | undefined;
  wallet: WalletDeveloperControlled;
  sponsorship: Sponsorship;
  tokenization: Tokenization;

  constructor({
    appUrl,
    projectId,
    apiKey,
    network,
    privateKey,
    fetcher,
    submitter,
  }: {
    appUrl?: string;
    projectId: string;
    apiKey: string;
    network: "mainnet" | "testnet";
    privateKey?: string;
    fetcher?: IFetcher;
    submitter?: ISubmitter;
  }) {
    this.appUrl = appUrl ? appUrl : "https://utxos.dev/";
    this.projectId = projectId;
    this.apiKey = apiKey;
    this.network = network;
    this.privateKey = privateKey;
    this.providerFetcher = fetcher;
    this.providerSubmitter = submitter;

    this.axiosInstance = axios.create({
      baseURL: this.appUrl,
      headers: { "x-api-key": apiKey },
    });

    this.wallet = new WalletDeveloperControlled({
      sdk: this,
    });
    this.sponsorship = new Sponsorship({
      sdk: this,
    });
    this.tokenization = new Tokenization({
      sdk: this,
    });
  }

  async getProject() {
    if (this.project) {
      return this.project;
    }

    const { data, status } = await this.axiosInstance.get(
      `api/project/${this.projectId}`,
    );

    if (status === 200) {
      this.project = data as Web3Project;
      return this.project;
    }

    throw new Error("Failed to get project");
  }
}

export * from "./sponsorship";
export * from "./wallet-developer-controlled";
