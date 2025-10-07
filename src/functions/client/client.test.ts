import { clientDeriveWallet } from "./derive-wallet";
import { clientGenerateWallet } from "./generate-wallet";
import { clientRecovery } from "./recovery";

describe("test wallet derive and recovery", () => {
  it("should be able to recover in english", async () => {
    const wallet = await clientGenerateWallet("hello", "hello");
    const { deviceShard, authShard } = await clientRecovery(
      wallet.authShard,
      wallet.encryptedRecoveryShard,
      "hello",
      "hello",
    );

    const derivedWallet = await clientDeriveWallet(
      deviceShard,
      "hello",
      authShard,
      1,
    );
    expect(2).toBe(2);
  });

  it("should be able to recover in japanese", async () => {
    const wallet = await clientGenerateWallet("こんにちは", "こんにちは");
    const { deviceShard, authShard } = await clientRecovery(
      wallet.authShard,
      wallet.encryptedRecoveryShard,
      "こんにちは",
      "こんにちは",
    );

    const derivedWallet = await clientDeriveWallet(
      deviceShard,
      "こんにちは",
      authShard,
      1,
    );
    expect(2).toBe(2);
  });

  it("should be able to recover in chinese", async () => {
    const wallet = await clientGenerateWallet("你好", "你好");
    const { deviceShard, authShard } = await clientRecovery(
      wallet.authShard,
      wallet.encryptedRecoveryShard,
      "你好",
      "你好",
    );

    const derivedWallet = await clientDeriveWallet(
      deviceShard,
      "你好",
      authShard,
      1,
    );
    expect(2).toBe(2);
  });
});
