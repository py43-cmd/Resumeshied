/**
 * Masks never contain enough characters to reconstruct the original value.
 * A reviewer gets just enough shape to recognise a false positive.
 */

function bullets(length, max = 8) {
  return '•'.repeat(Math.min(Math.max(length, 3), max));
}

export function maskValue(value, type) {
  const raw = String(value ?? '').trim();
  if (!raw) return '••••';

  switch (type) {
    case 'EMAIL': {
      const [local = '', domain = ''] = raw.split('@');
      const dot = domain.lastIndexOf('.');
      const tld = dot === -1 ? '' : domain.slice(dot);
      return `${local[0] ?? ''}${bullets(local.length)}@${domain[0] ?? ''}${bullets(
        Math.max(domain.length - 1, 3),
      )}${tld}`;
    }

    case 'PHONE': {
      const digits = raw.replace(/\D/g, '');
      const prefix = raw.startsWith('+') ? '+' : '';
      return `${prefix}${bullets(Math.max(digits.length - 2, 4), 10)}${digits.slice(-2)}`;
    }

    case 'LINKEDIN':
      return `linkedin.com/in/${bullets(6)}`;

    case 'GITHUB':
      return `github.com/${bullets(6)}`;

    case 'URL': {
      try {
        const host = new URL(raw).hostname.replace(/^www\./, '');
        const dot = host.lastIndexOf('.');
        const suffix = dot === -1 ? '' : host.slice(dot);
        return `••••${suffix}`;
      } catch {
        return bullets(8);
      }
    }

    case 'IMAGE':
      return '[image]';

    case 'DOB':
      return '••/••/••••';

    case 'NAME':
      return raw
        .split(/\s+/)
        .map((token) => `${token[0]?.toUpperCase() ?? ''}.`)
        .join(' ');

    default:
      return `${raw[0] ?? ''}${bullets(raw.length)}`;
  }
}
