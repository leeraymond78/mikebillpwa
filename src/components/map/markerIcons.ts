import type { OccupancyRecord, ParkingMeterFeature } from '../../models';
import {
  OccupancyStatus,
  ParkingMeterStatus,
  occupancyChangedAt,
} from '../../models';

type MaxTimeType = 'max120' | 'max60' | 'max30';

const meterIconCache = new Map<string, string>();
const carparkIconCache = new Map<string, string>();

function maxTimeType(feature: ParkingMeterFeature): MaxTimeType {
  switch (feature.properties.lpp) {
    case 120:
      return 'max120';
    case 60:
      return 'max60';
    default:
      return 'max30';
  }
}

function markerCacheKey(feature: ParkingMeterFeature, record?: OccupancyRecord): string {
  return [
    maxTimeType(feature),
    feature.properties.lpp ?? 0,
    record?.status ?? 'unknown',
    record?.parkingMeterStatus ?? 'unknown',
    record?.dateChangedRaw ?? 'nil',
  ].join('|');
}

function polygonPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sides: number,
): void {
  const angle = (2 * Math.PI) / sides;
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const x = cx + radius * Math.cos(angle * i - Math.PI / 2);
    const y = cy + radius * Math.sin(angle * i - Math.PI / 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function generateMeterIcon(
  color: string,
  text: string | null,
  scale: number,
  type: MaxTimeType,
): string {
  const baseSize = 22;
  const size = baseSize * scale;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(size);
  canvas.height = Math.ceil(size);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const alpha = Math.min(1, 0.55 + 0.08 * scale);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2;

  if (type === 'max120') {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'max60') {
    polygonPath(ctx, cx, cy, radius, 8);
    ctx.fill();
  } else {
    polygonPath(ctx, cx, cy, radius, 6);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  if (text) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(9, (size / 2) * 0.95)}px -apple-system, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy + 0.5);
  }

  return canvas.toDataURL('image/png');
}

function meterStyle(
  record?: OccupancyRecord,
): { color: string; label: string | null; scale: number } {
  const occupancy = record?.status ?? OccupancyStatus.unknown;
  const meterStatus = record?.parkingMeterStatus ?? ParkingMeterStatus.unknown;
  const changedAt = record ? occupancyChangedAt(record) : null;
  const minutes = changedAt
    ? Math.max(0, Math.floor((Date.now() - changedAt.getTime()) / 60_000))
    : Number.POSITIVE_INFINITY;

  if (occupancy === OccupancyStatus.vacant) {
    if (minutes < 1) return { color: '#34c759', label: '10', scale: 1.35 };
    if (minutes < 2) return { color: '#34c759', label: '9', scale: 1.3 };
    if (minutes < 3) return { color: '#34c759', label: '8', scale: 1.25 };
    if (minutes < 4) return { color: '#34c759', label: '7', scale: 1.2 };
    if (minutes < 5) return { color: '#34c759', label: '6', scale: 1.15 };
    if (minutes < 6) return { color: '#34c759', label: '5', scale: 1.1 };
    if (minutes < 7) return { color: '#34c759', label: '4', scale: 1.05 };
    if (minutes < 8) return { color: '#34c759', label: '3', scale: 1.0 };
    if (minutes < 9) return { color: '#34c759', label: '2', scale: 0.95 };
    if (minutes >= 241) return { color: '#34c759', label: '0', scale: 0.82 };
    return { color: '#34c759', label: '1', scale: 0.88 };
  }

  if (meterStatus !== ParkingMeterStatus.normal) {
    return { color: '#8e8e93', label: null, scale: 0.78 };
  }

  if (occupancy === OccupancyStatus.occupied) {
    if (minutes < 10) return { color: '#ff3b30', label: '0', scale: 0.82 };
    if (minutes < 25) return { color: '#ff3b30', label: '1', scale: 0.88 };
    if (minutes < 50) return { color: '#ff3b30', label: '2', scale: 1.04 };
    if (minutes < 80) return { color: '#ff3b30', label: '3', scale: 1.1 };
    if (minutes < 110) return { color: '#ff3b30', label: '4', scale: 1.16 };
    if (minutes < 140) return { color: '#ff3b30', label: '5', scale: 1.22 };
    if (minutes < 170) return { color: '#ff3b30', label: '6', scale: 1.28 };
    if (minutes < 200) return { color: '#ff3b30', label: '7', scale: 1.34 };
    if (minutes < 230) return { color: '#ff3b30', label: '8', scale: 1.4 };
    if (minutes < 260) return { color: '#ff3b30', label: '9', scale: 1.45 };
    return { color: '#ff9500', label: null, scale: 0.74 };
  }

  return { color: '#000000', label: null, scale: 0.78 };
}

export function getMeterMarkerIconURL(
  feature: ParkingMeterFeature,
  record?: OccupancyRecord,
): string {
  const key = markerCacheKey(feature, record);
  const cached = meterIconCache.get(key);
  if (cached) return cached;

  const style = meterStyle(record);
  const url = generateMeterIcon(
    style.color,
    style.label,
    style.scale,
    maxTimeType(feature),
  );
  meterIconCache.set(key, url);
  return url;
}

export function getMeterMarkerZIndex(
  _feature: ParkingMeterFeature,
  record?: OccupancyRecord,
): number {
  const occupancy = record?.status ?? OccupancyStatus.unknown;
  const meterStatus = record?.parkingMeterStatus ?? ParkingMeterStatus.unknown;
  const changedAt = record ? occupancyChangedAt(record) : null;
  const minutes = changedAt
    ? Math.max(0, Math.floor((Date.now() - changedAt.getTime()) / 60_000))
    : Number.POSITIVE_INFINITY;

  if (occupancy === OccupancyStatus.vacant) {
    let labelValue = 1;
    if (minutes < 1) labelValue = 10;
    else if (minutes < 2) labelValue = 9;
    else if (minutes < 3) labelValue = 8;
    else if (minutes < 4) labelValue = 7;
    else if (minutes < 5) labelValue = 6;
    else if (minutes < 6) labelValue = 5;
    else if (minutes < 7) labelValue = 4;
    else if (minutes < 8) labelValue = 3;
    else if (minutes < 9) labelValue = 2;
    else if (minutes >= 241) labelValue = 0;
    return 4000 + labelValue;
  }

  if (meterStatus !== ParkingMeterStatus.normal) return 1000;

  if (occupancy === OccupancyStatus.occupied) {
    let labelValue: number | null = null;
    if (minutes < 10) labelValue = 0;
    else if (minutes < 25) labelValue = 1;
    else if (minutes < 50) labelValue = 2;
    else if (minutes < 80) labelValue = 3;
    else if (minutes < 110) labelValue = 4;
    else if (minutes < 140) labelValue = 5;
    else if (minutes < 170) labelValue = 6;
    else if (minutes < 200) labelValue = 7;
    else if (minutes < 230) labelValue = 8;
    else if (minutes < 260) labelValue = 9;
    if (labelValue != null) return 2000 + labelValue;
    return 1500;
  }

  return 1000;
}

export function getCarparkMarkerIconURL(
  amount: string,
  vacancy: string | undefined,
  darkMode: boolean,
): string {
  const normalizedVacancy = vacancy?.trim();
  const hasVacancy = Boolean(normalizedVacancy && normalizedVacancy !== '0');
  const cacheKey = `${amount}|${normalizedVacancy ?? 'nil'}|${darkMode ? 'dark' : 'light'}`;
  const cached = carparkIconCache.get(cacheKey);
  if (cached) return cached;

  const priceText = `$${amount}`;
  const vacancyText = hasVacancy ? normalizedVacancy! : null;

  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d');
  if (!measure) return '';

  measure.font = '600 16px -apple-system, system-ui, sans-serif';
  const priceWidth = Math.max(46, measure.measureText(priceText).width + 24);
  measure.font = '600 14px -apple-system, system-ui, sans-serif';
  const vacancyWidth = vacancyText
    ? Math.max(34, measure.measureText(vacancyText).width + 20)
    : 0;

  const bubbleHeight = 36;
  const bubbleWidth = priceWidth + (hasVacancy ? vacancyWidth + 8 : 0);
  const width = bubbleWidth + 12;
  const height = 52;
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const baseBlue = darkMode ? 'rgb(41,112,245)' : 'rgb(13,122,250)';
  const secondaryBlue = darkMode ? 'rgb(59,138,255)' : 'rgb(48,148,255)';
  const vacancyValue = vacancyText ? Number.parseInt(vacancyText, 10) : NaN;
  let vacancyBackground = secondaryBlue;
  if (!Number.isNaN(vacancyValue)) {
    if (vacancyValue < 10) {
      vacancyBackground = darkMode ? 'rgb(219,71,61)' : 'rgb(232,79,69)';
    } else if (vacancyValue < 30) {
      vacancyBackground = darkMode ? 'rgb(237,143,41)' : 'rgb(250,158,46)';
    }
  }

  const bubbleX = 6;
  const bubbleY = 6;

  ctx.save();
  ctx.shadowColor = darkMode ? 'rgba(0,0,0,0.28)' : 'rgba(0,0,0,0.16)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  roundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 18);
  ctx.fillStyle = baseBlue;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 18);
  ctx.fillStyle = baseBlue;
  ctx.fill();
  ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  if (hasVacancy && vacancyText) {
    roundRect(
      ctx,
      bubbleX + bubbleWidth - vacancyWidth + 2,
      bubbleY + 2,
      vacancyWidth - 4,
      bubbleHeight - 4,
      14,
    );
    ctx.fillStyle = vacancyBackground;
    ctx.fill();
  }

  // pin pointer
  const pinCenterX = bubbleX + bubbleWidth / 2;
  ctx.beginPath();
  ctx.moveTo(pinCenterX - 6, bubbleY + bubbleHeight - 1);
  ctx.quadraticCurveTo(pinCenterX - 4, height - 2, pinCenterX, height - 6);
  ctx.quadraticCurveTo(pinCenterX + 4, height - 2, pinCenterX + 6, bubbleY + bubbleHeight - 1);
  ctx.closePath();
  ctx.fillStyle = baseBlue;
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 16px -apple-system, system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(priceText, bubbleX + 14, bubbleY + bubbleHeight / 2);

  if (vacancyText) {
    const dividerX = bubbleX + bubbleWidth - vacancyWidth - 4;
    ctx.fillStyle = darkMode ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.22)';
    ctx.fillRect(dividerX, bubbleY + 9, 1, bubbleHeight - 18);

    ctx.font = '600 14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      vacancyText,
      dividerX + 8 + (vacancyWidth - 8) / 2,
      bubbleY + bubbleHeight / 2,
    );
    ctx.textAlign = 'start';
  }

  const url = canvas.toDataURL('image/png');
  carparkIconCache.set(cacheKey, url);
  return url;
}

const clusterIconCache = new Map<string, string>();

/** Cluster chip like `5/15` (vacant / total meters in the group). */
export function getMeterClusterIconURL(
  vacant: number,
  total: number,
  darkMode: boolean,
): string {
  const safeVacant = Math.max(0, vacant);
  const safeTotal = Math.max(0, total);
  const cacheKey = `${safeVacant}/${safeTotal}|${darkMode ? 'dark' : 'light'}`;
  const cached = clusterIconCache.get(cacheKey);
  if (cached) return cached;

  const label = `${safeVacant}/${safeTotal}`;
  const canvas = document.createElement('canvas');
  const measure = canvas.getContext('2d');
  if (!measure) return '';

  measure.font = '700 15px -apple-system, system-ui, sans-serif';
  const textWidth = measure.measureText(label).width;
  const paddingX = 14;
  const bubbleHeight = 34;
  const bubbleWidth = Math.max(52, textWidth + paddingX * 2);
  const width = bubbleWidth + 8;
  const height = bubbleHeight + 8;
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const ratio = safeTotal > 0 ? safeVacant / safeTotal : 0;
  let fill: string;
  if (safeVacant <= 0) {
    fill = darkMode ? 'rgb(88,88,92)' : 'rgb(142,142,147)';
  } else if (ratio >= 0.4) {
    fill = darkMode ? 'rgb(48,180,90)' : 'rgb(52,199,89)';
  } else if (ratio >= 0.15) {
    fill = darkMode ? 'rgb(237,143,41)' : 'rgb(255,149,0)';
  } else {
    fill = darkMode ? 'rgb(219,71,61)' : 'rgb(255,59,48)';
  }

  const x = 4;
  const y = 4;

  ctx.save();
  ctx.shadowColor = darkMode ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  roundRect(ctx, x, y, bubbleWidth, bubbleHeight, bubbleHeight / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, x, y, bubbleWidth, bubbleHeight, bubbleHeight / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 15px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + bubbleWidth / 2, y + bubbleHeight / 2 + 0.5);

  const url = canvas.toDataURL('image/png');
  clusterIconCache.set(cacheKey, url);
  return url;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
