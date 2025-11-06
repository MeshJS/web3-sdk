import { MeshWallet } from "@meshsdk/wallet";
import { shamirCombine } from "./shamir-secret-sharing";
import { bytesToString, hexToBytes } from "../convertors";
import { EmbeddedWallet, IBitcoinProvider } from "@meshsdk/bitcoin";
import { SparkWallet } from "@buildonspark/spark-sdk";

export async function combineShardsBuildWallet(
  networkId: 0 | 1,
  keyShard1: string,
  keyShard2: string,
  bitcoinProvider?: IBitcoinProvider,
) {
  const _share1 = hexToBytes(keyShard1);
  const _share2 = hexToBytes(keyShard2);
  const reconstructed = await shamirCombine([_share1, _share2]);

  const mnemonic = bytesToString(reconstructed);

  const bitcoinWallet = new EmbeddedWallet({
    network: networkId === 1 ? "Mainnet" : "Testnet",
    key: {
      type: "mnemonic",
      words: mnemonic.split(" "),
    },
    provider: bitcoinProvider,
  });

  const cardanoWallet = new MeshWallet({
    networkId: networkId,
    key: {
      type: "mnemonic",
      words: mnemonic.split(" "),
    },
  });

  await cardanoWallet.init();

  const { wallet: sparkWallet } = await SparkWallet.initialize({
    mnemonicOrSeed: mnemonic,
    options: {
      network: networkId === 1 ? "MAINNET" : "REGTEST",
    },
  });

  return {
    key: mnemonic,
    bitcoinWallet,
    cardanoWallet,
    sparkWallet,
  };
}
