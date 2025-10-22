import { UTxO } from "@meshsdk/common";

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
  appleEnabled?: boolean;
};

export type Web3ProjectWallet = {
  id: string;
  key: string;
  tags: string[];
  projectId: string;
  pubKeyHash: string;
  stakeCredentialHash: string;
};

export type Web3JWTBody = {
  /** User's ID */
  sub: string;
  /** Can contain: 'projectId' or 'dashboard'. */
  scopes: string[];
  /** Issued at */
  iat: number;
  /** Expires at */
  exp: number;
  /** OAuth2 Provider */
  provider: string;
  /** User ID on OAuth2 Provider */
  providerId: string;
  /** Profile picture from OAuth2 Provider */
  avatarUrl: string | null;
  /** Email from OAuth2 Provider */
  email: string | null;
  /** Username from OAuth2 Provider */
  username: string | null;
};

export type Web3AuthProvider = "google" | "discord" | "twitter" | "apple";

export type SponsorshipTxParserPostRequestBody = {
  txHex: string;
  utxos: string;
  address: string;
  sponsorUtxo: string;
  network: "mainnet" | "testnet";
};
