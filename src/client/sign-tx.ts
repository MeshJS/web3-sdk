import { combineShardsBuildWallet, decryptWithCipher } from "../functions";

export async function clientSignTx(
  encryptedKeyShard: string,
  spendingPassword: string,
  custodialShard: string,
  networkId: 0 | 1,
  unsignedTx: string
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

  const signedTx = await wallet.signTx(unsignedTx);
  return signedTx;
}
