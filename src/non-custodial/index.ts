import {
  clientGenerateWallet,
  clientRecovery,
  Web3JWTBody,
  Web3WalletObject,
  Web3AuthProvider,
} from "../";
export * from "./utils";

const AUTH_KEY = "mesh-web3-services-auth";
type AuthJwtLocationObject = {
  jwt: string;
};

const LOCAL_SHARD_KEY = "mesh-web3-services-local-shard";
type LocalShardWalletObjects = {
  deviceId: string;
  walletId: string;
  /** json string of {iv: string; ciphertext: string} */
  keyShard: string;
}[];

export type StorageLocation = "local_storage" | "chrome_local" | "chrome_sync";

// We need to adjust the API to allow for users to create a wallet using the webauthnCredentialId as well!
export type CreateWalletBody = {
  userAgent: string;
  recoveryShard: string;
  authShard: string;
  recoveryShardQuestion?: string; // This becomes optional
  webauthnCredentialId?: string; // if using webauthn, this credential is the passkey
  cardanoPubKeyHash: string;
  cardanoStakeCredentialHash: string;
  bitcoinMainnetPubKeyHash: string;
  bitcoinTestnetPubKeyHash: string;
  sparkMainnetPubKeyHash: string;
  sparkRegtestPubKeyHash: string;
  sparkMainnetStaticDepositAddress: string;
  sparkRegtestStaticDepositAddress: string;
  projectId: string;
};

export type CreateDeviceBody = {
  walletId: string;
  authShard: string;
  userAgent: string;
};

export type CreateDeviceResponse = {
  deviceId: string;
};

export type GetWalletBody = {
  id: string;
  userId: string;
  recoveryShard: string;
  createdAt: string;
  recoveryShardQuestion: string | null;
  webauthnCredentialId: string | null;
  cardanoPubKeyHash: string;
  cardanoStakeCredentialHash: string;
  bitcoinMainnetPubKeyHash: string | null;
  bitcoinTestnetPubKeyHash: string | null;
  sparkMainnetPubKeyHash: string | null;
  sparkRegtestPubKeyHash: string | null;
  projectId: string;
  authShard: string;
};

export type CreateWalletResponseBody = {
  walletId: string;
  deviceId: string;
};

export type WalletDevice = {
  id: string;
  walletId: string;
  cardanoPubKeyHash: string;
  cardanoStakeCredentialHash: string;
  bitcoinPubKeyHash: string;
  lastConnected: string;
  authShard: string;
  userAgent: string | null;
};

export type GetDevicesResponse = {
  deviceId: string;
  walletId: string;
  authShard: string;
  userAgent: string | null;
  webauthnCredentialId: string | null;
}[];

export type Web3NonCustodialProviderParams = {
  projectId: string;
  appOrigin?: string;
  storageLocation?: StorageLocation;
  googleOauth2ClientId: string;
  twitterOauth2ClientId: string;
  discordOauth2ClientId: string;
  appleOauth2ClientId: string;
};

export type Web3NonCustodialProviderUser = {
  id: string;
  scopes: string[];
  provider: string;
  providerId: string;
  avatarUrl: string | null;
  email: string | null;
  username: string | null;
  token: string;
};

export type Web3NonCustodialWallet = {
  deviceId: string;
  walletId: string;
  authShard: string;
  localShard: string;
  userAgent: string | null;
  webauthnCredentialId: string | null;
};

export class NotAuthenticatedError extends Error {
  constructor(message = "User is not authenticated") {
    super(message);
    this.name = "NotAuthenticatedError";
  }
}

export class WalletServerRetrievalError extends Error {
  constructor(message = "Unable to get custodial shards from the server.") {
    super(message);
    this.name = "WalletServerRetrievalError";
  }
}

export class WalletServerCreationError extends Error {
  constructor(message = "Unable to create custodial shards on the server.") {
    super(message);
    this.name = "WalletServerCreationError";
  }
}

export class SessionExpiredError extends Error {
  constructor(message = "User session has expired") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

export class AuthRouteError extends Error {
  constructor(message = "Unable to finish authentication process.") {
    super(message);
    this.name = "AuthRouteError";
  }
}

export class StorageRetrievalError extends Error {
  constructor(message = "Unable to retrieve key from storage.") {
    super(message);
    this.name = "StorageRetrievalError";
  }
}

export class StorageInsertError extends Error {
  constructor(message = "Unable to insert data in storage.") {
    super(message);
    this.name = "StorageInsertError";
  }
}

export class Web3NonCustodialProvider {
  projectId: string;
  appOrigin: string;
  storageLocation: StorageLocation;
  googleOauth2ClientId: string;
  twitterOauth2ClientId: string;
  discordOauth2ClientId: string;
  appleOauth2ClientId: string;

  constructor(params: Web3NonCustodialProviderParams) {
    this.projectId = params.projectId;
    this.appOrigin = params.appOrigin ? params.appOrigin : "https://utxos.dev";
    this.storageLocation = params.storageLocation
      ? params.storageLocation
      : "local_storage";
    this.googleOauth2ClientId = params.googleOauth2ClientId;
    this.twitterOauth2ClientId = params.twitterOauth2ClientId;
    this.discordOauth2ClientId = params.discordOauth2ClientId;
    this.appleOauth2ClientId = params.appleOauth2ClientId;
  }

  async checkNonCustodialWalletsOnServer(): Promise<
    | { data: Web3WalletObject[]; error: null }
    | {
        data: null;
        error:
          | NotAuthenticatedError
          | StorageRetrievalError
          | SessionExpiredError;
      }
  > {
    const { data: user, error: userError } = await this.getUser();
    if (userError) {
      return { error: userError, data: null };
    }

    const result = await fetch(this.appOrigin + "/api/wallet", {
      headers: { Authorization: "Bearer " + user.token },
    });

    const wallets = (await result.json()) as Web3WalletObject[];

    return { data: wallets, error: null };
  }

  async getWallets(): Promise<
    | { data: Web3NonCustodialWallet[]; error: null }
    | {
        data: null;
        error:
          | NotAuthenticatedError
          | StorageRetrievalError
          | SessionExpiredError;
      }
  > {
    const { data: user, error: userError } = await this.getUser();
    if (userError) {
      return { error: userError, data: null };
    }

    const { data: localShards, error: localShardError } =
      await this.getFromStorage<LocalShardWalletObjects>(
        LOCAL_SHARD_KEY + user.id,
      );
    if (localShardError) {
      return { error: localShardError, data: null };
    }
    const ids = localShards.map((item) => item.deviceId);
    const params = new URLSearchParams();
    ids.forEach((id) => params.append("ids", id));

    const res = await fetch(
      this.appOrigin + "/api/device?" + params.toString(),
      { headers: { Authorization: "Bearer " + user.token } },
    );
    if (res.ok === false) {
      return {
        data: null,
        error: new WalletServerRetrievalError(
          "Retrieving wallets from the server failed with status " + res.status,
        ),
      };
    }

    const walletDevices = (await res.json()) as GetDevicesResponse;

    const custodialWallets = walletDevices.map((device) => {
      const localShard = localShards.find(
        (item) => item.deviceId === device.deviceId,
      );
      const i: Web3NonCustodialWallet = {
        deviceId: device.deviceId,
        walletId: device.walletId,
        authShard: device.authShard,
        userAgent: device.userAgent,
        localShard: localShard!.keyShard,
        webauthnCredentialId: device.webauthnCredentialId,
      };
      return i;
    });

    return {
      data: custodialWallets,
      error: null,
    };
  }

  async createWallet(
    deviceShardEncryptionKey: CryptoKey,
    recoveryShardEncryptionKey: CryptoKey,
    recoveryQuestion?: string,
    webauthnCredentialId?: string,
  ): Promise<
    | {
        data: null;
        error:
          | NotAuthenticatedError
          | SessionExpiredError
          | WalletServerCreationError;
      }
    | { error: null; data: { deviceId: string; walletId: string } }
  > {
    const userAgent = navigator.userAgent;
    const { data: user, error: userError } = await this.getUser();
    if (userError) {
      return { error: userError, data: null };
    }

    const {
      cardanoPubKeyHash,
      cardanoStakeCredentialHash,
      encryptedDeviceShard,
      encryptedRecoveryShard,
      authShard,
      bitcoinMainnetPubKeyHash,
      bitcoinTestnetPubKeyHash,
      sparkMainnetPubKeyHash,
      sparkRegtestPubKeyHash,
      sparkMainnetStaticDepositAddress,
      sparkRegtestStaticDepositAddress,
    } = await clientGenerateWallet(
      deviceShardEncryptionKey,
      recoveryShardEncryptionKey,
    );

    const body: CreateWalletBody = {
      userAgent,
      projectId: this.projectId,
      recoveryShard: encryptedRecoveryShard,
      authShard,
      bitcoinMainnetPubKeyHash,
      bitcoinTestnetPubKeyHash,
      cardanoPubKeyHash: cardanoPubKeyHash,
      cardanoStakeCredentialHash: cardanoStakeCredentialHash,
      sparkMainnetPubKeyHash,
      sparkRegtestPubKeyHash,
      webauthnCredentialId: webauthnCredentialId,
      recoveryShardQuestion: recoveryQuestion,
      sparkMainnetStaticDepositAddress,
      sparkRegtestStaticDepositAddress,
    };
    const res = await fetch(this.appOrigin + "/api/wallet", {
      method: "POST",
      headers: { Authorization: "Bearer " + user.token },
      body: JSON.stringify(body),
    });

    if (res.ok === false) {
      return {
        error: new WalletServerCreationError(
          "Retrieving wallets from the server failed with status " + res.status,
        ),
        data: null,
      };
    }
    const result = (await res.json()) as CreateWalletResponseBody;

    await this.pushDevice({
      deviceId: result.deviceId,
      encryptedDeviceShard,
      walletId: result.walletId,
    });

    return {
      data: { deviceId: result.deviceId, walletId: result.walletId },
      error: null,
    };
  }

  async getUser(): Promise<
    | { data: Web3NonCustodialProviderUser; error: null }
    | { data: null; error: NotAuthenticatedError | SessionExpiredError }
  > {
    const { data } = await this.getFromStorage<AuthJwtLocationObject>(AUTH_KEY);
    // get jwt from localStorage.
    if (data === null) {
      // error for no JWT
      return { data: null, error: new NotAuthenticatedError() };
    }
    const parts = data.jwt.split(".");
    const bodyUnparsed = parts[1];
    if (bodyUnparsed === undefined) {
      return { data: null, error: new NotAuthenticatedError() };
    }
    const body = JSON.parse(
      atob(bodyUnparsed.replace(/-/g, "+").replace(/_/g, "/")),
    ) as Web3JWTBody;

    if (body.exp < Date.now()) {
      return { data: null, error: new SessionExpiredError() };
    }

    return {
      data: {
        id: body.sub,
        scopes: body.scopes,
        provider: body.provider,
        providerId: body.providerId,
        avatarUrl: body.avatarUrl,
        email: body.email,
        username: body.username,
        token: data.jwt,
      },
      error: null,
    };
  }

  async performRecovery(
    walletId: string,
    recoveryShardEncryptionKey: CryptoKey,
    newDeviceShardEncryptionKey: CryptoKey,
  ) {
    const { data: user, error: userError } = await this.getUser();
    if (userError) {
      return { error: userError, data: null };
    }
    const res = await fetch(this.appOrigin + "/api/wallet/" + walletId, {
      headers: { Authorization: "Bearer " + user.token },
    });
    if (res.ok === false) {
      return {
        error: new WalletServerRetrievalError(
          "Retrieving wallet " +
            walletId +
            "from the server failed with status " +
            res.status,
        ),
        data: null,
      };
    }
    const wallet = (await res.json()) as GetWalletBody;

    const { authShard, deviceShard, fullKey } = await clientRecovery(
      wallet.authShard,
      wallet.recoveryShard,
      recoveryShardEncryptionKey,
      newDeviceShardEncryptionKey,
    );

    const userAgent = navigator.userAgent;

    const createDeviceBody: CreateDeviceBody = {
      walletId,
      authShard,
      userAgent,
    };
    const createDeviceRes = await fetch(this.appOrigin + "/api/device", {
      method: "POST",
      headers: { Authorization: "Bearer " + user.token },
      body: JSON.stringify(createDeviceBody),
    });

    if (createDeviceRes.ok === false) {
      return {
        error: new WalletServerCreationError(
          "Retrieving wallets from the server failed with status " +
            createDeviceRes.status,
        ),
        data: null,
      };
    }

    const newDeviceWallet =
      (await createDeviceRes.json()) as CreateDeviceResponse;

    await this.pushDevice({
      deviceId: newDeviceWallet.deviceId,
      encryptedDeviceShard: deviceShard,
      walletId,
    });

    return { error: null, data: { fullKey } };
  }

  signInWithProvider(
    provider: Web3AuthProvider,
    redirectUrl: string,
    callback: (authorizationUrl: string) => void,
  ) {
    if (provider === "google") {
      const googleState = JSON.stringify({
        redirect: redirectUrl,
        provider: "google",
        projectId: this.projectId,
      });
      const googleSearchParams = new URLSearchParams({
        client_id: this.googleOauth2ClientId,
        response_type: "code",
        redirect_uri: this.appOrigin + "/api/auth",
        scope:
          "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
        state: btoa(googleState),
      });
      const googleAuthorizeUrl =
        "https://accounts.google.com/o/oauth2/v2/auth?" +
        googleSearchParams.toString();
      callback(googleAuthorizeUrl);
      return;
    } else if (provider === "discord") {
      const discordState = JSON.stringify({
        redirect: redirectUrl,
        provider: "discord",
        projectId: this.projectId,
      });
      const discordSearchParams = new URLSearchParams({
        client_id: this.discordOauth2ClientId,
        response_type: "code",
        redirect_uri: this.appOrigin + "/api/auth",
        scope: "identify email",
        state: btoa(discordState),
      });
      const discordAuthorizeUrl =
        "https://discord.com/oauth2/authorize?" +
        discordSearchParams.toString();

      callback(discordAuthorizeUrl);
      return;
    } else if (provider === "twitter") {
      const twitterState = JSON.stringify({
        redirect: redirectUrl,
        provider: "twitter",
        projectId: this.projectId,
      });
      const twitterSearchParams = new URLSearchParams({
        response_type: "code",
        client_id: this.twitterOauth2ClientId,
        redirect_uri: this.appOrigin + "/api/auth",
        scope: "users.read+tweet.read+offline.access+users.email",
        state: btoa(twitterState),
        code_challenge: "challenge",
        code_challenge_method: "plain",
      });
      const twitterAuthorizeUrl =
        "https://x.com/i/oauth2/authorize?" + twitterSearchParams.toString();
      callback(twitterAuthorizeUrl);
      return;
    } else if (provider === "apple") {
      const appleState = JSON.stringify({
        redirect: redirectUrl,
        provider: "apple",
        projectId: this.projectId,
      });
      const appleSearchParams = new URLSearchParams({
        client_id: this.appleOauth2ClientId,
        response_type: "code",
        redirect_uri: this.appOrigin + "/api/auth",
        response_mode: "form_post",
        scope: "name email",
        state: btoa(appleState),
      });
      const appleAuthorizeUrl =
        "https://appleid.apple.com/auth/authorize?" +
        appleSearchParams.toString();
      callback(appleAuthorizeUrl);
      return;
    }
  }

  /** Always place under /auth/mesh */
  handleAuthenticationRoute(): { error: AuthRouteError } | void {
    console.log("Logging params:", window.location.search);
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const redirect = params.get("redirect");
    console.log(
      "Logging from inside handleAuthenticationRoute:",
      token,
      redirect,
    );
    if (token && redirect) {
      this.putInStorage<AuthJwtLocationObject>(AUTH_KEY, { jwt: token });
      window.location.href = redirect;
      return;
    }
    return {
      error: new AuthRouteError(
        `Either token or redirect are undefined. ?token=${token}, ?redirect=${redirect}`,
      ),
    };
  }

  private async putInStorage<ObjectType extends object>(
    key: string,
    data: ObjectType,
  ) {
    if (this.storageLocation === "chrome_local") {
      // @todo - If this throws try/catch
      await chrome.storage.local.set({ [key]: data });
    } else if (this.storageLocation === "chrome_sync") {
      // @todo - If this throws try/catch
      await chrome.storage.sync.set({ [key]: data });
    } else if (this.storageLocation === "local_storage") {
      // @todo - If this throws try/catch
      localStorage.setItem(key, JSON.stringify(data));
    }
  }
  private async pushDevice(deviceWallet: {
    deviceId: string;
    encryptedDeviceShard: string;
    walletId: string;
  }): Promise<
    { error: NotAuthenticatedError | SessionExpiredError } | { error: null }
  > {
    const { data: user, error: userError } = await this.getUser();
    if (userError) {
      return { error: userError };
    }
    let { data, error } = await this.getFromStorage<LocalShardWalletObjects>(
      LOCAL_SHARD_KEY + user.id,
    );
    // @todo Make sure this is the best way to retrieve error's from the local storage (e.g. return seperate errors for a critical failure / the object simply doesn't exist.)
    if (data === null) {
      console.log(
        "We are expecting the error here to be that no local shard wallet objects exists yet: " +
          error!.message,
      );
      data = [];
    }
    data.push({
      deviceId: deviceWallet.deviceId,
      keyShard: deviceWallet.encryptedDeviceShard,
      walletId: deviceWallet.walletId,
    });

    await this.putInStorage<LocalShardWalletObjects>(
      LOCAL_SHARD_KEY + user.id,
      data,
    );

    return { error: null };
  }
  private async getFromStorage<ObjectType extends object>(
    key: string,
  ): Promise<
    | { data: ObjectType; error: null }
    | { data: null; error: StorageRetrievalError }
  > {
    if (this.storageLocation === "chrome_local") {
      // @todo - If this throws try/catch
      const query = await chrome.storage.local.get([key]);
      const data = query[key];
      if (data) {
        return { data: data as ObjectType, error: null };
      } else {
        return {
          data: null,
          error: new StorageRetrievalError(
            `Unable to retrieve key ${key} from chrome.storage.local.`,
          ),
        };
      }
    } else if (this.storageLocation === "chrome_sync") {
      // @todo - If this throws try/catch
      const query = await chrome.storage.sync.get([key]);
      const data = query[key];
      if (data) {
        return { data: data as ObjectType, error: null };
      } else {
        return {
          data: null,
          error: new StorageRetrievalError(
            `Unable to retrieve key ${key} from chrome.storage.sync.`,
          ),
        };
      }
    } else if (this.storageLocation === "local_storage") {
      // @todo - If this throws try/catch
      const data = localStorage.getItem(key);
      if (data) {
        return {
          data: JSON.parse(data) as ObjectType,
          error: null,
        };
      } else {
        return {
          data: null,
          error: new StorageRetrievalError(
            `Unable to retrieve key ${key} from localStorage.`,
          ),
        };
      }
    }
    return {
      data: null,
      error: new StorageRetrievalError(
        "Class missing a valid storage location.",
      ),
    };
  }
}
