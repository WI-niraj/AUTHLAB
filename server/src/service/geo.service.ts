
import { isIP } from 'node:net';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

export type LoginMetadata = {
  ipAddress: string | null;
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
  city: string | null;
  browserName: string | null;
  osName: string | null;
  deviceType: string;
  userAgent: string | null;
};

export function getLoginMetadata(
  ipAddress: string,
  userAgent?: string
): LoginMetadata {
  const validIp = isIP(ipAddress) !== 0;

  const normalizedIp = validIp
    ? ipAddress.replace(/^::ffff:/, '')
    : null;

  const isPrivateOrLocal =
    !normalizedIp ||
    normalizedIp === '::1' ||
    normalizedIp === '127.0.0.1' ||
    normalizedIp.startsWith('127.') ||
    normalizedIp.startsWith('10.') ||
    normalizedIp.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(normalizedIp) ||
    normalizedIp.startsWith('169.254.') ||
    normalizedIp.startsWith('fc') ||
    normalizedIp.startsWith('fd') ||
    normalizedIp.startsWith('fe80:');

  const geo =
    normalizedIp && !isPrivateOrLocal
      ? geoip.lookup(normalizedIp)
      : null;

  const parsed = new UAParser(userAgent || '').getResult();

  const countryCode = geo?.country || null;

  const countryName = countryCode
    ? new Intl.DisplayNames(['en'], {
        type: 'region',
      }).of(countryCode) ?? null
    : null;

  return {
    ipAddress: normalizedIp,
    countryCode,
    countryName,
    region: geo?.region || null,
    city: geo?.city || null,
    browserName: parsed.browser.name || null,
    osName: parsed.os.name || null,
    deviceType: parsed.device.type || 'desktop',
    userAgent: userAgent || null,
  };
}
