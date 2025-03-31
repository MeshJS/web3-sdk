export type Web3Project = {
  id: string;
  name: string;
  whitelistedUrls: string[];
  isActive: boolean;
  credits: number;
  discordOauthClient: string | null;
  discordOauthSecret: string | null;
  twitterOauthClient: string | null;
  twitterOauthSecret: string | null;
  branding: Web3ProjectBranding;
  publicKey: string | null;
  apiKey: string;
};

export type Web3ProjectBranding = {
  name?: string;
  color?: string;
  logoUrl?: string;
  twitterEnabled?: boolean;
  discordEnabled?: boolean;
};

export type Web3ProjectWallet = {
  id: string;
  mnemonicKey: string;
  tags: Web3ProjectWalletTag[];
  projectId: string;
  pubKeyHash: string;
  baseAddressBech32: string;
  preprodBaseAddressBech32: string;
};

export type Web3ProjectWalletTag = {
  id: string;
  projectWalletId: string;
  tag: string;
};

export type Web3ProjectWalletInfo = {
  id: string;
  address: string;
  networkId: 0 | 1;
  tag: string | null;
};
