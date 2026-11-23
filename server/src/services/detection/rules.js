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

/** Only well-known suffixes are treated as websites; IPs and versions are not. */
const WEB_TLDS = new Set(
  (
    'com org net edu gov mil int io dev me app tech ai co in uk us ca de fr au nz ' +
    'info biz xyz online site cloud blog tv cc ws fm ly sh link click email name pro ' +
    'museum travel shop store health law finance page one top space website agency ' +
    'solutions digital studio works city company network systems group team bio about ' +
    'photography design software'
  ).split(/\s+/),
);

/** Trailing token of "City, Region" / "City, Country" location-like values. */
const LOCATION_REGIONS = new Set(
  (
    'India USA UK US UAE United States United Kingdom United Arab Emirates Canada ' +
    'Australia Germany France Netherlands Ireland Singapore Japan China Brazil ' +
    'South Africa New Zealand England Scotland Wales Europe Asia Africa ' +
    'Delhi Maharashtra Karnataka Tamil Nadu Telangana West Bengal Uttar Pradesh ' +
    'Gujarat Rajasthan Kerala Punjab Haryana Andhra Pradesh Odisha Madhya Pradesh ' +
    'CA NY TX WA MA IL FL NJ PA GA CO AZ NC VA OH MI MN MO MD CT UT OR NV TN WI ' +
    'IN KS IA AL LA OK SC KY AR NE ID MS NH ME MT RI DE SD ND AK HI VT WV WY NM'
  )
    .split(/\s+/)
    .map((region) => region.toUpperCase()),
);

function isWebHost(host) {
  if (!host || !host.includes('.')) return false;
  if (/^\d+(\.\d+)+$/.test(host)) return false; // IPv4 or version numbers
  const tld = host.slice(host.lastIndexOf('.') + 1).toLowerCase();
  return WEB_TLDS.has(tld);
}

function hostFromUrl(raw) {
  return String(raw ?? '')
    .replace(/^https?:\/\//i, '')
    .split(/[/?#]/)[0]
    .toLowerCase();
}

// Longest-first alternatives stop the region token from swallowing the next
// contact value (e.g. "India rahul.dev"). Capitalisation is required for the
// leading place words so a lowercase slug cannot start a location match.
const MULTIWORD_REGIONS = [
  'United Arab Emirates',
  'United States',
  'United Kingdom',
  'Andhra Pradesh',
  'Madhya Pradesh',
  'New Zealand',
  'South Africa',
  'Sri Lanka',
  'Tamil Nadu',
  'West Bengal',
  'Uttar Pradesh',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'South Carolina',
  'Rhode Island',
  'West Virginia',
];

const regionPattern = [...MULTIWORD_REGIONS, '[A-Z]{2}', '[A-Z][A-Za-z]+'].join('|');
const locationPattern = new RegExp(
  '\\b(?:\\d{1,5}\\s+[A-Z][A-Za-z.\'-]*(?:\\s+[A-Z][A-Za-z.\'-]*){0,4}\\s+' +
    '(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Nagar|Colony|Sector)\\s*,\\s*)?' +
    `[A-Z][A-Za-z.'-]+(?:\\s+[A-Z][A-Za-z.'-]+){0,3}\\s*,\\s*(${regionPattern})\\b`,
  'g',
);

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
    type: 'URL',
    method: 'regex',
    confidence: 0.85,
    reason: 'Website link; verify whether it identifies you',
    trimTrailing: /[.,;:!?]+$/,
    pattern: /\bhttps?:\/\/[^\s<>"'()[\]{}]+/gi,
    isValid: (match) => {
      const host = hostFromUrl(match[0]);
      return isWebHost(host) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(host);
    },
  },
  {
    type: 'URL',
    method: 'regex',
    confidence: 0.82,
    reason: 'Website address without a prefix; verify whether it identifies you',
    trimTrailing: /[.,;:!?)]+$/,
    pattern: /\b(?:www\.)?[A-Z0-9-]+(?:\.[A-Z0-9-]+)+(?:[/?#][^\s<>"'()[\]{}]*)?/gi,
    isValid: (match) => isWebHost(hostFromUrl(match[0])),
  },
  {
    type: 'LOCATION',
    method: 'regex',
    confidence: 0.75,
    reason: 'Location-like value; confirm before hiding',
    pattern: locationPattern,
    isValid: (match) => {
      const region = String(match[1] ?? '').trim().toUpperCase();
      return LOCATION_REGIONS.has(region);
    },
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
