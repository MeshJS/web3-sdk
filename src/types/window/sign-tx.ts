export type WindowSignTxReq = {
  method: "sign-tx";
  unsignedTx: string;
  networkId: 0 | 1;
  projectId?: string;
};

export type WindowSignTxRes = {
  success: boolean;
  tx: string;
};
