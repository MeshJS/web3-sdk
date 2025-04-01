import {
  decryptWithCipher,
  decryptWithPrivateKey,
  encryptWithCipher,
  encryptWithPublicKey,
  generateKeyPair,
} from "./encryption";

const data =
  "solution solution solution solution solution solution solution solution solution solution solution solution solution solution solution solution solution solution solution solution solution solution solution solution";

describe("with cipher", () => {
  const key = "01234567890123456789";

  it("encrypt and decrypt", async () => {
    const encryptedDataJSON = await encryptWithCipher({
      data,
      key,
    });

    const decrypted = await decryptWithCipher({
      encryptedDataJSON: encryptedDataJSON,
      key,
    });

    expect(data).toBe(decrypted);
  });
});

describe("with keypair", () => {
  it("generate, encrypt, decrypt", async () => {
    const { publicKey, privateKey } = await generateKeyPair();

    const encryptedDataJSON = await encryptWithPublicKey({ publicKey, data });

    const decrypted = await decryptWithPrivateKey({
      privateKey,
      encryptedDataJSON,
    });

    expect(data).toBe(decrypted);
  });
});
