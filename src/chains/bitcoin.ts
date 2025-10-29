import { resolveAddress } from "@meshsdk/bitcoin";

export function getBitcoinAddressFromPubkey(
  pubKeyHash: string,
  networkId: 0 | 1,
): string {
  return resolveAddress(pubKeyHash, networkId === 1 ? "mainnet" : "testnet")
    .address;
}
