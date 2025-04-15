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

  it("decrypt - 12 IV length", async () => {
    const encryptedDataJSON =
      '{"iv":"/bs1AzciZ1bDqT5W","ciphertext":"mh5pgH8ErqqH2KLLEBqqr8Pwm+mUuh9HhaAHslSD8ho6zk7mXccc9NUQAW8rb9UajCq8LYyANuiorjYD5N0hd2Lbe2n1x8AGRZrogyRKW6uhoFD1/FW6ofjgGP/kQRQSW2ZdJaDMbCxwYSdzxmaRunk6JRfybhfRU6kIxPMu41jhhRC3LbwZ+NnfBJFrg859hbuQgMQm8mqOUgOxcK8kKH54shOpGuLT4YBXhx33dZ//wT5VXrQ8kwIKttNk5h9MNKCacpRZSqU3pGlZ5oxucNEGos0IKTTXfbmwYx14uiERcXd32OP2"}';

    const decrypted = await decryptWithCipher({
      encryptedDataJSON: encryptedDataJSON,
      key,
    });

    expect(data).toBe(decrypted);
  });
  it("encrypt and decrypt", async () => {
    const encryptedDataJSON = await encryptWithCipher({
      data,
      key,
    });
    console.log("encryptedDataJSON", encryptedDataJSON);

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
