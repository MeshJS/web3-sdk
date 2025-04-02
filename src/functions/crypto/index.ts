import { Crypto as WebCrypto } from "@peculiar/webcrypto";
let crypto: Crypto;
// Browser environment
if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
  crypto = window.crypto;
}
// Node.js environment
else if (typeof global !== "undefined") {
  const webCrypto = new WebCrypto();
  crypto = webCrypto as unknown as Crypto;
} else {
  throw new Error("Web Crypto API is not supported in this environment.");
}
export { crypto };

export * from "./encryption";
export * from "./hash";
