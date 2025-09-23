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
  recovery: Web3WalletRecovery;
  cardanoPubKeyHash: string;
  cardanoStakeCredentialHash: string;
  bitcoinPubKeyHash: string;
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
};

export type Web3WalletChains = "cardano" | "bitcoin";
