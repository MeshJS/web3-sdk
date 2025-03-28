import { stringToBytes, shamirSplit, bytesToHex } from "@meshsdk/web3-sdk";

export async function spiltKeyIntoShards(key: string) {
  const secret = stringToBytes(key);
  const [share1, share2, share3] = await shamirSplit(secret, 3, 2);

  const keyShare1 = bytesToHex(share1!);
  const keyShare2 = bytesToHex(share2!);
  const keyShare3 = bytesToHex(share3!);

  return [keyShare1, keyShare2, keyShare3];
}
