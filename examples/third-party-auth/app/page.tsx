"use client";
import { useSearchParams } from "next/navigation";
import { Web3Wallet } from "@meshsdk/web3-sdk";

export default function Home() {
  const searchParams = useSearchParams();

  const token = searchParams?.get("refreshToken");
  console.log("Logging token!", token);

  const googleSearchParams = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT!,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    redirect_uri: "http://localhost:3006" + "/api/auth",
    scope:
      "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
  });
  const googleAuthorizeUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    googleSearchParams.toString();

  const discordSearchParams = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT!,
    response_type: "code",
    redirect_uri: "http://localhost:3006" + "/api/auth",
    scope: "identify email",
  });
  const discordAuthorizeUrl =
    "https://discord.com/oauth2/authorize?" + discordSearchParams.toString();

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <button onClick={() => (window.location.href = googleAuthorizeUrl)}>
          Login with Google!
        </button>
        <button onClick={() => (window.location.href = discordAuthorizeUrl)}>
          Login with Discord!
        </button>

        <button
          onClick={async () => {
            const wallet = await Web3Wallet.enable({
              projectId: "c92cc4c3-1700-4f40-8545-90c47eef3862",
              networkId: 0,
              appUrl: "https://staging.utxos.dev",
              directTo: "discord",
              refreshToken: token as string,
            });

            console.log(await wallet.getChangeAddress());
          }}
        >
          Auto Sign In With Token{" "}
        </button>
      </main>
    </div>
  );
}
