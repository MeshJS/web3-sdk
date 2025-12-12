import { EnableWeb3WalletOptions, Web3Wallet } from "@utxos/sdk";
import { useState } from "react";

export default function Home() {
  const [wallet, setWallet] = useState<Web3Wallet | null>(null);

  async function connectWallet() {
    const _options: EnableWeb3WalletOptions = {
      projectId: "11111111-2222-3333-YOUR-PROJECTID",
      networkId: 0, // 0: preprod, 1: mainnet
    };

    const wallet = await Web3Wallet.enable(_options);
    setWallet(wallet);
  }

  return (
    <div className="bg-white">
      <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            User Controlled Wallet
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg/8 text-gray-600">
            Enable users to create self-custody wallets and access apps in
            seconds, with social login and customizable branding.
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
              href="https://web3docs.meshjs.dev/wallet"
              className="text-sm/6 font-semibold text-gray-900"
            >
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
          {wallet !== null && (
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={async () => {
                  const address = await wallet.spark.getAddress();
                  alert(address);
                }}
              >
                Get Address
              </button>
              <button
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                onClick={async () => {
                  const signature = await wallet.spark.signMessage({
                    message: "mesh",
                  });
                  alert(JSON.stringify(signature));
                }}
              >
                Sign Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
