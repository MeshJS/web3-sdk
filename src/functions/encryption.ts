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
