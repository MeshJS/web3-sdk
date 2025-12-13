# UTXOS Web3 Services SDK

The official SDK for UTXOS - a Web3 infrastructure platform for UTXO-based blockchains. This SDK provides comprehensive tools for building Web3 applications with support for Bitcoin, Cardano, and Spark networks.

Visit [UTXOS](https://utxos.dev/) for more information.

## Features

- **Multi-Chain Support**: Bitcoin, Cardano, and Spark blockchains
- **Developer-Controlled Wallets**: Manage wallets on behalf of users with secure backend integration
- **User-Controlled Wallets**: Non-custodial wallet solutions with OAuth integration (Google, Twitter, Discord, Apple)
- **Transaction Sponsorship**: Sponsor transactions for gasless user experiences
- **Shard-Based Security**: Client-side key management with multi-shard encryption
- **TypeScript Native**: Full type safety and IntelliSense support

## Installation

```bash
npm install @utxos/sdk
```

## Quick Start

### User-Controlled Wallets

Enable users to create non-custodial wallets with OAuth:

```typescript
import { Web3Wallet, EnableWeb3WalletOptions } from '@utxos/sdk';

const options: EnableWeb3WalletOptions = {
  networkId: 0, // 0: TESTNET, 1: MAINNET
  projectId: process.env.NEXT_PUBLIC_UTXOS_PROJECT_ID,
};

const wallet = await Web3Wallet.enable(options);

const bitcoinWallet = wallet.bitcoin;
const cardanoWallet = wallet.cardano;
const sparkWallet = wallet.spark;
```

Check [https://docs.utxos.dev/wallet](https://docs.utxos.dev/wallet) for more details.

### Initialize the SDK

```typescript
import { Web3Sdk } from '@utxos/sdk';

const sdk = new Web3Sdk({
  projectId: 'your-project-id',
  apiKey: 'your-api-key',
  privateKey: 'your-private-key',
  network: 'mainnet',
});
```

### Developer-Controlled Wallets

Create and manage wallets on your backend:

```typescript
// Create a new wallet
const wallet = await sdk.wallet.create();

// Get wallet
const { info, wallet } = await sdk.wallet.getWallet("WALLET_ID", NETWORK_ID);
```

Check [https://docs.utxos.dev/wallet/developer-controlled](https://docs.utxos.dev/wallet/developer-controlled) for more details.

### Transaction Sponsorship

Sponsor transactions to provide gasless experiences:

```typescript
// Sponsor a transaction
const sponsoredTx = await sdk.sponsorship.sponsor({
  unsignedTx: transactionHex,
  chain: 'cardano',
});
```

Check [https://docs.utxos.dev/sponsor](https://docs.utxos.dev/sponsor) for more details.

## Supported Chains

- **Bitcoin**: Mainnet and Testnet
- **Cardano**: Mainnet (Preview, Preprod, Mainnet)
- **Spark**: Mainnet and Regtest

## Links

- [Documentation](https://docs.utxos.dev/)
- [Website](https://utxos.dev/)
- [GitHub Repository](https://github.com/utxos-dev/utxos-sdk)

## Support

For questions and support, join our [Discord community](https://discord.gg/WvnCNqmAxy).
