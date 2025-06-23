import { OpenWindowParams } from "../../types/window";

const buildWindowFeatures = () => {
  const sizeDefault = {
    //  large
    width: 512,
    height: 768,
  };
  const sizeTight = {
    //  medium
    width: 448,
    height: 668,
  };
  const sizeSmall = {
    //  if jungles wants top use this
    width: 340,
    height: 546,
  };

  const size = sizeDefault;

  const windowWidth = window.innerWidth || 0;
  const windowHeight = window.innerHeight || 0;

  const isMobile = windowWidth < 640;
  const isFullScreen = !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );

  const shouldDisplayFullScreen = isMobile || isFullScreen;

  const width = shouldDisplayFullScreen ? windowWidth : size.width;
  const height = shouldDisplayFullScreen ? windowHeight : size.height;
  const name = "_blank";

  const windowFeatures = `width=${width},height=${height},scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no`;
  return windowFeatures;
};

export async function openWindow(
  params: OpenWindowParams,
  appUrl: string = "https://web3.meshjs.dev/"
): Promise<any> {
  const p = new URLSearchParams(params);
  const _url = `${appUrl}/client/wallet?${p.toString()}`;

  return new Promise((resolve, reject) => {
    const newWindow = window.open(_url, "mesh", buildWindowFeatures());

    if (!newWindow) {
      return reject(new Error("Failed to open window"));
    }

    // newWindow.document.title = "Mesh Web3 Services";

    const interval = setInterval(() => {
      if (newWindow.closed) {
        clearInterval(interval);
        resolve({ success: false, message: "Window was closed by the user" });
      }
    }, 500);

    window.addEventListener("message", (event) => {
      if (event.data.target === "mesh") {
        clearInterval(interval);
        // newWindow.close();
        resolve(event.data);
      }
    });
  });
}
