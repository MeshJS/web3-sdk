import * as crypto from "crypto";

const IV_LENGTH = 16;

export function encryptWithCipher({
  data,
  key,
  algorithm = "aes-256-ctr",
  initializationVectorSize = IV_LENGTH,
}: {
  data: any;
  key: string;
  algorithm?: string;
  initializationVectorSize?: number;
}) {
  const _key = crypto
    .createHash("sha256")
    .update(String(key))
    .digest("base64")
    .substr(0, 32);

  const buffer = Buffer.from(data);

  // Create an initialization vector
  const iv = crypto.randomBytes(initializationVectorSize);
  // Create a new cipher using the algorithm, key, and iv
  const cipher = crypto.createCipheriv(algorithm, _key, iv);
  // Create the new (encrypted) buffer
  const result = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);

  return result.toString("base64");
}

export function decryptWithCipher({
  encryptedData,
  key,
  algorithm = "aes-256-ctr",
  initializationVectorSize = 16,
}: {
  encryptedData: string;
  key: string;
  algorithm?: string;
  initializationVectorSize?: number;
}) {
  key = crypto
    .createHash("sha256")
    .update(String(key))
    .digest("base64")
    .substr(0, 32);

  let buffer = Buffer.from(encryptedData, "base64");

  // Get the iv: the first 16 bytes
  const iv = buffer.slice(0, initializationVectorSize);
  // Get the rest
  buffer = buffer.slice(initializationVectorSize);
  // Create a decipher
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  // Actually decrypt it
  const result = Buffer.concat([decipher.update(buffer), decipher.final()]);

  return result.toString("utf8");
}

export function encryptString(publicKey: string, payload: string) {
  return crypto
    .publicEncrypt(publicKey, Buffer.from(payload))
    .toString("base64");
}

export function decryptString(privateKey: string, payload: string) {
  const decrypted = crypto.privateDecrypt(
    {
      key: privateKey,
      passphrase: "",
    },
    Buffer.from(payload, "base64")
  );
  return decrypted.toString("utf8");
}

export async function generateKeyPairWindow() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: Buffer.from(publicKey).toString("base64"),
    privateKey: Buffer.from(privateKey).toString("base64"),
  };
}

export async function encryptStringWindow(
  publicKey: string,
  data: string
): Promise<string> {
  try {
    const key = await crypto.subtle.importKey(
      "spki",
      Uint8Array.from(atob(publicKey), (c) => c.charCodeAt(0)),
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
    );

    const encrypted = await crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      key,
      new TextEncoder().encode(data)
    );

    return Buffer.from(encrypted).toString("base64");
  } catch (error) {
    console.error("Encryption failed:", error);
    throw error;
  }
}

export async function decryptStringWindow(
  privateKey: string,
  encryptedData: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Buffer.from(privateKey, "base64"),
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    key,
    Buffer.from(encryptedData, "base64")
  );

  return new TextDecoder().decode(decrypted);
}
