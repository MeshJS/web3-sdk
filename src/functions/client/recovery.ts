import { decryptWithCipher, encryptWithCipher } from "../crypto";
import { combineShardsBuildWallet, spiltKeyIntoShards } from "../key-shard";

export async function clientRecovery(
  authShard: string,
  recoveryShard: string,
  recoveryAnswer: string,
  spendingPassword: string,
) {
  try {
    const recoverKeyShare3 = await decryptWithCipher({
      encryptedDataJSON: recoveryShard,
      key: recoveryAnswer,
    });

    const recoverKeyShare2 = authShard;

    const { key } = await combineShardsBuildWallet(
      0, // dont care about network here
      recoverKeyShare2,
      recoverKeyShare3,
    );

    const [keyShare1, keyShare2] = await spiltKeyIntoShards(key);

    /* encrypt */

    const encryptedAuthKey = await encryptWithCipher({
      data: keyShare1!,
      key: spendingPassword,
    });

    return {
      deviceShard: encryptedAuthKey,
      authShard: keyShare2!,
    };
  } catch (e) {
    console.error(e);
    throw new Error("Invalid recovery answer");
  }
}
