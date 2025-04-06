import { decryptWithCipher, encryptWithCipher } from "../crypto";
import { combineShardsBuildWallet, spiltKeyIntoShards } from "../key-shard";

export async function clientRecovery(
  authShard: string,
  recoveryShard: string,
  recoveryAnswer: string,
  spendingPassword: string,
  newRecoveryAnswer: string
) {
  try {
    const answer = recoveryAnswer
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLocaleLowerCase();

    const recoverKeyShare3 = await decryptWithCipher({
      encryptedDataJSON: recoveryShard,
      key: answer,
    });

    const recoverKeyShare2 = authShard;

    const { key } = await combineShardsBuildWallet(
      0, // dont care about network here
      recoverKeyShare2,
      recoverKeyShare3
    );

    const [keyShare1, keyShare2, keyShare3] = await spiltKeyIntoShards(key);

    /* encrypt */

    const encryptedAuthKey = await encryptWithCipher({
      data: keyShare1!,
      key: spendingPassword,
    });

    const newAnswer = newRecoveryAnswer
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLocaleLowerCase();

    const encryptedRecoveryKey = await encryptWithCipher({
      data: keyShare3!,
      key: newAnswer,
    });

    return {
      deviceKey: encryptedAuthKey,
      authKey: keyShare2!,
      recoveryKey: encryptedRecoveryKey,
    };
  } catch (e) {
    console.error(e);
    throw new Error("Invalid recovery answer");
  }
}
