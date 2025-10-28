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
