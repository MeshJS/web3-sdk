export type UserWalletSettings = {
  wallet: UserWalletSettingsWallet;
};

export type UserWalletSettingsWallet = {
  network: "mainnet" | "preprod";
  authorizedApps?: { url: string }[] | undefined;
};
