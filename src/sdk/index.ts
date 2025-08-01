import axios, { AxiosInstance } from "axios";
import { WalletDeveloperControlled } from "./wallet-developer-controlled/";
import { Web3Project } from "../types";
import { IFetcher, ISubmitter } from "@meshsdk/common";
import { Sponsorship } from "./sponsorship";

export const meshUniversalStaticUtxo = {
  mainnet: {
    // todo replace with mainnet
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
