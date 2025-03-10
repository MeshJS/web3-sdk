export type MSponsorConfig = {
  sponsorId: string; // one appId can have multiple sponsorId
  walletId: string; // which wallet is sponsoring
  type: "full" | "fee"; // full or network fees only
  maxSponsorAmount: bigint; // max amount to sponsor
};
