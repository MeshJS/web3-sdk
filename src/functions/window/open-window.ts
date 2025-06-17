import { Web3AuthProvider } from "../../types";

export type OpenWindowParams = {
  method: "enable"
  projectId: string;
  directTo?: Web3AuthProvider
} | {
  method: "sign-tx"
  projectId: string;
  directTo?: Web3AuthProvider
  unsignedTx: string;
  partialSign: "true" | "false";
} | {
  method: "sign-data"
  projectId: string
  directTo?: Web3AuthProvider
  payload: string;
  address?: string;
}

export async function openWindow(
  params: OpenWindowParams,
  appUrl: string = "https://web3.meshjs.dev/"
): Promise<any> {
  const p = new URLSearchParams(params)
  const _url = `${appUrl}/client/wallet?${p.toString()}`;

  return new Promise((resolve, reject) => {
    const windowFeatures =
      "left=200,top=100,width=400,height=550,toolbar=no,menubar=no,scrollbars=no,resizable=no,location=no,status=no";
    const newWindow = window.open(_url, "mesh", windowFeatures);

    if (!newWindow) {
      return reject(new Error("Failed to open window"));
    }

    newWindow.document.title = "Mesh Web3 Services";

    const interval = setInterval(() => {
      if (newWindow.closed) {
        clearInterval(interval);
        resolve({ success: false, message: "Window was closed by the user" });
      }
    }, 500);

    window.addEventListener("message", (event) => {
      if (event.data.target === "mesh") {
        clearInterval(interval);
        newWindow.close();
        resolve(event.data);
      }
    });
  });
}
