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
            method: "bitcoin-onramp";
          }
        | {
            method: "cardano-onramp";
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
