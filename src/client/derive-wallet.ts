import { combineShardsBuildWallet, decryptWithCipher } from "../functions";

export async function clientDeriveWallet(
  encryptedKeyShard: string,
  spendingPassword: string,
  custodialShard: string,
  networkId: 0 | 1
) {
  const keyShare1 = decryptWithCipher({
    encryptedData: encryptedKeyShard,
    key: spendingPassword,
  });
  const keyShare2 = custodialShard;

  const { wallet } = await combineShardsBuildWallet(
    networkId,
    keyShare1,
    keyShare2
  );

  return wallet;
}
