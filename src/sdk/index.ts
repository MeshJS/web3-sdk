import axios, { AxiosInstance } from "axios";
import { WalletDeveloperControlled } from "./wallet-developer-controlled/";
import { Web3Project } from "../types";
import { IFetcher, ISubmitter } from "@meshsdk/common";
import { Sponsorship } from "./sponsorship";

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
