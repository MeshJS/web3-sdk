// export * from "./encryption";
// export * from "./hash";

// let crypto: Crypto;

// // Browser environment
// if (typeof window !== "undefined" && window.crypto && window.crypto) {
//   crypto = window.crypto;
// }
// // Node.js environment
// else if (typeof global !== "undefined" && global.crypto) {
//   crypto = crypto = require("crypto");
// } else {
//   throw new Error("Web Crypto API is not supported in this environment.");
// }

// export { crypto };

export * from "./encryption";
export * from "./hash";

import * as crypto from "crypto";

// let crypto: Crypto;

// // Browser environment
// if (typeof window !== "undefined" && window.crypto) {
//   crypto = window.crypto;
// }
// // Node.js environment
// else if (typeof global !== "undefined") {
//   // Use a static import for the `crypto` module
//   const nodeCrypto = require("crypto");
//   crypto = nodeCrypto.webcrypto || nodeCrypto;
// } else {
//   throw new Error("Web Crypto API is not supported in this environment.");
// }

export { crypto };