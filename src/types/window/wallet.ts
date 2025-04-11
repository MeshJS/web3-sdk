export type WindowWalletReq = {
  networkId: 0 | 1;
  projectId?: string;
  appUrl?: string;
  directTo?: UserControlledWalletDirectTo;
};

export type WindowWalletRes = {
  success: boolean;
  pubKeyHash: string;
  stakeCredentialHash: string;
};

export type UserControlledWalletDirectTo = "google" | "twitter" | "discord";
