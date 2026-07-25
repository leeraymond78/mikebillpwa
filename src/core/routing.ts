/** Hash-route helpers for GitHub Pages–safe navigation. */

export function appHashPath(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `#${normalized}`;
}

export function locateHashURL(latitude: number, longitude: number): string {
  return `#/locate?lat=${latitude}&lng=${longitude}`;
}

export function absolutePagesURL(hashPath = '#/'): string {
  const base = import.meta.env.BASE_URL || '/';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${base}${hashPath.replace(/^\//, '')}`;
}
