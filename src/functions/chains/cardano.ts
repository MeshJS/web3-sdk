import { pubKeyAddress } from "@meshsdk/common";
import { serializeAddressObj } from "@meshsdk/core-cst";

export function getCardanoAddressFromPubkey(
  pubKeyHash: string,
  stakeCredentialHash: string,
  networkId: 0 | 1,
): string {
  return serializeAddressObj(
    pubKeyAddress(pubKeyHash, stakeCredentialHash),
    networkId,
  );
}
