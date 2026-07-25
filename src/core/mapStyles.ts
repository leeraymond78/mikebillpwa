/** Dark Google Map style matching iOS `google_map_dark` / Favorites static map. */
export const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

export const STATIC_MAP_DARK_STYLE_PARAMS = [
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
];
