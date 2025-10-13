import { resolveAddress } from "@meshsdk/bitcoin";
import { encodeSparkAddress } from "@buildonspark/spark-sdk";
import { Web3WalletKeyHashes } from "../../types";
import { getAddressFromHashes } from "../key-shard";

export function resolveWalletAddress(
  chain: "cardano" | "bitcoin" | "spark",
  data: Web3WalletKeyHashes,
  network: "mainnet" | "testnet",
): { type: "address"; address: string } {
  switch (chain) {
    case "bitcoin":
      return {
        type: "address",
        address: resolveAddress(data.bitcoinPubKeyHash, network).address,
      };
    default: // cardano
      return {
        type: "address",
        address: getAddressFromHashes(
          data.cardanoPubKeyHash,
          data.cardanoStakeCredentialHash,
          network === "testnet" ? 0 : 1,
        ),
      };
  }
}
