import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arrayBufferToBase64,
  base64ToUint8Array,
  normalizeAudioFormat,
  uint8ArrayToBase64,
} from '../src/shared/audioTransport.js';

test('normalizeAudioFormat maps common mime types', () => {
  assert.deepEqual(normalizeAudioFormat('audio/webm;codecs=opus'), {
    mimeType: 'audio/webm',
    extension: 'webm',
  });
  assert.deepEqual(normalizeAudioFormat('audio/mp4'), {
    mimeType: 'audio/mp4',
    extension: 'm4a',
  });
  assert.deepEqual(normalizeAudioFormat('audio/ogg'), {
    mimeType: 'audio/ogg',
    extension: 'ogg',
  });
  assert.deepEqual(normalizeAudioFormat('audio/mpeg'), {
    mimeType: 'audio/mpeg',
    extension: 'mp3',
  });
});

test('normalizeAudioFormat falls back to webm', () => {
  assert.deepEqual(normalizeAudioFormat('application/octet-stream'), {
    mimeType: 'audio/webm',
    extension: 'webm',
  });
});

test('base64 <-> bytes roundtrip preserves audio payload bytes', () => {
  const bytes = new Uint8Array([26, 255, 0, 13, 10, 97, 98, 99, 128, 64, 1, 2]);
  const base64 = uint8ArrayToBase64(bytes);
  const decoded = base64ToUint8Array(base64);
  assert.deepEqual(Array.from(decoded), Array.from(bytes));
});

test('arrayBufferToBase64 interoperates with decoder', () => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 250, 251, 252]);
  const encoded = arrayBufferToBase64(bytes.buffer);
  const decoded = base64ToUint8Array(encoded);
  assert.deepEqual(Array.from(decoded), Array.from(bytes));
});

test('decoder handles empty input', () => {
  const decoded = base64ToUint8Array('');
  assert.equal(decoded.byteLength, 0);
});
