import {
  decodeSparkAddress,
  getNetworkFromSparkAddress,
  bech32mDecode,
} from "@buildonspark/spark-sdk";
import { bech32m } from "@scure/base";
import { BinaryWriter } from "@bufbuild/protobuf/wire";
import { hexToBytes } from "@noble/curves/utils";
import type { ValidSparkNetwork } from "./wallet";

/**
 * Extracts identity public key from a Spark address
 *
 * Supports both legacy (sprt1...) and new (sparkrt1...) address formats
 *
 * @param sparkAddress - Spark address in either format
 * @returns Identity public key as hex string or null if extraction fails
 */
export function extractIdentityPublicKey(sparkAddress: string): string | null {
  try {
    const network = getNetworkFromSparkAddress(
      sparkAddress,
    ) as ValidSparkNetwork;
    const decoded = decodeSparkAddress(sparkAddress, network);

    return decoded.identityPublicKey || null;
  } catch (error) {
    console.error(
      "[extractIdentityPublicKey] Failed to decode Spark address:",
      {
        address: sparkAddress,
        error: error instanceof Error ? error.message : String(error),
      },
    );
    return null;
  }
}

const NEW_PREFIXES = {
  MAINNET: "spark",
  REGTEST: "sparkrt",
} as const;

/**
 * Encode Spark address in NEW format directly from identity public key
 */
export function getSparkAddressFromPubkey(
  identityPublicKey: string,
  network: ValidSparkNetwork,
): string {
  const identityPublicKeyBytes = hexToBytes(identityPublicKey);

  const w = new BinaryWriter();
  w.uint32(10).bytes(identityPublicKeyBytes);

  const serializedPayload = w.finish();
  const words = bech32m.toWords(serializedPayload);

  return bech32m.encode(NEW_PREFIXES[network], words, 1024);
}

/**
 * Convert legacy to new format (sprt1... -> sparkrt1...)
 */
export function convertLegacyToNewFormat(legacyAddress: string): string {
  if (
    legacyAddress.startsWith("sparkrt1") ||
    legacyAddress.startsWith("spark1")
  ) {
    console.warn(
      `Address ${legacyAddress} is already in new format, skipping conversion`,
    );
    return legacyAddress;
  }

  const network = getNetworkFromSparkAddress(
    legacyAddress,
  ) as ValidSparkNetwork;
  const { words } = bech32mDecode(legacyAddress);
  return bech32m.encode(NEW_PREFIXES[network], words, 1024);
}
