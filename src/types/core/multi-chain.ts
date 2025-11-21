import { MeshWallet } from "@meshsdk/wallet";
import { IssuerSparkWallet } from "@buildonspark/issuer-sdk";

/**
 * Standardized network ID type (0 = testnet, 1 = mainnet)
 */
export type NetworkId = 0 | 1;

/**
 * Multi-chain wallet creation options
 */
export interface MultiChainWalletOptions {
  tags?: string[];
  networkId?: NetworkId;
  chains?: ("cardano" | "spark")[];
}

/**
 * Multi-chain wallet information - one wallet per project with all chain keys
 */
export interface MultiChainWalletInfo {
  id: string;
  projectId: string;
  tags: string[];
  key: string;
  networkId: NetworkId;
  chains: {
    cardano?: {
      pubKeyHash: string;
      stakeCredentialHash: string;
    };
    spark?: {
      mainnetPublicKey: string;
      mainnetAddress: string;
      regtestPublicKey: string;
      regtestAddress: string;
    };
  };
  createdAt: string;
}

/**
 * Multi-chain wallet instance with initialized wallet objects
 */
export interface MultiChainWalletInstance {
  info: MultiChainWalletInfo;
  cardanoWallet?: MeshWallet;
  sparkWallet?: IssuerSparkWallet;
}

/**
 * Supported chain types for wallet operations
 */
export type SupportedChain = "cardano" | "spark";
