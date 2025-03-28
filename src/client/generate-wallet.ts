import { encryptWithCipher, Web3WalletMeta } from "@meshsdk/web3-sdk";
import { MeshWallet } from "@meshsdk/wallet";
import { generateMnemonic } from "@meshsdk/common";
import { deserializeBech32Address } from "@meshsdk/core-cst";
import { spiltKeyIntoShards } from "../functions";

export async function clientGenerateWallet(spendingPassword: string) {
  const mnemonic = await generateMnemonic(256);

  /* get addresses */
  const walletMainnet = new MeshWallet({
    networkId: 1,
    key: {
      type: "mnemonic",
      words: mnemonic.split(" "),
    },
  });
  await walletMainnet.init();

  const mainnetAddresses = await walletMainnet.getAddresses();
  const keyHashesMainnet = deserializeBech32Address(
    mainnetAddresses.baseAddressBech32!
  );
  const mainnet: Web3WalletMeta = {
    baseAddressBech32: mainnetAddresses.baseAddressBech32!,
    enterpriseAddressBech32: mainnetAddresses.enterpriseAddressBech32!,
    rewardsAddressBech32: mainnetAddresses.rewardAddressBech32!,
    pubKeyHash: keyHashesMainnet.pubKeyHash,
    stakeKeyHash: keyHashesMainnet.stakeCredentialHash,
  };

  const walletTestnet = new MeshWallet({
    networkId: 0,
    key: {
      type: "mnemonic",
      words: mnemonic.split(" "),
    },
  });
  await walletTestnet.init();

  const testnetAddresses = await walletTestnet.getAddresses();
  const keyHashesTestNet = deserializeBech32Address(
    testnetAddresses.baseAddressBech32!
  );
  const testnet: Web3WalletMeta = {
    baseAddressBech32: testnetAddresses.baseAddressBech32!,
    enterpriseAddressBech32: testnetAddresses.enterpriseAddressBech32!,
    rewardsAddressBech32: testnetAddresses.rewardAddressBech32!,
    pubKeyHash: keyHashesTestNet.pubKeyHash,
    stakeKeyHash: keyHashesTestNet.stakeCredentialHash,
  };

  const addresses: {
    mainnet: Web3WalletMeta;
    testnet: Web3WalletMeta;
  } = {
    mainnet,
    testnet,
  };

  /* spilt key shares */
  const [keyShare1, keyShare2, keyShare3] = await spiltKeyIntoShards(mnemonic);

  const encryptedKeyShare1 = encryptWithCipher({
    data: keyShare1,
    key: spendingPassword,
  });

  return {
    addresses,
    encryptedKeyShare1,
    keyShare2: keyShare2!,
    keyShare3: keyShare3!,
  };
}
