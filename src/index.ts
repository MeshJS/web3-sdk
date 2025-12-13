/**
 * @deprecated This package (@meshsdk/web3-sdk) is deprecated. 
 * Please use @utxos/sdk instead: https://www.npmjs.com/package/@utxos/sdk
 * 
 * Migration:
 * npm uninstall @meshsdk/web3-sdk
 * npm install @utxos/sdk
 * 
 * Then update your imports from '@meshsdk/web3-sdk' to '@utxos/sdk'
 */

// Display deprecation warning in console
if (typeof console !== 'undefined' && console.warn) {
  console.warn(
    '⚠️ DEPRECATION WARNING: @meshsdk/web3-sdk is deprecated.\n' +
    'Please migrate to @utxos/sdk: https://www.npmjs.com/package/@utxos/sdk\n' +
    'Run: npm uninstall @meshsdk/web3-sdk && npm install @utxos/sdk'
  );
}

export * from "./chains";
export * from "./functions";
export * from "./non-custodial";
export * from "./sdk";
export * from "./types";
export * from "./wallet-user-controlled";

// Re-export Spark utilities to avoid installing full SDK in apps
export {
  isValidSparkAddress,
  type Bech32mTokenIdentifier,
  SparkWallet,
} from "@buildonspark/spark-sdk";
