export function normalizeAudioFormat(type) {
  const normalized = (type || '').toLowerCase();
  if (normalized.includes('webm')) return { mimeType: 'audio/webm', extension: 'webm' };
  if (normalized.includes('ogg') || normalized.includes('oga'))
    return { mimeType: 'audio/ogg', extension: 'ogg' };
  if (normalized.includes('wav')) return { mimeType: 'audio/wav', extension: 'wav' };
  if (normalized.includes('flac')) return { mimeType: 'audio/flac', extension: 'flac' };
  if (normalized.includes('mpeg') || normalized.includes('mp3'))
    return { mimeType: 'audio/mpeg', extension: 'mp3' };
  if (normalized.includes('mp4') || normalized.includes('m4a'))
    return { mimeType: 'audio/mp4', extension: 'm4a' };
  return { mimeType: 'audio/webm', extension: 'webm' };
}

export function base64ToUint8Array(base64) {
  if (!base64) return new Uint8Array(0);

  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(base64, 'base64'));
  }

  throw new Error('No base64 decoder available');
}

export function uint8ArrayToBase64(bytes) {
  if (!bytes?.length) return '';

  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  throw new Error('No base64 encoder available');
}

export function arrayBufferToBase64(arrayBuffer) {
  return uint8ArrayToBase64(new Uint8Array(arrayBuffer));
}
