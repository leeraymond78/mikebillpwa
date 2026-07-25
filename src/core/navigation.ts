import { STATIC_MAP_DARK_STYLE_PARAMS } from './mapStyles';

export function openAppleMapsDirections(
  latitude: number,
  longitude: number,
  title: string,
): void {
  const url = new URL('https://maps.apple.com/');
  url.searchParams.set('daddr', `${latitude},${longitude}`);
  url.searchParams.set('dirflg', 'd');
  if (title) url.searchParams.set('q', title);
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
}

export function openGoogleMapsDirections(latitude: number, longitude: number): void {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function openAMapDirections(
  latitude: number,
  longitude: number,
  title: string,
): void {
  const encoded = encodeURIComponent(title || 'Destination');
  const url = `https://uri.amap.com/navigation?to=${longitude},${latitude},${encoded}&mode=car&coordinate=wgs84&callnative=1`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function openHKEMeter(): boolean {
  // Deep link into HK E-Meter; browsers typically ignore custom schemes if not installed.
  window.location.href = 'hkemeter://';
  return true;
}

export function buildStaticMapURL(options: {
  latitude: number;
  longitude: number;
  zoom: number;
  dark: boolean;
  apiKey: string;
  width?: number;
  height?: number;
  scale?: number;
}): string {
  const width = options.width ?? 200;
  const height = options.height ?? 152;
  const scale = options.scale ?? 2;
  const params = new URLSearchParams({
    center: `${options.latitude},${options.longitude}`,
    zoom: String(Math.max(1, Math.min(20, Math.round(options.zoom)))),
    size: `${width}x${height}`,
    scale: String(scale),
    maptype: 'roadmap',
    markers: `color:0x007AFF|${options.latitude},${options.longitude}`,
    key: options.apiKey,
  });

  if (options.dark) {
    for (const style of STATIC_MAP_DARK_STYLE_PARAMS) {
      params.append('style', style);
    }
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
