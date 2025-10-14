const IV_LENGTH = 16;

export async function secretToCryptoKey(secret: string, algorithm = "AES-GCM") {
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
    ["encrypt", "decrypt"],
  );
}

export async function webauthnPublicKeyCredentialToCryptoKey(
  credential: PublicKeyCredential,
  algorithm = "AES-GCM",
) {
  const extensionResults = credential.getClientExtensionResults();
  if (!extensionResults.prf?.results?.first) {
    throw new Error("PRF extension not supported or didn't return results");
  }

  const prfOutput = extensionResults.prf.results.first;
  return await crypto.subtle.importKey(
    "raw",
    prfOutput,
    { name: algorithm, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
