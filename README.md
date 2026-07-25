# MikeBill PWA

Hong Kong parking meters & carparks map — Progressive Web App.

## Live URL

After enabling Pages (Settings → Pages → Source: GitHub Actions):

https://leeraymond78.github.io/mikebillpwa/

Deep link:

https://leeraymond78.github.io/mikebillpwa/#/locate?lat=22.2855&lng=114.1573

## Local preview (debug before GitHub Pages)

```bash
npm install
npm run preview:pages   # builds with /mikebillpwa/ base and serves on :4173
```

Open: http://127.0.0.1:4173/mikebillpwa/

For HMR while coding:

```bash
npm run dev             # http://127.0.0.1:5173/
```

### Google Maps key (required for map tiles)

In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), add these **HTTP referrers** to the Maps JavaScript API key:

- `http://127.0.0.1:4173/*`
- `http://localhost:4173/*`
- `http://127.0.0.1:5173/*`
- `http://localhost:5173/*`
- `https://leeraymond78.github.io/mikebillpwa/*`

Without these you will see `RefererNotAllowedMapError` (UI shell still loads).

Custom domain / root deploy: set `VITE_BASE=/` in the environment.

## Required GitHub secrets

- `VITE_GOOGLE_MAPS_API_KEY` — Maps JavaScript API (HTTP referrer restricted)
- `VITE_GOOGLE_MAPS_STATIC_KEY` — optional Static Maps key for favorites thumbnails

## PWA

- Manifest + service worker via `vite-plugin-pwa`
- Offline: app shell precache; CSV StaleWhileRevalidate; API NetworkFirst
- Installable on iOS Safari (Share → Add to Home Screen) and Android Chrome
