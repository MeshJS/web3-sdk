const IV_LENGTH = 16;
const staticSalt = new Uint8Array(new Array(32).fill(1)).buffer;

export class NoPRFExtensionError extends Error {
  constructor(message = "Credential does not support PRF extension") {
    super(message);
    this.name = "NoPRFExtensionError";
  }
}

export class UserAbortedError extends Error {
  constructor(message = "User aborted passkey flow") {
    super(message);
    this.name = "UserAbortedError";
  }
}

export class NotAllowedError extends Error {
  constructor(message = "Passkey operation was not allowed") {
    super(message);
    this.name = "NotAllowedError";
  }
}

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
  const first = (extensionResults as any).prf?.results?.first as
    | BufferSource
    | undefined;
  if (first === undefined) {
    throw new Error("PRF extension not supported or didn't return results");
  }

  return await crypto.subtle.importKey(
    "raw",
    first,
    { name: algorithm, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function getCredentialFromCredentialId(
  credentialId: string,
  rp: { id: string; name: string },
): Promise<
  | {
      data: { credential: PublicKeyCredential };
      error: null;
    }
  | {
      data: null;
      error: UserAbortedError | NoPRFExtensionError | NotAllowedError;
    }
> {
  const opts = {
    publicKey: {
      challenge: new Uint8Array(32).fill(2), // Same challenge for consistency
      rpId: rp.id,
      allowCredentials: [
        {
          id: base64urlToUint8Array(credentialId),
          type: "public-key",
        },
      ],
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "required",
        requireResidentKey: true,
      },
      extensions: {
        prf: {
          eval: {
            first: staticSalt,
          },
        },
      },
    },
  } as any;

  let credential: PublicKeyCredential;
  try {
    credential = (await navigator.credentials.get(opts)) as PublicKeyCredential;
  } catch (e) {
    if (e instanceof DOMException) {
      if (e.name === "AbortError") {
        return { data: null, error: new UserAbortedError() };
      }
    }
    return { data: null, error: new NotAllowedError() };
  }
  const extensionResults = credential.getClientExtensionResults();
  const first = (extensionResults as any).prf?.results?.first as
    | BufferSource
    | undefined;
  if (first === undefined) {
    throw new Error("PRF extension not supported or didn't return results");
  }

  return { data: { credential }, error: null };
}

export async function createCredential(rp: {
  name: string;
  id: string;
}): Promise<
  | {
      data: { credential: PublicKeyCredential; prfOutput: BufferSource };
      error: null;
    }
  | {
      data: null;
      error: UserAbortedError | NoPRFExtensionError | NotAllowedError;
    }
> {
  const buf = crypto.getRandomValues(new Uint8Array(32)).buffer;
  const opts = {
    publicKey: {
      challenge: new Uint8Array([1, 2, 3, 4]), // Example value
      rp,
      user: {
        id: buf,
        name: "UTXOS Private Key",
        displayName: "UTXOS Private Key",
      },
      pubKeyCredParams: [
        { alg: -8, type: "public-key" }, // Ed25519
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        userVerification: "required",
        residentKey: "required",
        requireResidentKey: true,
      },
      extensions: {
        prf: {
          eval: {
            first: staticSalt,
          },
        },
        credProps: true,
      },
    },
  };
  let credential: PublicKeyCredential;
  try {
    credential = (await navigator.credentials.create(
      opts as any,
    )) as PublicKeyCredential;
  } catch (e: unknown) {
    if (e instanceof DOMException) {
      if (e.name === "AbortError") {
        return { data: null, error: new UserAbortedError() };
      }
    }
    return { data: null, error: new NotAllowedError() };
  }

  const extensionResults = credential.getClientExtensionResults();

  const first = (extensionResults as any).prf?.results?.first as
    | BufferSource
    | undefined;

  if (first === undefined) {
    return { data: null, error: new NoPRFExtensionError() };
  }

  return {
    data: {
      credential,
      prfOutput: first,
    },
    error: null,
  };
}

function base64urlToUint8Array(base64url: string) {
  // remove whitespace/newlines if any
  const s = base64url.replace(/\s+/g, "");
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
