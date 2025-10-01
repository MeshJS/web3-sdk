import { MeshWallet } from "@meshsdk/wallet";
import { generateMnemonic } from "@meshsdk/common";
import { deserializeBech32Address } from "@meshsdk/core-cst";
import { EmbeddedWallet } from "@meshsdk/bitcoin";
import { SparkWallet } from "@buildonspark/spark-sdk";
import { spiltKeyIntoShards } from "../key-shard";
import { encryptWithCipher } from "../crypto";
import { Web3SparkWallet } from "../../spark";

export async function clientGenerateWallet(
  spendingPassword: string,
  recoveryAnswer: string
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
    key: spendingPassword,
  });

  /* recovery */
  const encryptedRecoveryShard = await encryptWithCipher({
    data: keyShare3!,
    key: recoveryAnswer,
  });

  /* bitcoin */
  const bitcoinWallet = new EmbeddedWallet({
    testnet: true,
    key: {
      type: "mnemonic",
      words: mnemonic.split(" "),
    },
  });

  const bitcoinPubKeyHash = bitcoinWallet.getPublicKey();

  /* spark */
  const sparkWallet = new Web3SparkWallet({
    network: "MAINNET",
    key: {
      type: "mnemonic",
      words: mnemonic.split(" ")
    }
  });

  await sparkWallet.init();
  const sparkPubKeyHash = await sparkWallet.getIdentityPublicKey();

  return {
    pubKeyHash: keyHashes.pubKeyHash,
    stakeCredentialHash: keyHashes.stakeCredentialHash,
    encryptedDeviceShard,
    authShard: keyShare2!,
    encryptedRecoveryShard,
    bitcoinPubKeyHash: bitcoinPubKeyHash,
    sparkPubKeyHash: sparkPubKeyHash,
  };
}
