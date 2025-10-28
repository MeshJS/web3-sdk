import { UserSocialData } from "../user";

export type OpenWindowResult =
  | {
      success: true;
      data:
        | {
            method: "enable";
            bitcoin: {
              publicKey: string;
            };
            cardano: {
              pubKeyHash: string;
              stakeCredentialHash: string;
            };
            spark: {
              mainnetPubKeyHash: string;
              regtestPubKeyHash: string;
            };
            user: UserSocialData;
            /** to be deprecated */
            cardanoPubKeyHash: string;
            cardanoStakeCredentialHash: string;
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
