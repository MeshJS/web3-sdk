export type InitWeb3WalletOptions = {
  projectId?: string;
  appUrl?: string;
};

export class Web3EmbeddedWallet {
  projectId?: string;
  appUrl?: string;

  constructor(options: InitWeb3WalletOptions) {
    this.projectId = options.projectId;
    this.appUrl = options.appUrl;
  }
}
