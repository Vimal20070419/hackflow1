import { useEffect, useRef } from 'react';
import { extractSingleBarcode } from './barcodeUtils.js';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number;
  enabled?: boolean;
}

/**
 * Custom hook to listen for external hardware USB/Bluetooth barcode scanners.
 * Barcode scanners act as keyboard emulation (HID) devices that type rapidly (< 50ms per key)
 * and finish with an Enter keypress.
 */
export const useBarcodeScanner = ({
  onScan,
  minChars = 2,
  maxIntervalMs = 60,
  enabled = true,
}: UseBarcodeScannerOptions) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // When Enter is pressed, check if buffer came from a rapid hardware scanner
      if (e.key === 'Enter') {
        const rawScanned = bufferRef.current.trim();
        bufferRef.current = '';

        if (rawScanned.length >= minChars) {
          // Prevent form submit or accidental UI actions
          e.preventDefault();
          e.stopPropagation();

          const cleanBarcode = extractSingleBarcode(rawScanned);
          if (cleanBarcode) {
            onScan(cleanBarcode);
          }
        }
        return;
      }

      // Ignore modifiers and control keys
      if (e.key.length !== 1 || e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // If time between keystrokes is too long (human typing pause), reset buffer
      if (timeDiff > maxIntervalMs && bufferRef.current.length > 0) {
        bufferRef.current = '';
      }

      bufferRef.current += e.key;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onScan, minChars, maxIntervalMs, enabled]);
};

