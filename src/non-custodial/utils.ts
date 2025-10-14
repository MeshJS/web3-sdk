const IV_LENGTH = 16;

export async function secretToCryptoKey(secret: string, algorithm = "AES-GCM") {
  // Derive a cryptographic key from the input key using SHA-256
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(IV_LENGTH),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: algorithm, length: 256 },
    false,
    ["encrypt"],
  );
}
