import { useEffect, useRef } from "react";

const ACTIVITY_KEY = "magnate-panel-last-activity";
const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

const readLastActivity = () => {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
};

/** Marca actividad ahora (al iniciar sesión, para no heredar la inactividad de la sesión anterior) */
export const markPanelActivity = () => writeLastActivity(Date.now());

const writeLastActivity = (value: number) => {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(value));
  } catch {
    // sin storage: el control queda solo en memoria
  }
};

/**
 * Cierra la sesión del panel tras `timeoutMs` sin actividad. La última actividad se
 * comparte entre pestañas (localStorage) y se revisa también al volver a la pestaña.
 */
export function useIdleLogout(onIdle: () => void, timeoutMs: number, enabled = true) {
  const lastActivity = useRef(Date.now());
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;

    // Una pestaña reabierta después del límite no reutiliza la sesión
    const stored = readLastActivity();
    if (stored && Date.now() - stored > timeoutMs) {
      onIdleRef.current();
      return;
    }

    let lastWrite = 0;
    const markActivity = () => {
      const now = Date.now();
      lastActivity.current = now;
      if (now - lastWrite > 5000) {
        lastWrite = now;
        writeLastActivity(now);
      }
    };
    markActivity();

    const check = () => {
      const last = Math.max(lastActivity.current, readLastActivity());
      if (Date.now() - last > timeoutMs) onIdleRef.current();
    };

    EVENTS.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 30_000);

    return () => {
      EVENTS.forEach((event) => window.removeEventListener(event, markActivity));
      document.removeEventListener("visibilitychange", check);
      window.clearInterval(timer);
    };
  }, [enabled, timeoutMs]);
}
