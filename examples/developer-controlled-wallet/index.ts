import { Web3Sdk } from "@meshsdk/web3-sdk";

/**
 * Example: Developer-Controlled Wallet
 *
 * This example demonstrates wallet management with multi-chain support (Spark and Cardano).
 * Use sdk.wallet.* for wallet operations.
 * Use sdk.tokenization.spark.* for token operations (see tokenization example).
 */

async function main() {
  // Initialize SDK
  const sdk = new Web3Sdk({
    projectId: "your-project-id",
    apiKey: "your-api-key",
    network: "testnet", // or "mainnet"
    appUrl: "https://your-app.com",
    privateKey: "your-private-key", // Required for developer-controlled wallets
  });

  // === CREATE WALLET ===

  console.log("Creating developer-controlled wallet...");

  // Create wallet with both Spark and Cardano chains (shared mnemonic)
  const { info, sparkIssuerWallet, cardanoWallet } = await sdk.wallet.createWallet({
    tags: ["treasury"],
  });

  console.log("Wallet created:", info.id);

  // === LIST WALLETS ===

  console.log("\nListing all project wallets...");
  const wallets = await sdk.wallet.getProjectWallets();
  console.log(`Found ${wallets.length} wallets`);

  // === GET WALLET BY CHAIN ===

  console.log("\nGetting wallet for specific chain...");

  // Get Cardano wallet
  const { cardanoWallet: cardano } = await sdk.wallet.getWallet(info.id, "cardano");
  const addresses = cardano!.getAddresses();
  console.log("Cardano base address:", addresses.baseAddressBech32);

  // Get Spark wallet info
  const sparkWalletInfo = await sdk.wallet.sparkIssuer.getWallet(info.id);
  console.log("Spark wallet public key:", sparkWalletInfo.publicKey);

  // === LOAD EXISTING WALLET ===

  console.log("\nLoading existing wallet...");
  const { info: existingInfo, sparkWallet, cardanoWallet: existingCardano } =
    await sdk.wallet.initWallet("existing-wallet-id");

  console.log("Loaded wallet:", existingInfo.id);

  // === LIST BY TAG ===

  console.log("\nListing wallets by tag...");
  const sparkWallets = await sdk.wallet.sparkIssuer.getByTag("treasury");
  const cardanoWallets = await sdk.wallet.cardano.getWalletsByTag("treasury");

  console.log(`Found ${sparkWallets.length} Spark wallets with 'treasury' tag`);
  console.log(`Found ${cardanoWallets.length} Cardano wallets with 'treasury' tag`);
}

// Run example
main().catch(console.error);