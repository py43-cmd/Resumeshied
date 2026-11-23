/**
 * Deterministic, local-only rules. Order matters: the first rule to claim a
 * character range wins, so specific patterns are listed before generic ones.
 */

const phonePattern =
  /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{5}[\s.-]\d{5}|\b\d{10}\b|(?:\+\d{1,3}[\s.-]?)?(?:\(\d{3}\)[\s.-]?)?\d{3}[\s.-]\d{3}[\s.-]\d{4}/g;

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
    confidence: (match) => (/^\d{10}$/.test(match[0]) ? 0.68 : 0.9),
    reason: (match) => (/^\d{10}$/.test(match[0]) ? 'Unformatted digit sequence' : null),
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
