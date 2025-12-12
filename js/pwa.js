function isStandaloneDisplay() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

function isAppInstalled() {
  return isStandaloneDisplay() || localStorage.getItem('app-installed') === 'true';
}

function markAppInstalled() {
  localStorage.setItem('app-installed', 'true');
}

export function showIOSTips({ iosTip }) {
  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const standalone = isStandaloneDisplay();
  if (isIOS && !standalone && iosTip) {
    iosTip.hidden = false;
  }
}

export async function registerServiceWorker({ offlineTip }) {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
    if (offlineTip) {
      offlineTip.hidden = false;
    }
  } catch (err) {
    console.warn('Service worker registration failed', err);
  }
}

export function setupInstallPrompt({ installButton, installHint }) {
  const installHintEl = installHint;
  if (!installButton) {
    return;
  }

  let pendingInstallEvent = null;

  const updateInstallUI = (installed) => {
    installButton.hidden = installed;
    if (installHintEl && installed) {
      installHintEl.textContent = 'Installed ✔';
    }
  };

  const promptInstall = async () => {
    if (!pendingInstallEvent) return;
    pendingInstallEvent.prompt();
    const result = await pendingInstallEvent.userChoice;
    if (result.outcome === 'accepted') {
      markAppInstalled();
      if (installHintEl) {
        installHintEl.textContent = 'Added! Launch me from your home screen.';
      }
      updateInstallUI(true);
    } else {
      if (installHintEl) {
        installHintEl.textContent = 'You can add this app from your browser menu anytime.';
      }
      installButton.hidden = true;
    }
    pendingInstallEvent = null;
  };

  if (isAppInstalled()) {
    if (isStandaloneDisplay()) {
      markAppInstalled();
    }
    updateInstallUI(true);
    return;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    if (isAppInstalled()) {
      updateInstallUI(true);
      return;
    }
    event.preventDefault();
    pendingInstallEvent = event;
    installButton.hidden = false;
    if (installHintEl) {
      installHintEl.textContent = 'Install for quick launch and offline use.';
    }
  });

  installButton.addEventListener('click', async () => {
    if (!pendingInstallEvent) return;
    promptInstall();
  });

  window.addEventListener('appinstalled', () => {
    markAppInstalled();
    updateInstallUI(true);
  });
}
