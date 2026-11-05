import React from 'react';
import { UP_POLICE_LOGO_BASE64 } from './upPoliceLogoBase64';

/**
 * Official Uttar Pradesh Police Emblem / Crest Logo Component.
 * Uses high-resolution embedded base64 data URI:
 * - Zero network latency / zero broken image icons
 * - Instant rendering in window.open() print preview
 * - 100% reliable in html2canvas / jsPDF without cross-origin tainting
 * - Offline PWA safe
 */
export function UpPoliceLogo({ size = 32, className = '', style = {} }) {
  return (
    <img
      src={UP_POLICE_LOGO_BASE64}
      alt="उत्तर प्रदेश पुलिस"
      width={size}
      height={size}
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
        objectFit: 'contain',
        flexShrink: 0,
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style
      }}
      loading="eager"
    />
  );
}

/**
 * Returns raw image HTML markup string with embedded base64 data URI
 * for template-based HTML generation (printLegalBulk, etc.)
 */
export function getUpPoliceLogoSvgString(size = 32) {
  return `<img src="${UP_POLICE_LOGO_BASE64}" alt="उत्तर प्रदेश पुलिस" width="${size}" height="${size}" style="width:${size}px;height:${size}px;max-width:${size}px;max-height:${size}px;object-fit:contain;flex-shrink:0;display:inline-block;vertical-align:middle;" />`;
}

export default UpPoliceLogo;
