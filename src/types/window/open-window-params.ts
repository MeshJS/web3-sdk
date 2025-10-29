import { Web3AuthProvider } from "../core";

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
      directTo?: Web3AuthProvider;
      unsignedTx: string;
      partialSign: "true" | "false";
      chain?: string;
      networkId?: string;
    }
  | {
      method: "sign-data";
      projectId: string;
      directTo?: Web3AuthProvider;
      payload: string;
      address?: string;
      chain?: string;
      networkId?: string;
    };
