import { describe, it, expect } from 'vitest';
import { buildJoinUrl } from '../server/join-url-builder.js';

describe('Join URL Builder Tests', () => {
  it('1. builds a standard join URL with mode and roomId parameters', () => {
    const url = buildJoinUrl('192.168.1.100', 5173, '482910');
    expect(url).toBe('http://192.168.1.100:5173/?mode=online&roomId=482910');
  });

  it('2. URL encodes the roomId parameter correctly to prevent injection or corruption', () => {
    const url = buildJoinUrl('192.168.1.100', 5173, 'abc 123?');
    expect(url).toBe('http://192.168.1.100:5173/?mode=online&roomId=abc%20123%3F');
  });

  it('3. does not append any session token parameter in the built URL', () => {
    const url = buildJoinUrl('192.168.1.100', 5173, '482910');
    expect(url).not.toContain('token');
    expect(url).not.toContain('session');
  });

  it('4. trims whitespace from the input IP address correctly', () => {
    const url = buildJoinUrl('  192.168.1.120  ', 5173, '482910');
    expect(url).toBe('http://192.168.1.120:5173/?mode=online&roomId=482910');
  });

  it('5. works correctly with non-standard ports like 80 or 8080', () => {
    const url = buildJoinUrl('myhost', 8080, '123456');
    expect(url).toBe('http://myhost:8080/?mode=online&roomId=123456');
  });
});
