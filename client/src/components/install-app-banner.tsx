import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type DeviceType = "ios" | "android" | "mac-chrome" | "desktop" | "unknown";

function detectDevice(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();

  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const isAndroid = /android/.test(ua);
  const isMac = /macintosh|mac os x/.test(ua);
  const isChrome = /chrome|chromium|crios/.test(ua);

  if (isIOS) return "ios";
  if (isAndroid) return "android";
  if (isMac && isChrome) return "mac-chrome";
  if (isChrome) return "desktop";

  return "unknown";
}

function getInstructions(device: DeviceType) {
  switch (device) {
    case "ios":
      return {
        title: "📱 iPhone / iPad Instructions:",
        steps: [
          "Open FlexList in Safari.",
          "Tap the Share button at the bottom of the screen.",
          'Scroll down and tap "Add to Home Screen."',
          'Tap "Add" in the top-right corner.',
        ],
      };

    case "android":
      return {
        title: "🤖 Android Instructions:",
        steps: [
          "Open FlexList in Chrome.",
          "Tap the three-dot menu in the top-right corner.",
          'Tap "Add to Home screen" or "Install app."',
          'Tap "Install" or "Add."',
        ],
      };

    case "mac-chrome":
      return {
        title: "💻 Chrome (macOS) Instructions:",
        steps: [
          "Look for the install icon in your address bar.",
          'Click the install icon or use the "Install Now" button above.',
          'Click "Install" in the popup that appears.',
        ],
      };

    default:
      return {
        title: "💻 Desktop Instructions:",
        steps: [
          "Open FlexList in Chrome or Edge.",
          "Look for the install icon in the address bar.",
          'Click "Install" in the popup that appears.',
        ],
      };
  }
}

export default function InstallAppBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [device, setDevice] = useState<DeviceType>("unknown");

  useEffect(() => {
    const detectedDevice = detectDevice();
    setDevice(detectedDevice);

    const dismissed = localStorage.getItem("flexlist-install-banner-dismissed");
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (!dismissed && !isStandalone) {
      setShowBanner(true);
    }
  }, []);

  const instructions = getInstructions(device);

  if (!showBanner) return null;

  return (
    <>
      <div className="w-full bg-blue-600 text-white shadow-md z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Download className="w-7 h-7 flex-shrink-0" />
            <div>
              <p className="text-lg font-medium">Install FlexList App</p>
              <p className="text-sm text-blue-100">
                Click the install button in your browser&apos;s address bar, or use this button
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowModal(true)}
              className="bg-white text-blue-600 px-5 py-2 rounded-md font-medium hover:bg-blue-50"
            >
              Show Steps
            </button>

            <button
              onClick={() => {
                localStorage.setItem("flexlist-install-banner-dismissed", "true");
                setShowBanner(false);
              }}
              className="text-white hover:text-blue-100"
              aria-label="Close install banner"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center px-4">
          <div className="bg-white text-gray-900 rounded-xl shadow-xl max-w-xl w-full p-8 relative border border-blue-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 border-4 border-blue-300 rounded-xl p-1 text-gray-700 hover:bg-gray-100"
              aria-label="Close install instructions"
            >
              <X className="w-7 h-7" />
            </button>

            <div className="flex items-center gap-4 mb-4">
              <Download className="w-9 h-9" />
              <h2 className="text-3xl font-bold">How to Install FlexList</h2>
            </div>

            <p className="text-xl mb-8">
              Follow these steps to install FlexList as an app on your device
            </p>

            <h3 className="text-xl font-bold mb-6">{instructions.title}</h3>

            <ol className="space-y-5">
              {instructions.steps.map((step, index) => (
                <li key={step} className="flex gap-5 text-xl">
                  <span className="text-blue-600 font-medium">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
