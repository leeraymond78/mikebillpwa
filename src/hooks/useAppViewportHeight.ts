import { useEffect } from 'react';

/**
 * Keep --app-height in sync with the real visible viewport on iOS A2HS,
 * where 100dvh / fixed inset-0 can stop short of the home-indicator strip.
 */
export function useAppViewportHeight(): void {
  useEffect(() => {
    const apply = () => {
      const visual = window.visualViewport;
      let height = Math.max(
        window.innerHeight,
        document.documentElement.clientHeight || 0,
        visual ? Math.round(visual.height + visual.offsetTop) : 0,
      );

      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        // iOS Safari Add to Home Screen
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

      if (standalone) {
        const raw = getComputedStyle(document.documentElement)
          .getPropertyValue('--safe-bottom')
          .trim();
        const safeBottom = Number.parseFloat(raw);
        // env() can be 0 on the first paint; use a typical home-indicator inset.
        const extendBy = Number.isFinite(safeBottom) && safeBottom > 0 ? safeBottom : 34;
        height = Math.max(height, window.innerHeight + extendBy);

        // Cover the letterboxed strip when the layout viewport is short.
        if (window.innerHeight >= window.innerWidth) {
          height = Math.max(height, window.screen.height || 0);
        }
      }

      document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
      window.dispatchEvent(new Event('mikebill:app-height'));
    };

    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    window.visualViewport?.addEventListener('resize', apply);
    window.visualViewport?.addEventListener('scroll', apply);

    // Layout can settle after first paint / SW activation.
    const timers = [50, 300, 1000].map((ms) => window.setTimeout(apply, ms));

    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      window.visualViewport?.removeEventListener('resize', apply);
      window.visualViewport?.removeEventListener('scroll', apply);
      for (const id of timers) window.clearTimeout(id);
    };
  }, []);
}
