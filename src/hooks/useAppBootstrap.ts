import { useEffect } from 'react';
import { useAppStore } from '../store';

/**
 * Starts the AppModel-equivalent lifecycle once:
 * - 7s vacancy/occupancy refresh loop
 * - parking meters CSV bootstrap
 * - deep-link handling for hash locate routes
 */
export function useAppBootstrap(): void {
  const bootstrap = useAppStore((state) => state.bootstrap);
  const dispose = useAppStore((state) => state.dispose);
  const handleIncomingURL = useAppStore((state) => state.handleIncomingURL);

  useEffect(() => {
    bootstrap();

    const applyHash = () => {
      if (window.location.hash.includes('locate')) {
        handleIncomingURL(window.location.href);
      }
    };

    applyHash();
    window.addEventListener('hashchange', applyHash);

    return () => {
      window.removeEventListener('hashchange', applyHash);
      dispose();
    };
  }, [bootstrap, dispose, handleIncomingURL]);
}
