import { MeshWallet } from "@meshsdk/wallet";
import { shamirCombine } from "./shamir-secret-sharing";
import { bytesToString, hexToBytes } from "../convertors";
import { EmbeddedWallet } from "@meshsdk/bitcoin";

export async function combineShardsBuildWallet(
  networkId: 0 | 1,
  keyShard1: string,
  keyShard2: string
) {
  const _share1 = hexToBytes(keyShard1);
  const _share2 = hexToBytes(keyShard2);
  const reconstructed = await shamirCombine([_share1, _share2]);

  const key = bytesToString(reconstructed);

  const bitcoinWallet = new EmbeddedWallet({
    testnet: networkId === 0 ? true : false,
    key: {
      type: "mnemonic",
      words: key.split(" "),
    },
  });

  const cardanoWallet = new MeshWallet({
    networkId: networkId,
    key: {
      type: "mnemonic",
      words: key.split(" "),
    },
  });

  await cardanoWallet.init();

  return { key, bitcoinWallet, cardanoWallet };
}
