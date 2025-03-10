export type MSponsorUtxo = {
  txIndex: number;
  lovelaceAmount: bigint;
  accountID: string;
  unspentTransactionID: string;
  spentTransactionID: string;
};
