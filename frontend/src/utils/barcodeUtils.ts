/**
 * Barcode Parsing and Normalization Utilities
 * Handles single scans, repeated scans (e.g., FOR-BC-001FOR-BC-001FOR-BC-001),
 * external hardware scanner bursts, and formats (FOR-BC-001, BC-00001, QR-00001, raw digits).
 */

export const extractSingleBarcode = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim().toUpperCase();

  // 1. Look for all barcode patterns matching FOR-BC-..., BC-..., BAR-..., QR-..., FOR-...
  const matches = trimmed.match(/(?:FOR-BC|FOR|BC|BAR|QR)-?\d{1,5}/gi);
  if (matches && matches.length > 0) {
    // If multiple duplicate scans were concatenated, take the LAST scanned one
    const lastMatch = matches[matches.length - 1].toUpperCase();
    return normalizeToStandardBarcode(lastMatch);
  }

  // 2. URL format like ?barcode=FOR-BC-001 or /portal/BC-00001
  const urlMatch = trimmed.match(/[?&](?:barcode|qr)=([^&#]+)/i) || trimmed.match(/portal\/([^/?#]+)/i);
  if (urlMatch && urlMatch[1]) {
    const candidate = decodeURIComponent(urlMatch[1]).trim().toUpperCase();
    return extractSingleBarcode(candidate);
  }

  // 3. Pure numeric format (e.g. 1, 42, 001, 00042)
  const numMatch = trimmed.match(/\d+$/);
  if (numMatch && /^\d{1,5}$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    return `BC-${String(num).padStart(5, '0')}`;
  }

  return normalizeToStandardBarcode(trimmed);
};

export const normalizeToStandardBarcode = (val: string): string => {
  if (!val) return '';
  const trimmed = val.trim().toUpperCase();

  // Extract number part
  const numMatch = trimmed.match(/\d+$/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    if (!isNaN(num) && num > 0 && num <= 10000) {
      return `BC-${String(num).padStart(5, '0')}`;
    }
  }

  // Fallback cleanup
  if (trimmed.startsWith('QR-')) {
    return `BC-${trimmed.slice(3)}`;
  }
  return trimmed;
};

export const getBarcodeVariations = (input: string): string[] => {
  const clean = extractSingleBarcode(input);
  if (!clean) return [];

  const numMatch = clean.match(/\d+$/);
  if (!numMatch) return [clean];

  const num = parseInt(numMatch[0], 10);
  const pad5 = String(num).padStart(5, '0');
  const pad3 = String(num).padStart(3, '0');
  const rawNum = String(num);

  const variations = new Set<string>([
    clean,
    `BC-${pad5}`,
    `BC-${pad3}`,
    `BC-${rawNum}`,
    `FOR-BC-${pad5}`,
    `FOR-BC-${pad3}`,
    `FOR-BC-${rawNum}`,
    `FOR-${pad3}`,
    `FOR-${pad5}`,
    `QR-${pad5}`,
    rawNum,
  ]);

  return Array.from(variations);
};
