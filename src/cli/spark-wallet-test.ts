#!/usr/bin/env node

import { Web3SparkWallet } from "../spark";
import { encodeSparkAddress, getP2TRAddressFromPublicKey, Network, SparkWallet } from "@buildonspark/spark-sdk";

// Test configuration
const TEST_NETWORK = "REGTEST";
const TEST_MNEMONIC = "sauce kangaroo interest two start fade intact gauge assume cinnamon total help intact lemon coffee egg gas hedgehog valve morning upgrade subway month figure"; // Valid BIP39 test mnemonic

/**
 * CLI for testing Spark wallet functionality
 * Based on Spark Money documentation examples
 */
class SparkWalletCLI {
    private sparkService: Web3SparkWallet | null = null;

    /**
     * Initialize Spark wallet from mnemonic
     */
    async initWallet(mnemonic?: string): Promise<void> {
        try {
            console.log("🚀 Initializing Spark wallet...");

            // Create getWallet function for the service
            this.sparkService = new Web3SparkWallet({
                network: TEST_NETWORK,
                key: {
                    type: "mnemonic",
                    words: (mnemonic || TEST_MNEMONIC).split(" ")
                }
            });

            // Initialize the embedded wallet
            await this.sparkService.init();

            console.log("✅ Spark wallet initialized successfully");
        } catch (error) {
            console.error("❌ Failed to initialize wallet:", error);
            process.exit(1);
        }
    }

    /**
     * Display wallet information
     */
    async getInfo(): Promise<void> {
        if (!this.sparkService) {
            console.log("🔄 Auto-initializing wallet...");
            await this.initWallet();
        }

        try {
            console.log("📊 Getting wallet information...");
            const info = await this.sparkService!.getWalletInfo();

            console.log("\n=== Wallet Information ===");
            console.log("Spark Address:", info.sparkAddress);
            console.log("Static Deposit Address:", info.staticDepositAddress);
            console.log("Balance:", info.balance.toString(), "sats");
            // console.log("Identity Public Key:", info.identityPublicKey);
            // console.log("Token Balances:", info.tokenBalances.size, "tokens");
        } catch (error) {
            console.error("❌ Failed to get wallet info:", error);
        }
    }

    /**
     * Test lightweight SparkWallet initialization without mnemonic
     */
    async testLightweightWallet(): Promise<void> {
        try {
            const result = await SparkWallet.initialize({
                    options: { network: "REGTEST" }
                });
            const lightweightWallet = result.wallet;
            console.log("🧪 Testing lightweight SparkWallet initialization...\n");
            
            // Test 1: Initialize without mnemonic or signer
            console.log("=== Test 1: Minimal Configuration ===");
            try {
                const lightweightWallet = new SparkWallet({
                    network: "REGTEST"
                    // No mnemonic, no signer
                });
                
                console.log("✅ Lightweight wallet created successfully");
                
                // Test what methods are available
                console.log("\n=== Testing Available Methods ===");
                
                // Test getIdentityPublicKey (should work according to docs)
                try {
                    const identityKey = await lightweightWallet.getIdentityPublicKey();
                    console.log("✅ getIdentityPublicKey():", identityKey);
                } catch (error) {
                    console.log("❌ getIdentityPublicKey() failed:", error);
                }
                
                // Test getSparkAddress (should work according to docs)
                try {
                    const sparkAddress = await lightweightWallet.getSparkAddress();
                    console.log("✅ getSparkAddress():", sparkAddress);
                } catch (error) {
                    console.log("❌ getSparkAddress() failed:", error);
                }
                
                // Test getBalance (might need authentication)
                try {
                    const balance = await lightweightWallet.getBalance();
                    console.log("✅ getBalance():", balance);
                } catch (error) {
                    console.log("❌ getBalance() failed:", error);
                }
                
                // Test getTransfers (should work according to docs)
                try {
                    const transfers = await lightweightWallet.getTransfers();
                    console.log("✅ getTransfers():", transfers);
                } catch (error) {
                    console.log("❌ getTransfers() failed:", error);
                }
                
            } catch (error) {
                console.log("❌ Lightweight wallet creation failed:", error);
            }
            
            // Test 2: Query specific address balance
            console.log("\n=== Test 2: Query Balance by Address ===");
            const testSparkAddress = "sprt1pgssx7zt9eduf4jwvhqyw730qgdnj77g0q0u47fwtp05vwkagz6wd8mkmd4yeu";
            
            try {
                const result = await SparkWallet.initialize({
                    options: { network: "REGTEST" }
                });
                const lightweightWallet = result.wallet;
                
                // Check if there are any methods that accept address parameters
                console.log("Testing if we can query balance for address:", testSparkAddress);
                
                // Look for methods that might accept an address parameter
                const walletMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(lightweightWallet))
                    .filter(name => typeof (lightweightWallet as any)[name] === 'function')
                    .filter(name => name.toLowerCase().includes('balance') || name.toLowerCase().includes('query'));
                    
                console.log("Balance/Query methods found:", walletMethods);
                
            } catch (error) {
                console.log("❌ Address query test failed:", error);
            }
            
        } catch (error) {
            console.error("❌ Failed to test lightweight wallet:", error);
        }
    }

    /**
     * Get Bitcoin deposit address
     */
    async getDepositAddress(): Promise<void> {
        if (!this.sparkService) {
            console.error("❌ Wallet not initialized. Run 'initWallet' first.");
            return;
        }

        try {
            console.log("🏦 Getting deposit addresses...");
            const wallet = await this.sparkService;
            const staticAddress = await wallet.getStaticDepositAddress();

            console.log("\n=== Deposit Addresses ===");
            console.log("Static Deposit Address (reusable):", staticAddress);
            console.log("\n💡 Best Practices:");
            console.log("- Use static address for production");
            console.log("- Start with small test amounts");
            console.log("- Keep track of transaction IDs");
            console.log("- Wait for 3 confirmations before claiming");
        } catch (error) {
            console.error("❌ Failed to get deposit addresses:", error);
        }
    }

    /**
     * Claim a Bitcoin deposit
     */
    async claimDeposit(txId: string): Promise<void> {
        if (!this.sparkService) {
            console.log("🔄 Auto-initializing wallet...");
            await this.initWallet();
        }

        try {
            console.log(`💰 Claiming deposit for transaction: ${txId}`);
            const result = await this.sparkService!.claimBitcoinDeposit(txId);

            if (result.success) {
                console.log("✅", result.message);
                if (result.claimResult) {
                    console.log("Credited Amount:", result.claimResult.creditAmountSats, "sats");
                }
            } else {
                console.error("❌", result.message);
            }
        } catch (error) {
            console.error("❌ Failed to claim deposit:", error);
        }
    }

    /**
     * Send to another Spark wallet
     */
    async sendToUser(receiverAddress: string, amountSats: number): Promise<void> {
        if (!this.sparkService) {
            console.error("❌ Wallet not initialized. Run 'initWallet' first.");
            await this.initWallet();
        }

        try {
            console.log(`🔄 Sending ${amountSats} sats to ${receiverAddress}...`);
            const result = await this.sparkService?.sendToUser(receiverAddress, amountSats);

            if (result) {
                console.log("✅");
                console.log("Transfer ID:", result);
            } else {
                console.error("❌", result);
            }
        } catch (error) {
            console.error("❌ Failed to send transfer:", error);
        }
    }

    /**
     * Get transfer history
     */
    async getTransfers(limit?: number, offset?: number): Promise<void> {
        if (!this.sparkService) {
            console.log("🔄 Auto-initializing wallet...");
            await this.initWallet();
        }

        try {
            console.log("📋 Getting transfer history...");
            const wallet = this.sparkService!.wallet;

            // Try different methods to get transfers
            console.log("\n=== Testing Transfer Methods ===");

            // Method 1: Check if there's a getTransfers method
            try {
                // @ts-ignore - testing method existence
                if (typeof wallet.getTransfers === 'function') {
                    console.log("✅ Found getTransfers method");
                    const transfers = await wallet!.getTransfers(limit, offset);
                    console.log("Transfers result:", JSON.stringify(transfers, null, 2));
                } else {
                    console.log("❌ getTransfers method not found");
                }
            } catch (error) {
                console.log("❌ getTransfers failed:", error);
            }

        } catch (error) {
            console.error("❌ Failed to get transfers:", error);
        }
    }

    /**
     * Get UTXOs for deposit address
     */
    async getUtxos(): Promise<void> {
        if (!this.sparkService) {
            console.log("🔄 Auto-initializing wallet...");
            await this.initWallet();
        }

        try {
            console.log("💰 Getting UTXOs for deposit address...");
            const wallet = this.sparkService!.wallet;

            // Get wallet info first to get deposit address
            const info = await this.sparkService!.getWalletInfo();
            console.log("Static Deposit Address:", info.staticDepositAddress);

            // Get UTXOs for deposit address
            const utxos = await wallet!.getUtxosForDepositAddress(info.staticDepositAddress);

            console.log("\n=== UTXOs Structure ===");
            console.log("Number of UTXOs:", utxos ? utxos.length : 0);

            if (utxos && utxos.length > 0) {
                console.log("UTXOs data:", JSON.stringify(utxos, null, 2));

                console.log("\n=== UTXO Summary ===");
                utxos.forEach((utxo: any, index: number) => {
                    console.log(`${index + 1}. UTXO:`);
                    console.log(`   TxID: ${utxo.txid || utxo.txhash || 'N/A'}`);
                    console.log(`   Output Index: ${utxo.vout || utxo.outputIndex || 'N/A'}`);
                    console.log(`   Value: ${utxo.value || utxo.amount || 'N/A'} sats`);
                    console.log(`   Script: ${utxo.script || 'N/A'}`);
                    console.log(`   Confirmations: ${utxo.confirmations || 'N/A'}`);
                    if (utxo.blockHeight) console.log(`   Block Height: ${utxo.blockHeight}`);
                    if (utxo.status) console.log(`   Status: ${utxo.status}`);
                    console.log("");
                });
            } else {
                console.log("No UTXOs found for deposit address");
            }

            // Also try to inspect the wallet object for other UTXO methods
            console.log("\n=== Available UTXO Methods ===");
            const walletMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(wallet))
                .filter(name => typeof (wallet as any)[name] === 'function')
                .filter(name => name.toLowerCase().includes('utxo'));

            if (walletMethods.length > 0) {
                console.log("UTXO-related methods found:", walletMethods);
            } else {
                console.log("No obvious UTXO-related methods found");
            }

        } catch (error) {
            console.error("❌ Failed to get UTXOs:", error);
        }
    }

    /**
     * Test P2TR address derivation from public keys
     */
    async testP2TRAddressesDerivedFromPubKeys(): Promise<void> {
        try {
            console.log("🔐 Testing P2TR address derivation from identity public keys...\n");

            // Create wallets for both networks
            const mainnetWallet = new Web3SparkWallet({
                network: "MAINNET",
                key: {
                    type: "mnemonic",
                    words: TEST_MNEMONIC.split(" ")
                }
            });

            const regtestWallet = new Web3SparkWallet({
                network: "REGTEST",
                key: {
                    type: "mnemonic",
                    words: TEST_MNEMONIC.split(" ")
                }
            });

            // Initialize both wallets
            await Promise.all([
                mainnetWallet.init(),
                regtestWallet.init()
            ]);

            // Get identity public keys from both networks
            const [mainnetKey, regtestKey] = await Promise.all([
                mainnetWallet.getIdentityPublicKey(),
                regtestWallet.getIdentityPublicKey()
            ]);

            console.log("=== Identity Public Keys ===");
            console.log("MAINNET Identity Key:", mainnetKey);
            console.log("REGTEST Identity Key:", regtestKey);
            console.log("");

            // Derive P2TR addresses from each identity key for both networks
            console.log("=== P2TR Address Derivation Test ===");
            
            // Convert hex strings to Uint8Array for P2TR function
            const mainnetKeyBytes = new Uint8Array(Buffer.from(mainnetKey, 'hex'));
            const regtestKeyBytes = new Uint8Array(Buffer.from(regtestKey, 'hex'));
            
            // MAINNET key → addresses for both networks
            const mainnetKeyToMainnetAddr = getP2TRAddressFromPublicKey(mainnetKeyBytes, Network.MAINNET);
            const mainnetKeyToRegtestAddr = getP2TRAddressFromPublicKey(mainnetKeyBytes, Network.REGTEST);
            
            // REGTEST key → addresses for both networks  
            const regtestKeyToMainnetAddr = getP2TRAddressFromPublicKey(regtestKeyBytes, Network.MAINNET);
            const regtestKeyToRegtestAddr = getP2TRAddressFromPublicKey(regtestKeyBytes, Network.REGTEST);

            console.log("MAINNET Key → MAINNET Address:", mainnetKeyToMainnetAddr);
            console.log("MAINNET Key → REGTEST Address:", mainnetKeyToRegtestAddr);
            console.log("REGTEST Key → MAINNET Address:", regtestKeyToMainnetAddr);
            console.log("REGTEST Key → REGTEST Address:", regtestKeyToRegtestAddr);
            console.log("");

            // Get actual wallet deposit addresses for comparison
            const [mainnetWalletInfo, regtestWalletInfo] = await Promise.all([
                mainnetWallet.getWalletInfo(),
                regtestWallet.getWalletInfo()
            ]);

            console.log("=== Wallet vs P2TR Deposit Address Comparison ===");
            console.log("MAINNET Wallet Deposit Address:", mainnetWalletInfo.staticDepositAddress);
            console.log("REGTEST Wallet Deposit Address:", regtestWalletInfo.staticDepositAddress);
            console.log("");

            // Compare if wallet deposit addresses match P2TR derivation
            const mainnetMatches = mainnetWalletInfo.staticDepositAddress === mainnetKeyToMainnetAddr;
            const regtestMatches = regtestWalletInfo.staticDepositAddress === regtestKeyToRegtestAddr;

            console.log("=== Results ===");
            console.log(`MAINNET Wallet ↔ P2TR: ${mainnetMatches ? '✅ MATCH' : '❌ MISMATCH'}`);
            console.log(`REGTEST Wallet ↔ P2TR: ${regtestMatches ? '✅ MATCH' : '❌ MISMATCH'}`);
            
            if (mainnetMatches && regtestMatches) {
                console.log("\n✅ SUCCESS: Wallet addresses match P2TR derivation!");
                console.log("✅ This confirms our address derivation logic is correct.");
            } else {
                console.log("\n❌ MISMATCH: Some addresses don't match P2TR derivation.");
                console.log("❌ This suggests an issue with our address derivation approach.");
            }

        } catch (error) {
            console.error("❌ Failed to test P2TR address derivation:", error);
        }
    }

    /**
     * Test identity public key consistency across networks
     */
    async testIdentityKeyConsistency(): Promise<void> {
        try {
            console.log("🔐 Testing identity public key consistency across networks...\n");

            // Create wallets for both networks
            const mainnetWallet = new Web3SparkWallet({
                network: "MAINNET",
                key: {
                    type: "mnemonic",
                    words: TEST_MNEMONIC.split(" ")
                }
            });

            const regtestWallet = new Web3SparkWallet({
                network: "REGTEST",
                key: {
                    type: "mnemonic",
                    words: TEST_MNEMONIC.split(" ")
                }
            });

            // Initialize both wallets
            await Promise.all([
                mainnetWallet.init(),
                regtestWallet.init()
            ]);

            // Get identity public keys from both networks
            const [mainnetKey, regtestKey] = await Promise.all([
                mainnetWallet.getIdentityPublicKey(),
                regtestWallet.getIdentityPublicKey()
            ]);

            console.log("=== Identity Public Key Comparison ===");
            console.log("MAINNET Identity Key:", mainnetKey);
            console.log("REGTEST Identity Key:", regtestKey);
            console.log("");

            // Compare the keys
            if (mainnetKey === regtestKey) {
                console.log("ℹ️  Identity public keys are the same across networks");
                console.log("ℹ️  (This would be unusual for Spark's network-specific design)");
            } else {
                console.log("✅ EXPECTED: Identity public keys are different per network!");
                console.log("✅ This is Spark's intended design - each network has isolated identities.");
                console.log("✅ MAINNET and REGTEST are separate ecosystems (like Bitcoin mainnet/testnet).");
            }

            // Also test multi-network wallet info
            console.log("\n=== Testing Multi-Network Wallet Info ===");
            const multiNetworkInfo = await regtestWallet.getMultiNetworkWalletInfo();
            
            console.log("Multi-network response structure:");
            console.log("- Identity Public Key:", multiNetworkInfo.networks?.regtest?.identityPublicKey);
            console.log("- Identity Public Key:", multiNetworkInfo.networks?.mainnet?.identityPublicKey);
            console.log("- Current Network:", multiNetworkInfo.network);
            console.log("- Has Mainnet Data:", !!multiNetworkInfo.networks?.mainnet);
            console.log("- Has Regtest Data:", !!multiNetworkInfo.networks?.regtest);

            if (multiNetworkInfo.networks?.mainnet && multiNetworkInfo.networks?.regtest) {
                console.log("\n=== Network Data Comparison ===");
                console.log("Mainnet Address:", encodeSparkAddress({identityPublicKey: multiNetworkInfo.networks.mainnet.identityPublicKey, network: "MAINNET"}) );
                console.log("Regtest Address:", encodeSparkAddress({identityPublicKey: multiNetworkInfo.networks.regtest.identityPublicKey, network: "REGTEST"}) );
                console.log("Mainnet Balance:", multiNetworkInfo.networks.mainnet.balance.toString(), "sats");
                console.log("Regtest Balance:", multiNetworkInfo.networks.regtest.balance.toString(), "sats");
            }

        } catch (error) {
            console.error("❌ Failed to test identity key consistency:", error);
        }
    }

    /**
     * Get latest transaction information
     */
    async getLatestTx(): Promise<void> {
        if (!this.sparkService) {
            console.log("🔄 Auto-initializing wallet...");
            await this.initWallet();
        }

        try {
            console.log("📋 Getting latest transaction...");
            const wallet = this.sparkService!.wallet;

            // Get wallet info
            const info = await this.sparkService!.getWalletInfo();
            console.log("\n=== Wallet Activity ===");
            console.log("Current Balance:", info.balance.toString(), "sats");
            console.log("Spark Address:", info.sparkAddress);
            console.log("Static Deposit Address:", info.staticDepositAddress);

            // Get UTXOs for deposit address to see available deposits
            const utxos = await wallet!.getUtxosForDepositAddress(info.staticDepositAddress);
            console.log("\n=== Available Deposits (UTXOs) ===");
            if (utxos && utxos.length > 0) {
                utxos.forEach((utxo: any, index: number) => {
                    console.log(`${index + 1}. UTXO: ${utxo.txid}`);
                });
            } else {
                console.log("No pending deposits found");
            }

            console.log("\n💡 Note: Use Spark explorer to view full transaction history");

        } catch (error) {
            console.error("❌ Failed to get latest transaction:", error);
        }
    }

    /**
     * Display help
     */
    showHelp(): void {
        console.log(`
🌟 Spark Wallet CLI Test

Commands:
  init [mnemonic]           Initialize wallet with optional mnemonic
  info                      Display wallet information
  deposit                   Get Bitcoin deposit addresses  
  claim <txId>             Claim Bitcoin deposit
  send <address> <amount>   Send sats to another Spark wallet
  transfers [limit] [offset] Get transfer history and test methods
  utxos                     Get UTXOs for deposit address
  test-p2tr                 Test P2TR address derivation from public keys
  test-lightweight          Test lightweight wallet without mnemonic
  latest                    Get latest transaction info
  events                    Test real-time event listeners (30s)
  test-identity             Test identity key consistency across networks
  help                      Show this help

Examples:
  npm run spark:cli init
  npm run spark:cli info
  npm run spark:cli deposit
  npm run spark:cli claim abc123...
  npm run spark:cli send spark1abc... 1000
  npm run spark:cli transfers
  npm run spark:cli transfers 10 0
  npm run spark:cli utxos
  npm run spark:cli test-p2tr
  npm run spark:cli latest
  npm run spark:cli events
`);
    }

    /**
     * Run CLI command
     */
    async run(): Promise<void> {
        const args = process.argv.slice(2);
        const command = args[0];

        switch (command) {
            case 'init':
                await this.initWallet(args[1]);
                break;
            case 'info':
                await this.getInfo();
                break;
            case 'deposit':
                await this.getDepositAddress();
                break;
            case 'claim':
                if (!args[1]) {
                    console.error("❌ Transaction ID required. Usage: claim <txId>");
                    return;
                }
                await this.claimDeposit(args[1]);
                break;
            case 'send':
                if (!args[1] || !args[2]) {
                    console.error("❌ Address and amount required. Usage: send <address> <amount>");
                    return;
                }
                await this.sendToUser(args[1], parseInt(args[2]));
                break;
            case 'transfers':
                const limit = args[1] ? parseInt(args[1]) : undefined;
                const offset = args[2] ? parseInt(args[2]) : undefined;
                await this.getTransfers(limit, offset);
                break;
            case 'utxos':
                await this.getUtxos();
                break;
            case 'test-lightweight':
                await this.testLightweightWallet();
                break;
            case 'latest':
                await this.getLatestTx();
                break;
            case 'test-p2tr':
                await this.testP2TRAddressesDerivedFromPubKeys();
                break;
            case 'test-identity':
                await this.testIdentityKeyConsistency();
                break;
            case 'help':
            default:
                this.showHelp();
                break;
        }
    }
}

// Run CLI if called directly
if (import.meta.url === new URL(process.argv[1]!, 'file:').href) {
    const cli = new SparkWalletCLI();
    cli.run().catch(console.error);
}

// Built-in hex conversion https://caniuse.com/mdn-javascript_builtins_uint8array_fromhex
const hasHexBuiltin: boolean = /* @__PURE__ */ (() =>
    // @ts-ignore
    typeof Uint8Array.from([]).toHex === 'function' && typeof Uint8Array.fromHex === 'function')();

export function hexToBytes(hex: string): Uint8Array {
    if (typeof hex !== 'string') throw new Error('hex string expected, got ' + typeof hex);
    // @ts-ignore
    if (hasHexBuiltin) return Uint8Array.fromHex(hex);
    const hl = hex.length;
    const al = hl / 2;
    if (hl % 2) throw new Error('hex string expected, got unpadded hex of length ' + hl);
    const array = new Uint8Array(al);
    for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
        const n1 = asciiToBase16(hex.charCodeAt(hi));
        const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
        if (n1 === undefined || n2 === undefined) {
            const char = hex[hi]! + hex[hi + 1];
            throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
        }
        array[ai] = n1 * 16 + n2; // multiply first octet, e.g. 'a3' => 10*16+3 => 160 + 3 => 163
    }
    return array;
}

// We use optimized technique to convert hex string to byte array
const asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 } as const;
function asciiToBase16(ch: number): number | undefined {
    if (ch >= asciis._0 && ch <= asciis._9) return ch - asciis._0; // '2' => 50-48
    if (ch >= asciis.A && ch <= asciis.F) return ch - (asciis.A - 10); // 'B' => 66-(65-10)
    if (ch >= asciis.a && ch <= asciis.f) return ch - (asciis.a - 10); // 'b' => 98-(97-10)
    return;
}

const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) =>
    i.toString(16).padStart(2, '0')
);


export { SparkWalletCLI };