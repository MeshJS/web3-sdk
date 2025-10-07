import { clientDeriveWallet } from "./derive-wallet";
import { clientGenerateWallet } from "./generate-wallet";
import { clientRecovery } from "./recovery";
describe("create a wallet with english words for spending and recovery.", () => {
  it("should be able to recover the wallet configuration", async () => {
    const wallet = await clientGenerateWallet("hello", "hello");
    const { deviceShard, authShard } = await clientRecovery(
      wallet.authShard,
      wallet.encryptedRecoveryShard,
      "hello",
      "hello",
    );

    const derivedWallet = clientDeriveWallet(
      deviceShard,
      "hello",
      authShard,
      1,
    );
    expect(2).toBe(2);
  });

  it("should be able to recover japanese the wallet configuration", async () => {
    const wallet = await clientGenerateWallet("こんにちは", "こんにちは");
    const { deviceShard, authShard } = await clientRecovery(
      wallet.authShard,
      wallet.encryptedRecoveryShard,
      "こんにちは",
      "こんにちは",
    );

    const derivedWallet = clientDeriveWallet(
      deviceShard,
      "こんにちは",
      authShard,
      1,
    );
    expect(2).toBe(2);
  });

  it("should be able to recover chinese the wallet configuration", async () => {
    const wallet = await clientGenerateWallet("你好", "你好");
    const { deviceShard, authShard } = await clientRecovery(
      wallet.authShard,
      wallet.encryptedRecoveryShard,
      "你好",
      "你好",
    );

    const derivedWallet = clientDeriveWallet(deviceShard, "你好", authShard, 1);
    expect(2).toBe(2);
  });
});
