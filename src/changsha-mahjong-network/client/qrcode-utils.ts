import QRCode from 'qrcode';

export async function buildQRCodeDataUrl(text: string): Promise<string> {
  if (!text || text.trim() === '') {
    throw new Error('Link text cannot be empty');
  }
  return QRCode.toDataURL(text);
}
