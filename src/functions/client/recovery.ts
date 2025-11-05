import { decryptWithCipher, encryptWithCipher } from "../crypto";
import { combineShardsBuildWallet, spiltKeyIntoShards } from "../key-shard";

export async function clientRecovery(
  authShard: string,
  recoveryShard: string,
  recoveryShardEncryptionKey: CryptoKey,
  newDeviceShardEncryptionKey: CryptoKey,
) {
  try {
    const recoverKeyShare3 = await decryptWithCipher({
      encryptedDataJSON: recoveryShard,
      key: recoveryShardEncryptionKey,
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
      key: newDeviceShardEncryptionKey,
    });

    return {
      deviceShard: encryptedAuthKey,
      authShard: keyShare2!,
      fullKey: key,
    };
  } catch (e) {
    console.error(e);
    throw new Error("Invalid recovery answer");
  }
}
