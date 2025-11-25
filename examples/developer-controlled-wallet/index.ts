import { Web3Sdk } from "@meshsdk/web3-sdk";

/**
 * Example: Developer-Controlled Wallet with New API
 *
 * This example demonstrates the new wallet-first API for developer-controlled wallets.
 * Perfect for token issuance, treasury management, and automated operations.
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

  console.log("🚀 Creating developer-controlled wallet...");
  
  // Create wallet with both Spark and Cardano chains (shared mnemonic)
  const { sparkWallet, cardanoWallet } = await sdk.wallet.createWallet({
    tags: ["tokenization", "treasury"]
  });

  console.log("✅ Wallet created!");

  // === SPARK TOKEN OPERATIONS ===
  
  console.log("\n🪙 Creating Spark token...");
  const tokenTxId = await sparkWallet.createToken({
    tokenName: "Example Token",
    tokenTicker: "EXAM",
    decimals: 8,
    maxSupply: 1000000n,
    isFreezable: true
  });
  console.log("Token created:", tokenTxId);

  console.log("\n💰 Minting tokens...");
  const mintTxId = await sparkWallet.mintTokens(BigInt("100000"));
  console.log("Minted tokens:", mintTxId);

  console.log("\n📊 Getting token info...");
  const balance = await sparkWallet.getTokenBalance();
  const metadata = await sparkWallet.getTokenMetadata();
  console.log("Token balance:", balance.balance);
  console.log("Token name:", metadata.tokenName);

  console.log("\n📤 Transferring tokens...");
  const transferTxId = await sparkWallet.transferTokens({
    tokenIdentifier: "your-token-identifier",
    amount: BigInt("1000"),
    toAddress: "spark1recipient..."
  });
  console.log("Transfer complete:", transferTxId);

  // === COMPLIANCE OPERATIONS ===
  
  console.log("\n🚫 Freezing tokens for compliance...");
  const freezeResult = await sparkWallet.freezeTokens({
    address: "spark1suspicious...",
    freezeReason: "Compliance investigation"
  });
  console.log("Frozen outputs:", freezeResult.impactedOutputIds.length);

  console.log("\n✅ Unfreezing tokens...");
  const unfreezeResult = await sparkWallet.unfreezeTokens({
    address: "spark1suspicious..."
  });
  console.log("Unfrozen outputs:", unfreezeResult.impactedOutputIds.length);

  // === LOADING EXISTING WALLET ===
  
  console.log("\n🔄 Loading existing wallet...");
  const { sparkWallet: existingWallet } = await sdk.wallet.initWallet("existing-wallet-id");
  
  const existingBalance = await existingWallet.getTokenBalance();
  console.log("Existing wallet balance:", existingBalance.balance);
}

// Run example
main().catch(console.error);