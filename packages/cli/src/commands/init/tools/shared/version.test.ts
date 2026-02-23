import { describe, expect, it } from 'vitest';
import { compareVersions, parseVersion } from './version';

describe('version utilities', () => {
  describe('parseVersion', () => {
    it('parses valid semver triplets', () => {
      expect(parseVersion('1.2.3')).toEqual([1, 2, 3]);
    });

    it('treats null and empty as 0.0.0', () => {
      expect(parseVersion(null)).toEqual([0, 0, 0]);
      expect(parseVersion('')).toEqual([0, 0, 0]);
    });

    it('treats malformed values as 0.0.0', () => {
      expect(parseVersion('foo')).toEqual([0, 0, 0]);
      expect(parseVersion('1.2')).toEqual([0, 0, 0]);
      expect(parseVersion('1.2.3.4')).toEqual([0, 0, 0]);
      expect(parseVersion('1.x.3')).toEqual([0, 0, 0]);
      expect(parseVersion('-1.2.3')).toEqual([0, 0, 0]);
    });
  });

  describe('compareVersions', () => {
    it('returns current for equal versions', () => {
      expect(compareVersions('1.2.3', '1.2.3')).toBe('current');
    });

    it('returns outdated when bundled is newer', () => {
      expect(compareVersions('1.2.3', '1.2.4')).toBe('outdated');
      expect(compareVersions('1.2.3', '1.3.0')).toBe('outdated');
      expect(compareVersions('1.2.3', '2.0.0')).toBe('outdated');
    });

    it('returns newer when installed is newer', () => {
      expect(compareVersions('1.2.4', '1.2.3')).toBe('newer');
      expect(compareVersions('1.3.0', '1.2.3')).toBe('newer');
      expect(compareVersions('2.0.0', '1.2.3')).toBe('newer');
    });

    it('treats malformed and missing versions as 0.0.0', () => {
      expect(compareVersions(null, '1.0.0')).toBe('outdated');
      expect(compareVersions('1.0.0', null)).toBe('newer');
      expect(compareVersions('bad', 'bad')).toBe('current');
    });
  });
});
