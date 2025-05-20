import { clientGenerateWallet } from "../functions";
import { Web3JWTBody } from "../types";

const AUTH_KEY = "mesh-web3-services-auth";
type AuthJwtLocationObject = {
  jwt: string;
};

const LOCAL_SHARD_KEY = "mesh-web3-services-local-shard";
type LocalShardWalletObject = {
  deviceId: string;
  /** json string of {iv: string; ciphertext: string} */
  keyShard: string;
}[];

export type StorageLocation = "local_storage" | "chrome_local" | "chrome_sync";

export type Web3NonCustodialProviderParams = {
  projectId: string;
  appOrigin?: string;
  storageLocation?: StorageLocation;
  googleOauth2ClientId: string;
  twitterOauth2ClientId: string;
  discordOauth2ClientId: string;
};

export type Web3NonCustodialProviderUser = {
  id: string;
  scopes: string[];
  provider: string;
  providerId: string;
  avatarUrl: string | null;
  email: string | null;
  username: string | null;
};

export type Web3NonCustodialWallet = {
  id: string;
  authShard: string;
  localShard: string;
  userAgent: string | null;
};

export class NotAuthenticatedError extends Error {
  constructor(message = "User is not authenticated") {
    super(message);
    this.name = "NotAuthenticatedError";
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

  constructor(params: Web3NonCustodialProviderParams) {
    this.projectId = params.projectId;
    this.appOrigin = params.appOrigin
      ? params.appOrigin
      : "https://web3.meshjs.dev";
    this.storageLocation = params.storageLocation
      ? params.storageLocation
      : "local_storage";
    this.googleOauth2ClientId = params.googleOauth2ClientId;
    this.twitterOauth2ClientId = params.twitterOauth2ClientId;
    this.discordOauth2ClientId = params.discordOauth2ClientId;
  }

  async getWallet(): Promise<
    | { data: Web3NonCustodialWallet; error: null }
    | {
        data: null;
        error:
          | SessionExpiredError
          | StorageRetrievalError
          | SessionExpiredError;
      }
  > {
    const { data: user, error: userError } = await this.getUser();
    if (userError) {
      return { error: userError, data: null };
    }

    const { data: localShard, error: localShardError } =
      await this.getFromStorage<LocalShardWalletObject>(LOCAL_SHARD_KEY);
    if (localShardError) {
      return { error: localShardError, data: null };
    }

    // get database shard from mesh server using deviceId + authentication.
    // return all these in a wallet object.
    return {
      data: { id: "", userAgent: "", localShard: "", authShard: "" },
      error: null,
    };
  }

  async createWallet(
    spendingPassword: string,
    recoveryQuestion: string,
    recoveryAnswer: string,
  ) {
    const userAgent = navigator.userAgent;
    const { data: user, error: userError } = await this.getUser();
    if (userError) {
      return { error: userError, data: null };
    }

    const { pubKeyHash, stakeCredentialHash, deviceKey, authKey, recoveryKey } =
      await clientGenerateWallet(spendingPassword, recoveryAnswer);

    console.log("Logging pub");
    // attempt to write wallet values to server
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

    console.log(
      "Logging body.exp:",
      body.exp,
      "Logging date.now()",
      Date.now() / 1000,
    );
    if (body.exp < Date.now() / 1000) {
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
      },
      error: null,
    };
  }

  signInWithProvider(
    provider: "google" | "discord" | "twitter",
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
        scope: "users.read+tweet.read+offline.access",
        state: btoa(twitterState),
        code_challenge: "challenge",
        code_challenge_method: "plain",
      });
      const twitterAuthorizeUrl =
        "https://x.com/i/oauth2/authorize?" + twitterSearchParams.toString();
      callback(twitterAuthorizeUrl);
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
