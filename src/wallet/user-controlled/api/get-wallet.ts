import { openWindow } from "../../../common/window/open-window";
import { WindowWalletReq, WindowWalletRes } from "../../../types";

export async function getWallet({
  networkId,
  projectId,
  appUrl,
}: WindowWalletReq): Promise<
  | {
      success: false;
      error: {
        errorMessage?: string;
        errorCode?: number;
      };
    }
  | {
      success: true;
      data: { address: string };
    }
> {
  const payload: WindowWalletReq = { networkId: networkId, projectId };

  const walletRes: WindowWalletRes = await openWindow(
    "/client/wallet",
    payload,
    appUrl
  );

  if (walletRes.success) {
    return {
      success: true,
      data: { address: walletRes.wallet.baseAddressBech32 },
    };
  }

  return {
    success: false,
    error: {
      errorMessage: "No wallet",
    },
  };
}
