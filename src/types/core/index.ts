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
  googleOauthClient: string | null;
  googleOauthSecret: string | null;
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
  googleEnabled?: boolean;
};

export type Web3ProjectWallet = {
  id: string;
  key: string;
  tags: string[];
  projectId: string;
  pubKeyHash: string;
  stakeCredentialHash: string;
};
