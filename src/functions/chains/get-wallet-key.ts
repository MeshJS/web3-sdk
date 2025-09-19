import { resolveAddress } from "@meshsdk/bitcoin";
import { Web3WalletKeyHashes } from "../../types";
import { getAddressFromHashes } from "../key-shard";

export function resolveWalletAddress(
  chain: "cardano" | "bitcoin" | "spark",
  data: Web3WalletKeyHashes,
  networkId: 0 | 1,
): { type: "address"; address: string } {
  switch (chain) {
    case "spark":
      // TODO: Implement Spark address resolution
      throw new Error("Spark address resolution not supported yet");
    case "bitcoin":
      return {
        type: "address",
        address: resolveAddress(
          data.bitcoinPubKeyHash,
          networkId === 1 ? "mainnet" : "testnet",
        ).address,
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
