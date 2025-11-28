import { Web3AuthProvider } from "../core";

/** in this schema you will see string versions of undefined & boolean, this type is exclusively used for converting into URLSearchParams (where undefined & booleans don't exist) */
export type OpenWindowParams =
  | {
      method: "enable";
      projectId: string;
      directTo: Web3AuthProvider | "undefined";
      refreshToken: string | "undefined";
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
      networkId: string;
      payload: string;
      address?: string;
    }
  | {
      method: "cardano-sign-tx";
      projectId: string;
      networkId: string;
      unsignedTx: string;
      partialSign: "true" | "false";
      returnFullTx: "true" | "false";
    }
  | {
      method: "spark-transfer";
      projectId: string;
      networkId: string;
      receiverSparkAddress: string;
      amountSats: string;
    }
  | {
      method: "spark-transfer-token";
      projectId: string;
      networkId: string;
      receiverSparkAddress: string;
      tokenIdentifier: string;
      tokenAmount: string;
    }
  | {
      method: "spark-sign-message";
      projectId: string;
      networkId: string;
      message: string;
    }
  /** to be deprecated */
  | {
      method: "sign-tx";
      projectId: string;
      directTo: Web3AuthProvider | "undefined";
      unsignedTx: string;
      partialSign: "true" | "false";
      chain: string | "undefined";
      networkId?: string;
    }
  | {
      method: "sign-data";
      projectId: string;
      directTo: Web3AuthProvider | "undefined";
      payload: string;
      address: string | "undefined";
      chain: string | "undefined";
      networkId: string | "undefined";
    };
