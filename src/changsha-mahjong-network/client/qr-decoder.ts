import jsQR_Module from 'jsqr';

const jsQR = (jsQR_Module as any).default || jsQR_Module;

export function decodeQRCodeFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') {
        reject(new Error('无法读取文件数据'));
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('无法获取 Canvas 绘图上下文'));
            return;
          }
          canvas.width = img.width;
          canvas.height = img.height;
          context.drawImage(img, 0, 0, img.width, img.height);
          const imageData = context.getImageData(0, 0, img.width, img.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            resolve(code.data);
          } else {
            reject(new Error('未在图片中识别到清晰的二维码'));
          }
        } catch (err: any) {
          reject(new Error(`图像解析异常: ${err.message || err}`));
        }
      };
      img.onerror = () => {
        reject(new Error('图像加载失败，请确保文件是合法的图片格式'));
      };
      img.src = result;
    };
    reader.onerror = () => {
      reject(new Error('文件读取出错'));
    };
    reader.readAsDataURL(file);
  });
}

export function extractRoomIdFromScanResult(text: string): string | null {
  if (!text) return null;
  const clean = text.trim();
  
  // 1. Try URL parsing
  try {
    if (clean.includes('://')) {
      const url = new URL(clean);
      const roomId = url.searchParams.get('roomId');
      if (roomId) return roomId;
    }
  } catch (e) {
    // Fallback to regex
  }

  // 2. Query param regex match
  const regex = /[?&]roomId=([a-zA-Z0-9]+)/;
  const match = clean.match(regex);
  if (match) return match[1];

  // 3. Exact 6-character room code pattern
  if (/^[0-9a-zA-Z]{6}$/.test(clean)) {
    return clean;
  }

  return null;
}
