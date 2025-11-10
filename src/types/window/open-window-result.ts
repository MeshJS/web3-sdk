import { UserSocialData } from "../user";

export type OpenWindowResult =
  | {
      success: true;
      data:
        | {
            method: "enable";
            bitcoinPubKeyHash: string;
            cardanoPubKeyHash: string;
            cardanoStakeCredentialHash: string;
            sparkMainnetPubKeyHash: string;
            sparkRegtestPubKeyHash: string;
            user: UserSocialData;
          }
        | {
            method: "export-wallet";
          }
        | {
            method: "disable";
          }
        | {
            method: "bitcoin-sign-message";
            signature: string;
            messageHash: string;
            address: string;
          }
        | {
            method: "bitcoin-sign-psbt";
            psbt: string;
            txid?: string;
          }
        | {
            method: "bitcoin-send-transfer";
            txid: string;
          }
        | {
            method: "cardano-sign-data";
            dataSignature: {
              signature: string;
              key: string;
            };
          }
        | {
            method: "cardano-sign-tx";
            tx: string;
          }
        | {
            method: "spark-transfer";
            txid: string;
          }
        | {
            method: "spark-transfer-token";
            txid: string;
          }
        | {
            method: "spark-sign-message";
            signature: string;
          }
        /** Spark Token Operations */
        | {
            method: "spark-create-token";
            txId?: string;
            tokenId?: string;
          }
        | {
            method: "spark-mint-tokens";
            txId: string;
          }
        | {
            method: "spark-burn-tokens";
            txId: string;
          }
        | {
            method: "spark-freeze-address";
            txId: string;
          }
        | {
            method: "spark-unfreeze-address";
            txId: string;
          }
        | {
            method: "spark-transfer-tokens";
            txId: string;
          }
        | {
            method: "spark-batch-transfer";
            txIds?: string[];
            txId?: string;
          }
        | {
            method: "spark-get-token-balance";
            balance: string;
          }
        | {
            method: "spark-get-token-holders";
            holders: Array<{
              address: string;
              balance: string;
            }>;
          }
        | {
            method: "spark-get-token-policy";
            policy: any;
          }
        | {
            method: "spark-get-token-analytics";
            analytics: {
              totalSupply: string;
              circulatingSupply: string;
              holdersCount: number;
              transactionsCount: number;
              frozenAddressesCount: number;
            };
          }
        /** to be deprecated */
        | {
            method: "sign-data";
            signature: {
              signature: string;
              key: string;
            };
          }
        | {
            method: "sign-tx";
            tx: string;
          };
    }
  | {
      success: false;
      message: string;
    };
