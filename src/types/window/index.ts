export * from "./sign-data";
export * from "./sign-tx";
export * from "./wallet";
import { Web3AuthProvider } from "../core";
import { UserSocialData } from "../user";

export type OpenWindowParams = {
    method: "enable"
    projectId: string;
    directTo?: Web3AuthProvider
    chain?: string;
  } | {
    method: "sign-tx"
    projectId: string;
    directTo?: Web3AuthProvider
    unsignedTx: string;
    partialSign: "true" | "false";
    chain?: string;
  } | {
    method: "sign-data"
    projectId: string
    directTo?: Web3AuthProvider
    payload: string;
    address?: string;
    chain?: string;
    networkId?: string;
  }

export type OpenWindowResult = {
    success: true
    data: {
        method: "enable"
        cardanoPubKeyHash: string;
        cardanoStakeCredentialHash: string;
        bitcoinPubKeyHash: string;
        user: UserSocialData
    } | {
        method: "sign-data"
        signature: {
            signature: string;
            key: string;
        };
    } | {
        method: "sign-tx"
        tx: string;
    }
} | {
    success: false;
    message: string
}