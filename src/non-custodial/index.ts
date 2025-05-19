import { Web3JWTBody } from "../types";

const AUTH_KEY = "mesh-web3-services-auth";
type AuthJwtLocationObject = {
  jwt: string;
};

const LOCAL_SHARD_KEY = "mesh-web3-services-local-shard";

export type StorageLocation = "local_storage" | "chrome_local" | "chrome_sync";

export type Web3NonCustodialProviderParams = {
  projectId: string;
  appOrigin?: string;
  storageLocation?: StorageLocation;
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

  constructor(params: Web3NonCustodialProviderParams) {
    this.projectId = params.projectId;
    this.appOrigin = params.appOrigin
      ? params.appOrigin
      : "https://web3.meshjs.dev";
    this.storageLocation = params.storageLocation
      ? params.storageLocation
      : "local_storage";
  }

  async getWallet() {
    // get local shard.
    // get database shard from mesh server using deviceId + authentication.
    // return all these in a wallet object.
  }

  async getUser(): Promise<
    | { user: Web3NonCustodialProviderUser; error: null }
    | { user: null; error: NotAuthenticatedError | SessionExpiredError }
  > {
    const { data } = await this.getFromStorage<AuthJwtLocationObject>(AUTH_KEY);
    // get jwt from localStorage.
    if (data === null) {
      // error for no JWT
      return { user: null, error: new NotAuthenticatedError() };
    }
    const parts = data.jwt.split(".");
    const bodyUnparsed = parts[1];
    if (bodyUnparsed === undefined) {
      return { user: null, error: new NotAuthenticatedError() };
    }
    const body = JSON.parse(
      atob(bodyUnparsed.replace(/-/g, "+").replace(/_/g, "/")),
    ) as Web3JWTBody;

    if (body.exp < Date.now()) {
      return { user: null, error: new SessionExpiredError() };
    }

    return {
      user: {
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
    const authorizationUrl =
      provider + ".com?" + new URLSearchParams({ redirectUrl }).toString();
    callback(authorizationUrl);
  }

  /** Always place under /mesh/auth */
  handleAuthenticationRoute(): { error: AuthRouteError } | void {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const redirect = params.get("redirect");
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
