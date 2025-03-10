export type Web3WalletMeta = {
  baseAddressBech32: string;
  enterpriseAddressBech32: string;
  pubKeyHash: string;
  rewardsAddressBech32: string;
  stakeKeyHash: string;
};

export type WindowWalletReq = {
  networkId: 0 | 1;
  projectId?: string;
  appUrl?: string;
};

export type WindowWalletRes = {
  success: boolean;
  wallet: Web3WalletMeta;
};
