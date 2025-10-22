# Third-Party Authentication Demo

A demonstration application showcasing third-party OAuth authentication integration with UTXOS Web3 wallets.

## Overview

This demo application demonstrates how to implement third-party authentication (Google OAuth and Discord OAuth) and integrate it with Web3 wallet functionality. The app shows how to:

- Authenticate users via Google and Discord OAuth
- Obtain refresh tokens from OAuth providers
- Use refresh tokens to automatically authenticate with Web3 wallets
- Enable wallet functionality without requiring users to manually connect their wallets

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google OAuth Client ID and Secret
- Discord OAuth Client ID and Secret

### Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_GOOGLE_CLIENT=your_google_client_id
GOOGLE_SECRET=your_google_client_secret
NEXT_PUBLIC_DISCORD_CLIENT=your_discord_client_id
DISCORD_SECRET=your_discord_client_secret
```

## How It Works

### Authentication Flow

1. **OAuth Login**: Users click "Login with Google" or "Login with Discord"
2. **OAuth Callback**: After successful authentication, users are redirected to `/api/auth`
3. **Token Exchange**: The API route exchanges the authorization code for access and refresh tokens
4. **Redirect with Token**: Users are redirected back to the main page with the refresh token
5. **Auto Wallet Connection**: Users can then use the "Auto Sign In With Token" button to automatically connect their Web3 wallet

### Web3 Integration

The app integrates with the Web3 SDK to enable wallet functionality:

```typescript
const wallet = await Web3Wallet.enable({
  projectId: "c92cc4c3-1700-4f40-8545-90c47eef3862", // Replace with your project ID
  networkId: 0,
  directTo: "discord",
  refreshToken: token,
});
```
