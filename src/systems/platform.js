// Platform detection for the "Add to Home Screen" hint. No side effects.
const ua = navigator.userAgent;

// iPhone/iPod/iPad; iPadOS 13+ reports a Mac UA, so also accept "Mac + multi-touch".
export const isIOS = /iP(hone|od|ad)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 0);

// Launched from the Home Screen: navigator.standalone is WebKit-only; display-mode covers Android/desktop installs.
export const isStandalone =
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;

// In-app browsers (Instagram, Discord, ...) are bare WKWebViews without the "Safari/" token and have no
// Add to Home Screen. Safari, Chrome (CriOS), Edge and Firefox on iOS 16.4+ all carry it and can add.
const hasShareSheetA2HS = /Safari\//.test(ua);

// Embedded (e.g. itch.io iframe): Add to Home Screen would install the host page, not the game.
const isEmbedded = (() => { try { return window.self !== window.top; } catch { return true; } })();

export const showInstallHint = isIOS && hasShareSheetA2HS && !isStandalone && !isEmbedded;
