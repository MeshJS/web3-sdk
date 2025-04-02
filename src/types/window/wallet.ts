export type WindowWalletReq = {
  networkId: 0 | 1;
  projectId?: string;
  appUrl?: string;
};

export type WindowWalletRes = {
  success: boolean;
  pubKeyHash: string;
  stakeCredentialHash: string;
};
