import { Web3AuthProvider } from "../core";
import { UserSocialData } from "../user";

export type OpenWindowParams =
  | {
      method: "enable";
      projectId: string;
      directTo?: Web3AuthProvider;
      refreshToken?: string;
      keepWindowOpen: "true" | "false";
      networkId: string;
    }
  | {
      method: "export-wallet";
      projectId: string;
      chain: "cardano" | "bitcoin" | "spark";
      networkId: string;
    }
  | {
      method: "disable";
      projectId: string;
    }
  | {
      method: "bitcoin-sign-message";
      projectId: string;
      networkId: string;
      address: string;
      message: string;
      protocol?: "ECDSA" | "BIP322";
    }
  | {
      method: "bitcoin-sign-psbt";
      projectId: string;
      networkId: string;
      psbt: string;
      signInputs: string;
      broadcast: "true" | "false";
    }
  | {
      method: "bitcoin-send-transfer";
      projectId: string;
      networkId: string;
      recipients: string;
    }
  | {
      method: "cardano-sign-data";
      projectId: string;
      payload: string;
      address?: string;
      networkId: string;
    }
  | {
      method: "cardano-sign-tx";
      projectId: string;
      unsignedTx: string;
      partialSign: "true" | "false";
      returnFullTx: "true" | "false";
      networkId: string;
    }
  | {
      method: "spark-transfer";
      projectId: string;
      networkId: string;
      reciverSparkAddress: string;
      amountSats: string;
    }
  | {
      method: "spark-transfer-token";
      projectId: string;
      networkId: string;
      reciverSparkAddress: string;
      tokenIdentifier: string;
      tokenAmount: string;
    }
  | {
      method: "spark-sign-message";
      projectId: string;
      networkId: string;
      message: string;
    };

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
          };
    }
  | {
      success: false;
      message: string;
    };
