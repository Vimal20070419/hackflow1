import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeProps {
  value: string;
  format?: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  background?: string;
  lineColor?: string;
  className?: string;
}

export const BarcodeRenderer: React.FC<BarcodeProps> = ({
  value,
  format = 'CODE128',
  width = 1.6,
  height = 40,
  displayValue = true,
  fontSize = 12,
  background = 'transparent',
  lineColor = '#ffffff',
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue,
          font: 'monospace',
          fontSize,
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 4,
          background,
          lineColor,
          margin: 4,
        });
      } catch (err) {
        console.error('Failed to render barcode:', err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize, background, lineColor]);

  return <svg ref={svgRef} className={`max-w-full ${className}`} />;
};
