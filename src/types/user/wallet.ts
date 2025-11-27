export type UserWalletSettings = {
  wallet: UserWalletSettingsWallet;
};

export type UserWalletSettingsWallet = {
  network: "mainnet" | "preprod";
  authorizedApps?: { url: string }[] | undefined;
};

export type Web3WalletObject = {
  id: string;
  createdAt: string;
  userId: string;
  authShard: string;
  recoveryShardQuestion: string | null;
  recoveryShard: string;
  webauthnCredentialId: string | null;
  cardanoPubKeyHash: string;
  cardanoStakeCredentialHash: string;
  bitcoinMainnetPubKeyHash: string | null;
  bitcoinTestnetPubKeyHash: string | null;
  sparkMainnetPubKeyHash: string | null;
  sparkRegtestPubKeyHash: string | null;
  sparkMainnetStaticDepositAddress: string | null;
  sparkRegtestStaticDepositAddress: string | null;
  projectId: string;
};

export type Web3WalletRecovery = {
  recoveryShard: string;
  recoveryShardQuestion: string;
};

export type Web3WalletKeyHashes = {
  cardanoPubKeyHash: string;
  cardanoStakeCredentialHash: string;
  bitcoinPubKeyHash: string;
  sparkMainnetPubKeyHash: string;
  sparkRegtestPubKeyHash: string;
};
