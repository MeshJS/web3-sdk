export type ConnectProvider = "discord" | "passkey";

/**
 * Connect to the authentication service.
 */
export function connect(provider: ConnectProvider) {
  // do oauth flow

  const res = {
    success: true,
    data: {
      userId: "user123",
      accessToken: "123",
    },
  };

  return res;
}
