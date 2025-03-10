export type MTransaction = {
  txHash: string;
  status: "building" | "submitted" | "confirmed";
};
