"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface StudentBarcodeProps {
  value: string;
  className?: string;
  height?: number;
  displayValue?: boolean;
}

/** Renders a Code 128 barcode for FilCycle student stickers / kiosk preview. */
export function StudentBarcode({
  value,
  className,
  height = 64,
  displayValue = true,
}: StudentBarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: 2,
        height,
        displayValue,
        fontSize: 12,
        margin: 8,
        background: "#ffffff",
        lineColor: "#0a0a0a",
      });
    } catch {
      // Invalid payload — leave SVG empty
    }
  }, [value, height, displayValue]);

  return <svg ref={svgRef} className={className} role="img" aria-label={`Barcode ${value}`} />;
}
