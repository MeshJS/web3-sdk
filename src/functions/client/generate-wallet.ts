import { MeshWallet } from "@meshsdk/wallet";
import { generateMnemonic } from "@meshsdk/common";
import { deserializeBech32Address } from "@meshsdk/core-cst";
import { spiltKeyIntoShards } from "../key-shard";
import { encryptWithCipher } from "../crypto";

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

  return {
    pubKeyHash: keyHashes.pubKeyHash,
    stakeCredentialHash: keyHashes.stakeCredentialHash,
    encryptedDeviceShard,
    authShard: keyShare2!,
    encryptedRecoveryShard,
  };
}
