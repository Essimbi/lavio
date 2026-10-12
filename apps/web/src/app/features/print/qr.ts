import { toDataURL } from 'qrcode';

/** QR code en image PNG (data URL) : affiché via <img>, sans contourner la protection XSS d'Angular. */
export function qrDataUrl(payload: string, widthPx = 240): Promise<string> {
  return toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: widthPx,
    color: { dark: '#000000', light: '#ffffff' },
  });
}
