import { useCallback, useSyncExternalStore } from 'react';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  // Chromium fires this instead of showing its own bar; keeping it lets the app
  // offer installation at a moment that makes sense.
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    emit();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const isStandalone = (): boolean =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

/** iOS has no install event: Safari installs through the share sheet. */
export const isIos = (): boolean =>
  typeof navigator !== 'undefined' &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !/crios|fxios/i.test(navigator.userAgent);

export function useInstall() {
  const available = useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false,
  );
  const wasInstalled = useSyncExternalStore(
    subscribe,
    () => installed,
    () => false,
  );

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferred) return 'unavailable';
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      deferred = null;
      emit();
    }
    return outcome;
  }, []);

  return {
    /** The browser is ready to install and the app is not already running installed. */
    canInstall: available && !wasInstalled && !isStandalone(),
    installed: wasInstalled || isStandalone(),
    ios: isIos() && !isStandalone(),
    promptInstall,
  };
}
