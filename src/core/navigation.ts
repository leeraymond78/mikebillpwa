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
}): string {
  const params = new URLSearchParams({
    center: `${options.latitude},${options.longitude}`,
    zoom: String(Math.round(options.zoom)),
    size: '256x152',
    maptype: 'roadmap',
    key: options.apiKey,
  });

  if (options.dark) {
    for (const style of [
      'element:geometry|color:0x242f3e',
      'element:labels.text.stroke|color:0x242f3e',
      'element:labels.text.fill|color:0x746855',
      'feature:administrative.locality|element:labels.text.fill|color:0xd59563',
      'feature:poi|element:labels.text.fill|color:0xd59563',
      'feature:poi.park|element:geometry|color:0x263c3f',
      'feature:poi.park|element:labels.text.fill|color:0x6b9a76',
      'feature:road|element:geometry|color:0x38414e',
      'feature:road|element:geometry.stroke|color:0x212a37',
      'feature:road|element:labels.text.fill|color:0x9ca5b3',
      'feature:road.highway|element:geometry|color:0x746855',
      'feature:road.highway|element:geometry.stroke|color:0x1f2835',
      'feature:road.highway|element:labels.text.fill|color:0xf3d19c',
      'feature:transit|element:geometry|color:0x2f3948',
      'feature:transit.station|element:labels.text.fill|color:0xd59563',
      'feature:water|element:geometry|color:0x17263c',
      'feature:water|element:labels.text.fill|color:0x515c6d',
      'feature:water|element:labels.text.stroke|color:0x17263c',
    ]) {
      params.append('style', style);
    }
  }

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
