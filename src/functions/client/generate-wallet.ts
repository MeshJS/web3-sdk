import { MeshWallet } from "@meshsdk/wallet";
import { generateMnemonic } from "@meshsdk/common";
import { deserializeBech32Address } from "@meshsdk/core-cst";
import { spiltKeyIntoShards } from "../key-shard";
import { encryptWithCipher } from "../crypto";

export async function clientGenerateWallet(spendingPassword: string) {
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

  const encryptedKeyShare1 = await encryptWithCipher({
    data: keyShare1!,
    key: spendingPassword,
  });

  return {
    pubKeyHash: keyHashes.pubKeyHash,
    stakeCredentialHash: keyHashes.stakeCredentialHash,
    encryptedKeyShare1,
    keyShare2: keyShare2!,
    keyShare3: keyShare3!,
  };
}
