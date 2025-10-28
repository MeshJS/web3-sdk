import { OpenWindowParams } from "../../types/window";

const buildWindowFeatures = () => {
  const sizeDefault = {
    width: 512,
    height: 768,
  };
  const sizeTight = {
    width: 448,
    height: 668,
  };
  const sizeSmall = {
    width: 340,
    height: 546,
  };

  const size = sizeTight;

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

  const windowFeatures = `left=${(windowWidth - width) / 2},top=${(windowHeight - height) / 2},width=${width},height=${height},scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no`;
  return windowFeatures;
};

export async function openWindow(
  params: OpenWindowParams,
  appUrl: string = "https://utxos.dev/",
): Promise<any> {
  const p = new URLSearchParams(params);
  const _url = `${appUrl}/client/wallet?${p.toString()}`;

  return new Promise((resolve, reject) => {
    const newWindow = window.open(_url, "utxos", buildWindowFeatures());

    if (!newWindow) {
      return reject(new Error("Failed to open window"));
    }

    const interval = setInterval(() => {
      if (newWindow.closed) {
        clearInterval(interval);
        resolve({ success: false, message: "Window was closed by the user" });
      }
    }, 500);

    window.addEventListener("message", (event) => {
      if (event.data.target === "utxos") {
        clearInterval(interval);
        resolve(event.data);
      }
    });
  });
}
