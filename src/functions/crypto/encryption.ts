import { crypto } from ".";

const IV_LENGTH = 16;

export async function encryptWithCipher({
  data,
  key,
  algorithm = "AES-GCM",
  initializationVectorSize = IV_LENGTH,
}: {
  data: string;
  key: string;
  algorithm?: string;
  initializationVectorSize?: number;
}) {
  // Derive a cryptographic key from the input key using SHA-256
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const cryptoKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(initializationVectorSize), // Use a fixed salt for simplicity
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: algorithm, length: 256 },
    false,
    ["encrypt"]
  );

  // Create an initialization vector
  const iv = crypto.getRandomValues(new Uint8Array(initializationVectorSize));

  // Encrypt the data
  const encrypted = await crypto.subtle.encrypt(
    { name: algorithm, iv },
    cryptoKey,
    new TextEncoder().encode(data)
  );

  // Return the encrypted data as a base64 string
  return {
    iv: Buffer.from(iv).toString("base64"),
    ciphertext: Buffer.from(encrypted).toString("base64"),
  };
}

export async function decryptWithCipher({
  encryptedData,
  key,
  algorithm = "AES-GCM",
  initializationVectorSize = IV_LENGTH,
}: {
  encryptedData: string;
  key: string;
  algorithm?: string;
  initializationVectorSize?: number;
}) {
  // Derive a cryptographic key from the input key using SHA-256
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const cryptoKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(initializationVectorSize), // Use the same salt as encryption
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: algorithm, length: 256 },
    false,
    ["decrypt"]
  );

  // Decode the encrypted data
  const buffer = Buffer.from(encryptedData, "base64");

  // Extract the IV and ciphertext
  const iv = buffer.slice(0, initializationVectorSize);
  const ciphertext = buffer.slice(initializationVectorSize);

  // Decrypt the data
  const decrypted = await crypto.subtle.decrypt(
    { name: algorithm, iv: new Uint8Array(iv) },
    cryptoKey,
    ciphertext
  );

  // Return the decrypted data as a UTF-8 string
  return new TextDecoder().decode(decrypted);
}

export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"]
  );

  const publicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  const key = {
    publicKey: Buffer.from(publicKey).toString("base64"),
    privateKey: Buffer.from(privateKey).toString("base64"),
  };

  return key;
}

export async function encryptWithPublicKey(publicKey: string, data: string) {
  const publicKeyBuffer = Buffer.from(publicKey, "base64");

  const _publicKey = await crypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Generate an ephemeral key pair
  const ephemeralKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );

  // Derive a shared secret
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: "ECDH", public: _publicKey },
    ephemeralKeyPair.privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  // Encrypt the message using AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedSecret,
    new TextEncoder().encode(data)
  );

  const encryptedData = {
    ephemeralPublicKey: await crypto.subtle.exportKey(
      "spki",
      ephemeralKeyPair.publicKey
    ),
    iv,
    ciphertext: encrypted,
  };

  return JSON.stringify({
    ephemeralPublicKey: Buffer.from(encryptedData.ephemeralPublicKey).toString(
      "base64"
    ),
    iv: Buffer.from(encryptedData.iv).toString("base64"),
    ciphertext: Buffer.from(encryptedData.ciphertext).toString("base64"),
  });
}

export async function decryptWithPrivateKey(
  privateKey: string,
  encryptedDataJSON: string
) {
  const privateKeyBuffer = Buffer.from(privateKey, "base64");

  const _encryptedData: {
    ephemeralPublicKey: string;
    iv: string;
    ciphertext: string;
  } = JSON.parse(encryptedDataJSON);

  const encryptedData = {
    ephemeralPublicKey: Buffer.from(
      _encryptedData.ephemeralPublicKey,
      "base64"
    ),
    iv: Buffer.from(_encryptedData.iv, "base64"),
    ciphertext: Buffer.from(_encryptedData.ciphertext, "base64"),
  };

  const _privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"]
  );

  const ephemeralPublicKey = await crypto.subtle.importKey(
    "spki",
    encryptedData.ephemeralPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive the shared secret
  const sharedSecret = await crypto.subtle.deriveKey(
    { name: "ECDH", public: ephemeralPublicKey },
    _privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  // Decrypt the message
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: encryptedData.iv },
    sharedSecret,
    encryptedData.ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * these methods do not use crypto.subtle
 */

// export function encryptWithCipher({
//   data,
//   key,
//   algorithm = "aes-256-ctr",
//   initializationVectorSize = IV_LENGTH,
// }: {
//   data: any;
//   key: string;
//   algorithm?: string;
//   initializationVectorSize?: number;
// }) {
//   const _key = crypto
//     .createHash("sha256")
//     .update(String(key))
//     .digest("base64")
//     .substr(0, 32);

//   const buffer = Buffer.from(data);

//   // Create an initialization vector
//   const iv = crypto.randomBytes(initializationVectorSize);
//   // Create a new cipher using the algorithm, key, and iv
//   const cipher = crypto.createCipheriv(algorithm, _key, iv);
//   // Create the new (encrypted) buffer
//   const result = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);

//   return result.toString("base64");
// }

// export function decryptWithCipher({
//   encryptedData,
//   key,
//   algorithm = "aes-256-ctr",
//   initializationVectorSize = 16,
// }: {
//   encryptedData: string;
//   key: string;
//   algorithm?: string;
//   initializationVectorSize?: number;
// }) {
//   key = crypto
//     .createHash("sha256")
//     .update(String(key))
//     .digest("base64")
//     .substr(0, 32);

//   let buffer = Buffer.from(encryptedData, "base64");

//   // Get the iv: the first 16 bytes
//   const iv = buffer.slice(0, initializationVectorSize);
//   // Get the rest
//   buffer = buffer.slice(initializationVectorSize);
//   // Create a decipher
//   const decipher = crypto.createDecipheriv(algorithm, key, iv);
//   // Actually decrypt it
//   const result = Buffer.concat([decipher.update(buffer), decipher.final()]);

//   return result.toString("utf8");
// }
