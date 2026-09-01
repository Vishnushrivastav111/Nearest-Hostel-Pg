import { validateMediaFile } from './media.util';

describe('validateMediaFile', () => {
  it('rejects an oversized image', () => {
    const file = new File([new Uint8Array(6 * 1024 * 1024)], 'photo.jpg', { type: 'image/jpeg' });
    expect(validateMediaFile(file, 'image').valid).toBeFalse();
  });

  it('accepts a small jpeg', () => {
    const file = new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' });
    expect(validateMediaFile(file, 'image').valid).toBeTrue();
  });

  it('rejects an unsupported video type', () => {
    const file = new File([new Uint8Array(10)], 'clip.avi', { type: 'video/x-msvideo' });
    expect(validateMediaFile(file, 'video').valid).toBeFalse();
  });
});
