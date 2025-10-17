export * from "./sign-data";
export * from "./sign-tx";
export * from "./wallet";
import { Web3AuthProvider } from "../core";
import { UserSocialData } from "../user";

export type OpenWindowParams =
  | {
      method: "enable";
      projectId: string;
      directTo?: Web3AuthProvider;
      chain?: string;
      refreshToken?: string;
      keepWindowOpen?: "true" | "false";
      networkId?: string;
    }
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
    }
  | {
      method: "export-wallet";
      projectId: string;
      chain?: string;
      networkId?: string;
    }
  | {
      method: "disable";
      projectId: string;
    }
  | {
      method: "get-wallet-info";
      projectId: string;
      chain?: string;
      networkId?: string;
    }
  | {
      method: "claim-deposit";
      projectId: string;
      payload: string;
      chain?: string;
      networkId?: string;
    }
  | {
      method: "activate-wallet";
      projectId: string;
      chain?: string;
      networkId?: string;
    }
  | {
      method: "get-deposit-address";
      projectId: string;
      chain?: string;
      networkId?: string;
    };

export type OpenWindowResult =
  | {
      success: true;
      data:
        | {
            method: "enable";
            cardanoPubKeyHash: string;
            cardanoStakeCredentialHash: string;
            bitcoinPubKeyHash: string;
            sparkMainnetPubKeyHash: string;
            sparkRegtestPubKeyHash: string;
            user: UserSocialData;
          }
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
          }
        | {
            method: "export-wallet";
          }
        | {
            method: "disable";
          }
        | {
            method: "get-wallet-info";
            address: string;
            staticDepositAddress: string;
            pubKeyHash: string;
          }
        | {
            method: "claim-deposit";
            txId: string;
          }
        | {
            method: "activate-wallet";
            address: string;
            staticDepositAddress: string;
            pubKeyHash: string;
          }
        | {
            method: "get-deposit-address";
            staticDepositAddress: string;
          };
    }
  | {
      success: false;
      message: string;
    };
