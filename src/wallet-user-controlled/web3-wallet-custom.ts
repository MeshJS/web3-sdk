/**
 * some questions:
 * - how to gatekeep this feature to seperate this from us and clients?
 * - how to do auth provider 
 */

type Web3WalletCustomOptions = {
  projectId?: string;
  appUrl?: string;
};

export class Web3WalletCustom {
  constructor(options: Web3WalletCustomOptions) {}

  getUser() {
    /**
     * params needed:
     * - auth provider
     * - auth provider config (app id and secret etc)
     *
     * 1. (if no session) login with auth provider, do window.open
     * 2. (if session) get user (from `users`)
     * 3. (if no user) create user
     * 4. return user
     */
  }

  getUserWallet() {
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
     * 2. create wallet
     * 3. return wallet with device share
     */
  }

  performRecovery() {
    /**
     * params needed:
     * - current recovery answer
     * - new spending password
     * - new recovery question
     * - new recovery answer
     *
     * 1. (if no session) throw error
     * 2. perform recovery
     * 3. return wallet with device share
     */
  }

  decryptWallet() {
    /**
     * params needed:
     * - spending password
     * - device share
     * - auth share
     *
     * 1. decrypt device key share
     * 2. merge key shares
     * 3. return decrypted key
     */
  }
}
