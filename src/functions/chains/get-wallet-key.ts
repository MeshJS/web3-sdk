import { resolveAddress } from "@meshsdk/bitcoin";
import { encodeSparkAddress } from "@buildonspark/spark-sdk";
import { Web3WalletKeyHashes } from "../../types";
import { getAddressFromHashes } from "../key-shard";

export function resolveWalletAddress(
  chain: "cardano" | "bitcoin" | "spark",
  data: Web3WalletKeyHashes,
  networkId: 0 | 1,
): { type: "address"; address: string } {
  switch (chain) {
    case "bitcoin":
      return {
        type: "address",
        address: resolveAddress(
          data.bitcoinPubKeyHash,
          networkId === 1 ? "mainnet" : "testnet",
        ).address,
      };
    case "spark":
      return {
        type: "address",
        address: encodeSparkAddress({
          identityPublicKey:
            networkId === 1
              ? data.sparkMainnetPubKeyHash
              : data.sparkRegtestPubKeyHash,
          network: networkId === 1 ? "MAINNET" : "REGTEST",
        }),
      };
    default: // cardano
      return {
        type: "address",
        address: getAddressFromHashes(
          data.cardanoPubKeyHash,
          data.cardanoStakeCredentialHash,
          networkId,
        ),
      };
  }
}
