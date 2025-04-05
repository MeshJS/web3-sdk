import { InitWeb3WalletOptions, Web3Wallet } from "@meshsdk/web3-sdk";
import { BlockfrostProvider } from "@meshsdk/provider";
import { useState } from "react";

export default function Home() {
  const [wallet, setWallet] = useState<Web3Wallet | null>(null);

  async function connectWallet() {
    const provider = new BlockfrostProvider("API-KEY");

    const _options: InitWeb3WalletOptions = {
      networkId: 0, // 0: preprod, 1: mainnet
      fetcher: provider,
      submitter: provider,
      // projectId: "11111111-2222-3333-YOUR-PROJECTID",
    };

    const wallet = await Web3Wallet.enable(_options);
    setWallet(wallet);
  }

  return (
    <div className="bg-white">
      <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            Developer Controlled Wallet
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg/8 text-gray-600">
            Enables developers to create and manage wallets programmatically,
            offering a streamlined Web3 experience for end users or offering
            services that interact with blockchain applications.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <button
              onClick={connectWallet}
              className={`rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`}
              style={{
                backgroundColor: wallet ? "#4caf50" : "#3b82f6",
                cursor: wallet ? "not-allowed" : "pointer",
              }}
              disabled={wallet !== null}
            >
              {wallet ? "Wallet Connected" : "Connect Wallet"}
            </button>
            <a
              href="https://web3docs.meshjs.dev/wallet/developer-controlled"
              className="text-sm/6 font-semibold text-gray-900"
            >
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
          {wallet !== null && (
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                className="rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-indigo-600 hover:bg-indigo-700"
                onClick={async () => {
                  const address = await wallet.getChangeAddress();
                  alert(address);
                }}
              >
                Get Address
              </button>
              <button
                className="rounded-md px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-indigo-600 hover:bg-indigo-700"
                onClick={async () => {
                  const signature = await wallet.signData("mesh");
                  alert(JSON.stringify(signature));
                }}
              >
                Sign Data
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
