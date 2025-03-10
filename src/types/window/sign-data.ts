export type WindowSignDataReq = {
  method: "sign-data";
  payload: string;
  networkId: 0 | 1;
  projectId?: string;
};

export type WindowSignDataRes = {
  success: boolean;
  signature: {
    signature: string;
    key: string;
  };
};
