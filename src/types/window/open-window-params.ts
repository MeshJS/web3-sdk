import { Web3AuthProvider } from "../core";
import { ExitSpeed } from "../spark";

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
      // we technically don't need network id's here, a mistake that made it into our current builds.
      networkId: string;
      address: string;
      message: string;
      protocol?: "ECDSA" | "BIP322";
    }
  | {
      method: "bitcoin-sign-psbt";
      projectId: string;
      // we technically don't need network id's here, a mistake that made it into our current builds.
      networkId: string;
      psbt: string;
      signInputs: string;
      broadcast: "true" | "false";
    }
  | {
      method: "bitcoin-send-transfer";
      projectId: string;
      // we technically don't need network id's here, a mistake that made it into our current builds.
      networkId: string;
      recipients: string;
    }
  | {
      method: "bitcoin-onramp";
      projectId: string;
    }
  | {
      method: "cardano-sign-data";
      projectId: string;
      // we technically don't need network id's here, a mistake that made it into our current builds.
      networkId: string;
      payload: string;
      address?: string;
    }
  | {
      method: "cardano-sign-tx";
      projectId: string;
      // we technically don't need network id's here, a mistake that made it into our current builds.
      networkId: string;
      unsignedTx: string;
      partialSign: "true" | "false";
      returnFullTx: "true" | "false";
    }
  | {
      method: "cardano-onramp";
      projectId: string;
    }
  | {
      method: "spark-transfer";
      projectId: string;
      // we technically don't need network id's here, a mistake that made it into our current builds.
      networkId: string;
      receiverSparkAddress: string;
      amountSats: string;
    }
  | {
      method: "spark-transfer-token";
      projectId: string;
      // we technically don't need network id's here, a mistake that made it into our current builds.
      networkId: string;
      receiverSparkAddress: string;
      tokenIdentifier: string;
      tokenAmount: string;
    }
  | {
      method: "spark-sign-message";
      projectId: string;
      // we technically don't need network id's here, a mistake that made it into our current builds.
      networkId: string;
      message: string;
    }
  | {
      method: "spark-claim-static-deposit";
      projectId: string;
      networkId: string;
      txId: string;
    }
  | {
      method: "spark-withdraw-to-bitcoin";
      projectId: string;
      networkId: string;
      exitSpeed: ExitSpeed;
      amountSats: string;
      deductFeeFromWithdrawalAmount: "true" | "false";
      withdrawalAddress: string;
    }
  /** to be deprecated */
  | {
      method: "sign-tx";
      projectId: string;
      directTo: Web3AuthProvider | "undefined";
      unsignedTx: string;
      partialSign: "true" | "false";
      chain: string | "undefined";
      // we technically don't need network id's here, a mistake that made it into our current builds.
      networkId?: string;
    }
  | {
      method: "sign-data";
      projectId: string;
      directTo: Web3AuthProvider | "undefined";
      payload: string;
      address: string | "undefined";
      chain: string | "undefined";
      // we technically don't need network id's here, a mistake that made it into our current builds.
      networkId: string | "undefined";
    };
