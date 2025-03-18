export async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey"]
  );

  const publicKey = await window.crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );
  const privateKey = await window.crypto.subtle.exportKey(
    "pkcs8",
    keyPair.privateKey
  );

  const key = {
    publicKey: Buffer.from(publicKey).toString("base64"),
    privateKey: Buffer.from(privateKey).toString("base64"),
  };

  return key;
}

export async function encryptData(publicKey: string, data: string) {
  const publicKeyBuffer = Buffer.from(publicKey, "base64");

  const _publicKey = await window.crypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Generate an ephemeral key pair
  const ephemeralKeyPair = await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );

  // Derive a shared secret
  const sharedSecret = await window.crypto.subtle.deriveKey(
    { name: "ECDH", public: _publicKey },
    ephemeralKeyPair.privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  // Encrypt the message using AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedSecret,
    new TextEncoder().encode(data)
  );

  const encryptedData = {
    ephemeralPublicKey: await window.crypto.subtle.exportKey(
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

export async function decryptData(
  privateKey: string,
  encryptedDataJSON: string
) {
  const privateKeyBuffer = Buffer.from(privateKey, "base64");

  const _encryptedData = JSON.parse(encryptedDataJSON);

  const encryptedData = {
    ephemeralPublicKey: Buffer.from(
      _encryptedData.ephemeralPublicKey,
      "base64"
    ),
    iv: Buffer.from(_encryptedData.iv, "base64"),
    ciphertext: Buffer.from(_encryptedData.ciphertext, "base64"),
  };

  const _privateKey = await window.crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"]
  );

  const ephemeralPublicKey = await window.crypto.subtle.importKey(
    "spki",
    encryptedData.ephemeralPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive the shared secret
  const sharedSecret = await window.crypto.subtle.deriveKey(
    { name: "ECDH", public: ephemeralPublicKey },
    _privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  // Decrypt the message
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: encryptedData.iv },
    sharedSecret,
    encryptedData.ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
