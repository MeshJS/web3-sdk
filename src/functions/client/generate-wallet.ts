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

  /* cardano */
  const cardanoWallet = new MeshWallet({
    networkId: 1,
    key: {
      type: "mnemonic",
      words: mnemonic.split(" "),
    },
  });
  await cardanoWallet.init();

  const cardanoAddresses = await cardanoWallet.getAddresses();
  const cardanoKeyHashes = deserializeBech32Address(
    cardanoAddresses.baseAddressBech32!,
  );

  /* spark */
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
    encryptedDeviceShard,
    authShard: keyShare2!,
    encryptedRecoveryShard,
    bitcoinPubKeyHash: bitcoinPubKeyHash,
    cardanoPubKeyHash: cardanoKeyHashes.pubKeyHash,
    cardanoStakeCredentialHash: cardanoKeyHashes.stakeCredentialHash,
    sparkMainnetPubKeyHash: sparkMainnetPubKeyHash,
    sparkRegtestPubKeyHash: sparkRegtestPubKeyHash,
  };
}
