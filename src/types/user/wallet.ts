export type userWalletSettings = {
  wallet: userWalletSettingsWallet;
};

export type userWalletSettingsWallet = {
  network: "mainnet" | "preprod";
  authorizedApps?: { url: string }[] | undefined;
};
