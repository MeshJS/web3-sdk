/**
 * some questions:
 * - how to gatekeep this feature to seperate this from us and clients?
 * - how to do auth provider
 * - how do we seperate user's wallet by app id?
 */

type Web3WalletCustomOptions = {
  projectId?: string;
  appUrl?: string;
};

export class Web3WalletCustom {
  constructor(options: Web3WalletCustomOptions) {}

  signInWithGoogle() {
    /**
     * if already logged in, return session?
     * if not logged in, return either redirect URL or open a new window
     */
  }

  getUser() {
    /**
     * 1. (if no session) throw error
     * 2. (if session) get user (from `users`)
     * 3. (if no user) create user
     * 4. return user
     */
  }

  getWallet() {
    /**
     * params needed:
     * - user
     */
    /**
     * 1. (if no session) throw error
     * 2. (with auth) get user wallet (from `wallets`)
     * 3. return `wallet` (if exists, otherwise return `null`)
     */
  }

  createWallet() {
    /**
     * params needed:
     * - spending password
     * - recovery question
     * - recovery answer
     */
    /**
     * 1. (if no session) throw error
     * 2. create wallet, do SSS and encryption
     * 3. save to DB (`wallets`)
     * 4. return `wallet` and device share
     */
  }

  performRecovery() {
    /**
     * params needed:
     * - wallet
     * - current recovery answer
     * - new spending password
     * - new recovery question
     * - new recovery answer
     *
     * 1. (if no session) throw error
     * 2. perform recovery
     * 3. create keyshards
     * 4. save update keyshards to DB (`wallets`)
     * 5. return `wallet` with device share
     */
  }

  decryptWallet() {
    /**
     * params needed:
     * - wallet
     * - spending password
     * - device share
     *
     * 1. decrypt device key share
     * 2. merge key shares
     * 3. return decrypted key
     */
  }
}
