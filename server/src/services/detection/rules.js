/**
 * Deterministic, local-only rules. Order matters: the first rule to claim a
 * character range wins, so specific patterns are listed before generic ones.
 */

/**
 * Phone formats seen on real resumes. Three alternatives, in priority order:
 *  1. country code + 9-14 grouped digits   (+91 98765 43210, +1 555-123-4567,
 *     +44 20 7946 0958, +91-9876543210)
 *  2. grouped digits without a country code ((555) 123-4567, 020 7946 0958,
 *     555.123.4567, 98765 43210)
 *  3. unformatted 10 digits (9876543210)
 * The `isValid` check below rejects anything that is not 10-15 digits, so
 * dates, IPs, version numbers and short IDs are filtered out.
 */
const phonePattern =
  /(?:\+\d{1,3}[\s.-]?)(?:\(\d{1,4}\)[\s.-]?)?(?:\d[\s.-]?){9,14}\d\b|(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{2,5}(?:[\s.-]\d{2,5}){1,4}\b|\b\d{10}\b/g;

const dobPattern =
  /\b(?:(DOB|DATE OF BIRTH|BIRTH DATE)\s*:?\s*)?(0?[1-9]|[12]\d|3[01])[/-](0?[1-9]|1[0-2])[/-]((?:19|20)?\d{2})\b/gi;

export const RULES = [
  {
    type: 'EMAIL',
    method: 'regex',
    confidence: 0.99,
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    type: 'LINKEDIN',
    method: 'regex',
    confidence: 0.96,
    pattern: /\b(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Z0-9_-]+\/?/gi,
  },
  {
    type: 'GITHUB',
    method: 'regex',
    confidence: 0.96,
    pattern: /\b(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Z0-9_-]+\/?/gi,
  },
  {
    type: 'DOB',
    method: 'regex',
    confidence: (match) => (match[1] ? 0.92 : 0.6),
    reason: (match) => (match[1] ? null : 'Date-like value without a DOB label'),
    pattern: dobPattern,
  },
  {
    type: 'PHONE',
    method: 'regex',
    // A validated 10-15 digit sequence on a resume is phone-number shaped.
    // Accept by default so it is redacted without an extra click; the reviewer
    // can still click Keep for an ID or other false positive.
    confidence: 0.9,
    isValid: (match) => {
      const digits = match[0].replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    },
    pattern: phonePattern,
  },
  {
    type: 'URL',
    method: 'regex',
    confidence: 0.7,
    reason: 'Generic link; verify whether it identifies you',
    pattern: /\bhttps?:\/\/[^\s<>"')]+/gi,
  },
];

export const SECTION_HEADERS = new Set([
  'RESUME',
  'CV',
  'CURRICULUM VITAE',
  'SUMMARY',
  'PROFILE',
  'PROFESSIONAL SUMMARY',
  'EXPERIENCE',
  'WORK EXPERIENCE',
  'EDUCATION',
  'SKILLS',
  'TECHNICAL SKILLS',
  'CONTACT',
  'CONTACT DETAILS',
  'PERSONAL DETAILS',
  'OBJECTIVE',
  'PROJECTS',
  'CERTIFICATIONS',
  'AWARDS',
  'LANGUAGES',
]);
