import { Web3JWTBody } from "../types";

const AUTH_KEY = "mesh-web3-services-auth";

export type Web3NonCustodialProviderParams = {
  projectId: string;
  appOrigin?: string;
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

export class UserNotAuthenticated extends Error {
  constructor(message = "User is not authenticated") {
    super(message);
    this.name = "UserNotAuthenticated";
  }
}

export class UserSessionExpired extends Error {
  constructor(message = "User session has expired") {
    super(message);
    this.name = "UserSessionExpired";
  }
}

export class Web3NonCustodialProvider {
  projectId: string;
  appOrigin: string;

  constructor(params: Web3NonCustodialProviderParams) {
    this.projectId = params.projectId;
    this.appOrigin = params.appOrigin
      ? params.appOrigin
      : "https://web3.meshjs.dev";
  }

  async getWallet() {
    // get local shard.
    // get database shard from mesh server using deviceId + authentication.
    // return all these in a wallet object.
  }

  getUser():
    | { user: Web3NonCustodialProviderUser; error: null }
    | { user: null; error: UserNotAuthenticated | UserSessionExpired } {
    // get jwt from localStorage.
    const jwt = localStorage.getItem(AUTH_KEY);
    if (jwt === null) {
      // error for no JWT
      return { user: null, error: new UserNotAuthenticated() };
    }
    const parts = jwt.split(".");
    const bodyUnparsed = parts[1];
    if (bodyUnparsed === undefined) {
      return { user: null, error: new UserNotAuthenticated() };
    }
    const body = JSON.parse(
      atob(bodyUnparsed.replace(/-/g, "+").replace(/_/g, "/"))
    ) as Web3JWTBody;

    if (body.exp > Date.now()) {
      return { user: null, error: new UserSessionExpired() };
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
    callback: (authorizationUrl: string) => void
  ) {
    const authorizationUrl =
      provider + ".com?" + new URLSearchParams({ redirectUrl }).toString();
    callback(authorizationUrl);
  }
}
