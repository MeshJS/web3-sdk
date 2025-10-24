import { MeshWallet } from "@meshsdk/wallet";
import { generateMnemonic } from "@meshsdk/common";
import { deserializeBech32Address } from "@meshsdk/core-cst";
import { EmbeddedWallet } from "@meshsdk/bitcoin";
import { SparkWallet } from "@buildonspark/spark-sdk";
import { spiltKeyIntoShards } from "../key-shard";
import { encryptWithCipher } from "../crypto";

export async function clientGenerateWallet(
  deviceShardEncryptionKey: CryptoKey,
  recoveryShardEncryptionKey: CryptoKey,
) {
  const mnemonic = await generateMnemonic(256);

  /* get addresses */
  const wallet = new MeshWallet({
    networkId: 1,
    key: {
      type: "mnemonic",
      words: mnemonic.split(" "),
    },
  });
  await wallet.init();

  const addresses = await wallet.getAddresses();
  const keyHashes = deserializeBech32Address(addresses.baseAddressBech32!);

  /* spilt key shares */
  const [keyShare1, keyShare2, keyShare3] = await spiltKeyIntoShards(mnemonic);

  const encryptedDeviceShard = await encryptWithCipher({
    data: keyShare1!,
    key: deviceShardEncryptionKey,
  });

  /* recovery */
  const encryptedRecoveryShard = await encryptWithCipher({
    data: keyShare3!,
    key: recoveryShardEncryptionKey,
  });

  /* bitcoin */
  const bitcoinWallet = new EmbeddedWallet({
    network: "Testnet",
    key: {
      type: "mnemonic",
      words: mnemonic.split(" "),
    },
  });

  const bitcoinPubKeyHash = bitcoinWallet.getPublicKey();

  /* spark */
  // Generate network-specific Spark identity keys
  // NOTE: Spark uses different identity keys per network (by design)
  // - MAINNET key for production transactions and addresses
  // - REGTEST key for development/testing transactions and addresses
  // This ensures proper network isolation and correct address derivation

  const { wallet: sparkMainnetWallet } = await SparkWallet.initialize({
    mnemonicOrSeed: mnemonic,
    options: {
      network: "MAINNET",
    },
  });

  const { wallet: sparkRegtestWallet } = await SparkWallet.initialize({
    mnemonicOrSeed: mnemonic,
    options: {
      network: "REGTEST",
    },
  });

  const [sparkMainnetPubKeyHash, sparkRegtestPubKeyHash] = await Promise.all([
    sparkMainnetWallet.getIdentityPublicKey(),
    sparkRegtestWallet.getIdentityPublicKey(),
  ]);

  return {
    pubKeyHash: keyHashes.pubKeyHash,
    stakeCredentialHash: keyHashes.stakeCredentialHash,
    encryptedDeviceShard,
    authShard: keyShare2!,
    encryptedRecoveryShard,
    bitcoinPubKeyHash: bitcoinPubKeyHash,
    sparkMainnetPubKeyHash: sparkMainnetPubKeyHash,
    sparkRegtestPubKeyHash: sparkRegtestPubKeyHash,
  };
}
