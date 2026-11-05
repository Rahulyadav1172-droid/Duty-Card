// Dedicated high-speed isolated Legal and A4 print engine
// Renders 2-Sided Foldable Wearable Neck-Lanyard ID Badges (180mm x 128mm: 90mm Front + 90mm Back)
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { resolvePoliceRank, stripRankFromName, parseIncharge } from './rankResolver';
import { getUpPoliceLogoSvgString } from '../components/UpPoliceLogo';

/**
 * Dynamic Zone/Area security color coding
 */
export function getZoneTheme(zone = '', sector = '', dutyPlace = '') {
  const combined = `${zone} ${sector} ${dutyPlace}`.toLowerCase();
  
  if (
    combined.includes('हेलीपैड') ||
    combined.includes('helipad') ||
    combined.includes('आन्तरिक') ||
    combined.includes('inner') ||
    combined.includes('vvip') ||
    combined.includes('कोर') ||
    combined.includes('core') ||
    combined.includes('मंच') ||
    combined.includes('stage') ||
    combined.includes('डी-एरिया') ||
    combined.includes('d-area') ||
    combined.includes('बैरिकेटिंग')
  ) {
    return {
      bg: '#dc2626',
      border: '#b91c1c',
      badgeBg: '#fef2f2',
      badgeText: '#991b1b',
      zoneBadge: 'VVIP कोर सुरक्षा',
      themeType: 'vvip-core'
    };
  }
  
  if (
    combined.includes('वाह्य') ||
    combined.includes('outer') ||
    combined.includes('ट्रैफिक') ||
    combined.includes('traffic') ||
    combined.includes('रूट') ||
    combined.includes('route') ||
    combined.includes('मार्ग') ||
    combined.includes('बैरियर') ||
    combined.includes('barrier') ||
    combined.includes('पिकेट') ||
    combined.includes('सीमावर्ती') ||
    combined.includes('डायवर्जन') ||
    combined.includes('पार्किंग बैरियर')
  ) {
    return {
      bg: '#1d4ed8',
      border: '#1e40af',
      badgeBg: '#eff6ff',
      badgeText: '#1e40af',
      zoneBadge: 'वाह्य कार्डन / रूट',
      themeType: 'outer-cordon'
    };
  }

  return {
    bg: '#059669',
    border: '#047857',
    badgeBg: '#ecfdf5',
    badgeText: '#065f46',
    zoneBadge: 'सुरक्षा व्यवस्था',
    themeType: 'general-reserve'
  };
}

/**
 * Shared CSS stylesheet for the 2-Sided Foldable Pass Unit
 */
function getSharedFoldablePassStyles(isA4 = true) {
  return `
    @page {
      size: ${isA4 ? 'A4 portrait' : 'legal portrait'};
      margin: 5mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Noto Sans Devanagari', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #ffffff;
      color: #020617;
      margin: 0;
      padding: 0;
    }
    .foldable-print-page {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      padding: 2mm 0;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: center;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      box-sizing: border-box;
      min-height: 275mm;
    }
    .foldable-pass-unit {
      width: 180mm;
      height: 112mm;
      max-height: 112mm;
      display: flex;
      flex-direction: row;
      border: 1.5px solid #0f172a;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
      box-sizing: border-box;
      margin: 1.5mm auto;
      page-break-inside: avoid;
      break-inside: avoid;
      position: relative;
    }
    .pass-panel-front {
      width: 90mm;
      height: 112mm;
      max-height: 112mm;
      padding: 2mm 2.5mm;
      box-sizing: border-box;
      border-right: 1.5px dashed #cbd5e1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      background: #ffffff;
      position: relative;
    }
    .pass-panel-back {
      width: 90mm;
      height: 112mm;
      max-height: 112mm;
      padding: 2mm 2.5mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      background: #ffffff;
      position: relative;
    }
    .punch-slot-bar {
      padding-top: 1px;
      padding-bottom: 2px;
      text-align: center;
      flex-shrink: 0;
    }
    .punch-slot {
      width: 44px;
      height: 6px;
      border-radius: 9999px;
      border: 1px solid #cbd5e1;
      background: #f1f5f9;
      margin: 0 auto;
    }
    .front-header {
      background: #0f172a;
      color: #ffffff;
      padding: 3.5px 6px;
      border-bottom: 3px solid #dc2626;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      border-radius: 4px 4px 0 0;
      flex-shrink: 0;
    }
    .front-header-center {
      flex: 1;
      text-align: center;
      min-width: 0;
    }
    .front-header-sub {
      color: #fbbf24;
      font-weight: 700;
      font-size: 10px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .front-header-title {
      color: #ffffff;
      font-weight: 900;
      font-size: 13px;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 1px 0;
    }
    .front-header-badge {
      background: #dc2626;
      color: #ffffff;
      font-size: 8.5px;
      padding: 1px 6px;
      border-radius: 9999px;
      font-weight: 700;
    }
    .front-header-zone {
      background: #facc15;
      color: #020617;
      font-weight: 900;
      padding: 2px 5px;
      border-radius: 4px;
      border: 1px solid #eab308;
      text-align: center;
      line-height: 1;
      flex-shrink: 0;
    }
    .zone-tag {
      font-size: 6.5px;
      font-weight: 700;
      color: #1e293b;
    }
    .zone-val {
      font-size: 12px;
      font-weight: 900;
    }
    .officer-profile-row {
      padding: 3px 2px 2px 2px;
      display: flex;
      align-items: center;
      gap: 7px;
      flex-shrink: 0;
      background: #ffffff;
    }
    .photo-frame {
      width: 60px;
      min-width: 60px;
      height: 76px;
      border: 2px solid #cbd5e1;
      border-radius: 6px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
      box-sizing: border-box;
    }
    .officer-details {
      flex: 1;
      min-width: 0;
    }
    .officer-name-row {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
    }
    .name-text {
      font-size: 16.5px;
      font-weight: 900;
      color: #020617;
      line-height: 1.15;
      word-break: break-word;
      white-space: normal;
    }
    .rank-badge {
      font-size: 11.5px;
      font-weight: 800;
      background: #0f172a;
      color: #ffffff;
      padding: 1px 5px;
      border-radius: 4px;
    }
    .mobile-row {
      margin-top: 2.5px;
    }
    .mobile-pill {
      font-size: 15px;
      font-weight: 800;
      color: #065f46;
      background: #ecfdf5;
      border: 1px solid #6ee7b7;
      padding: 1.5px 7px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-family: 'JetBrains Mono', monospace;
    }
    .meta-row {
      font-size: 11.5px;
      font-weight: 700;
      color: #334155;
      word-break: break-word;
      white-space: normal;
      line-height: 1.2;
      margin-top: 2px;
    }
    .duty-spotlight-box {
      margin: 2px 1px;
      background: #fffbeb;
      border: 2px solid #f59e0b;
      border-left: 6px solid #d97706;
      border-radius: 6px;
      padding: 4px 6px;
      flex-shrink: 0;
    }
    .spotlight-lbl {
      font-size: 10.5px;
      font-weight: 800;
      color: #78350f;
      text-transform: uppercase;
    }
    .spotlight-val {
      font-size: 16px;
      font-weight: 900;
      color: #020617;
      line-height: 1.25;
      margin-top: 1px;
    }
    .time-bar {
      margin: 1.5px 1px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 2.5px 6px;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 800;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }
    .footer-security-bar {
      background: #f8fafc;
      border-top: 2px solid #0f172a;
      padding: 3px 6px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      width: 100%;
      flex-shrink: 0;
      margin-top: auto;
      border-radius: 0 0 4px 4px;
      box-sizing: border-box;
    }
    .verified-unit {
      display: flex;
      align-items: center;
      gap: 6px;
      text-align: left;
    }
    .qr-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 2px;
      line-height: 0;
    }
    .ver-tag {
      font-size: 9.5px;
      font-weight: 800;
      color: #065f46;
      text-transform: uppercase;
    }
    .pass-id-mono {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12.5px;
      font-weight: 800;
      color: #1e293b;
    }
    .sign-block {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .sign-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #020617;
      line-height: 1.15;
    }
    .back-header-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 3.5px 6px;
      text-align: center;
      font-size: 11.5px;
      font-weight: 800;
      border-radius: 4px 4px 0 0;
      border-bottom: 2.5px solid #dc2626;
      flex-shrink: 0;
    }
    .back-card {
      padding: 4px 6px;
      border-radius: 6px;
      margin-bottom: 3px;
      flex-shrink: 0;
    }
    .back-zone-card {
      background: #eff6ff;
      border: 2px solid #bfdbfe;
    }
    .back-sector-card {
      background: #eef2ff;
      border: 2px solid #c7d2fe;
    }
    .back-card-lbl {
      font-size: 10.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .back-zone-lbl { color: #1e40af; }
    .back-sector-lbl { color: #3730a3; }
    .back-card-name {
      font-size: 14.5px;
      font-weight: 900;
      line-height: 1.2;
      margin-top: 1px;
      word-break: break-word;
      white-space: normal;
    }
    .back-zone-name { color: #172554; }
    .back-sector-name { color: #1e1b4b; }
    .back-divider {
      height: 1px;
      background: #cbd5e1;
      margin: 2.5px 0;
    }
    .back-incharge-name {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
      word-break: break-word;
      white-space: normal;
    }
    .back-mob-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #ffffff;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 15px;
      font-weight: 800;
      margin-top: 2px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .back-zone-mob {
      color: #1e3a8a;
      border: 1px solid #93c5fd;
    }
    .back-sector-mob {
      color: #312e81;
      border: 1px solid #a5b4fc;
    }
    .back-briefing-box {
      background: #ecfdf5;
      border: 2px solid #6ee7b7;
      padding: 4px 6px;
      border-radius: 6px;
      margin-top: auto;
      flex-shrink: 0;
    }
    .back-briefing-lbl {
      font-size: 11px;
      font-weight: 700;
      color: #065f46;
      text-transform: uppercase;
    }
    .back-briefing-val {
      font-size: 13px;
      font-weight: 800;
      color: #022c22;
      line-height: 1.25;
      margin-top: 1px;
      word-break: break-word;
      white-space: normal;
    }

    /* 4-in-1 and 6-in-1 Grid Print Layouts */
    .grid-4-print-page {
      width: 100%;
      max-width: 200mm;
      margin: 0 auto;
      height: ${isA4 ? '285mm' : '345mm'};
      max-height: ${isA4 ? '287mm' : '348mm'};
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 3.5mm;
      padding: 2mm;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .grid-6-print-page {
      width: 100%;
      max-width: 200mm;
      margin: 0 auto;
      height: ${isA4 ? '285mm' : '345mm'};
      max-height: ${isA4 ? '287mm' : '348mm'};
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr 1fr;
      gap: 2.5mm;
      padding: 2mm;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .vvip-single-card {
      width: 100%;
      height: 100%;
      border: 1.5px solid #0f172a;
      border-radius: 8px;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
      box-sizing: border-box;
      padding: 2.5mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .vvip-single-card.compact-6 {
      border-radius: 6px;
      padding: 1.8mm;
    }
    .single-header {
      background: #0f172a;
      color: #ffffff;
      padding: 3px 5px;
      border-bottom: 2.5px solid #dc2626;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      border-radius: 4px 4px 0 0;
      flex-shrink: 0;
    }
    .single-header.compact-6 {
      padding: 2px 4px;
      border-bottom: 2px solid #dc2626;
    }
    .single-header-center {
      flex: 1;
      text-align: center;
      min-width: 0;
    }
    .single-header-sub {
      color: #fbbf24;
      font-weight: 700;
      font-size: 8.5px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.1;
    }
    .single-header-title {
      color: #ffffff;
      font-weight: 900;
      font-size: 11.5px;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 1px 0;
    }
    .single-header-badge {
      background: #dc2626;
      color: #ffffff;
      font-size: 8px;
      padding: 0.5px 5px;
      border-radius: 9999px;
      font-weight: 700;
    }
    .single-header-zone {
      background: #facc15;
      color: #020617;
      font-weight: 900;
      padding: 1.5px 4px;
      border-radius: 4px;
      border: 1px solid #eab308;
      text-align: center;
      line-height: 1;
      flex-shrink: 0;
    }
    .single-profile-row {
      padding: 2.5px 1px 1px 1px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
      background: #ffffff;
    }
    .single-photo-frame {
      width: 44px;
      height: 56px;
      border: 1.5px solid #cbd5e1;
      border-radius: 5px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .compact-6 .single-photo-frame {
      width: 36px;
      height: 46px;
    }
    .single-officer-details {
      flex: 1;
      min-width: 0;
    }
    .single-name-row {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }
    .single-name-text {
      font-size: 14.5px;
      font-weight: 900;
      color: #020617;
      line-height: 1.15;
      word-break: break-word;
      white-space: normal;
    }
    .compact-6 .single-name-text {
      font-size: 12px;
    }
    .single-rank-badge {
      font-size: 9.5px;
      font-weight: 800;
      background: #0f172a;
      color: #ffffff;
      padding: 1px 4.5px;
      border-radius: 3px;
    }
    .compact-6 .single-rank-badge {
      font-size: 8px;
      padding: 0.5px 3.5px;
    }
    .single-mobile-pill {
      font-size: 13px;
      font-weight: 800;
      color: #065f46;
      background: #ecfdf5;
      border: 1px solid #6ee7b7;
      padding: 1px 6px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-family: 'JetBrains Mono', monospace;
      margin-top: 1.5px;
    }
    .compact-6 .single-mobile-pill {
      font-size: 10.5px;
      padding: 0.5px 4px;
      margin-top: 1px;
    }
    .single-meta-row {
      font-size: 9px;
      font-weight: 700;
      color: #334155;
      word-break: break-word;
      white-space: normal;
      line-height: 1.2;
      margin-top: 1.5px;
    }
    .compact-6 .single-meta-row {
      font-size: 8px;
      margin-top: 1px;
    }
    .single-spotlight-box {
      margin: 1.5px 0;
      background: #fffbeb;
      border: 1.5px solid #f59e0b;
      border-left: 5px solid #d97706;
      border-radius: 5px;
      padding: 2.5px 5px;
      flex-shrink: 0;
    }
    .compact-6 .single-spotlight-box {
      margin: 1px 0;
      padding: 2px 4px;
      border-left-width: 4px;
    }
    .single-spotlight-lbl {
      font-size: 8.5px;
      font-weight: 800;
      color: #78350f;
      text-transform: uppercase;
      line-height: 1;
    }
    .compact-6 .single-spotlight-lbl {
      font-size: 7.5px;
    }
    .single-spotlight-val {
      font-size: 13.5px;
      font-weight: 900;
      color: #020617;
      line-height: 1.2;
      margin-top: 1px;
    }
    .compact-6 .single-spotlight-val {
      font-size: 11.5px;
    }
    .single-time-bar {
      margin: 1px 0;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 800;
      color: #0f172a;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      line-height: 1.2;
    }
    .compact-6 .single-time-bar {
      font-size: 8.5px;
      padding: 1.5px 4px;
    }
    .single-ops-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3px;
      margin: 1px 0;
      flex-shrink: 0;
    }
    .single-op-card {
      border-radius: 4px;
      padding: 2px 4px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-width: 0;
    }
    .single-zone-card {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
    }
    .single-sector-card {
      background: #eef2ff;
      border: 1px solid #c7d2fe;
    }
    .single-op-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8.5px;
      font-weight: 800;
      line-height: 1.1;
    }
    .compact-6 .single-op-header {
      font-size: 7.5px;
    }
    .single-op-name {
      font-size: 10.5px;
      font-weight: 900;
      line-height: 1.15;
      margin: 0.5px 0;
      word-break: break-word;
      white-space: normal;
    }
    .compact-6 .single-op-name {
      font-size: 9px;
    }
    .single-incharge-text {
      font-size: 9px;
      font-weight: 700;
      color: #1e293b;
      word-break: break-word;
      white-space: normal;
      line-height: 1.15;
    }
    .compact-6 .single-incharge-text {
      font-size: 8px;
    }
    .single-incharge-mob {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      font-weight: 800;
      color: #0369a1;
      display: inline-block;
      margin-top: 1px;
    }
    .compact-6 .single-incharge-mob {
      font-size: 8px;
    }
    .single-briefing-box {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 4px;
      padding: 2px 4px;
      margin: 1px 0;
      font-size: 9px;
      font-weight: 700;
      color: #065f46;
      line-height: 1.15;
      flex-shrink: 0;
      word-break: break-word;
      white-space: normal;
    }
    .compact-6 .single-briefing-box {
      font-size: 8px;
      padding: 1.5px 3.5px;
    }
    .single-footer-bar {
      background: #f8fafc;
      border-top: 1.5px solid #0f172a;
      padding: 2px 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      flex-shrink: 0;
      margin-top: auto;
      border-radius: 0 0 4px 4px;
    }
    .compact-6 .single-footer-bar {
      padding: 1.5px 3px;
      border-top-width: 1px;
    }
  `;
}

/**
 * Generates the HTML string for a single 2-Sided Foldable Pass Unit (180mm x 128mm)
 */
export function renderFoldablePassUnitHtml({
  duty,
  allRecords = [],
  eventTitle = '',
  eventSubtitle = '',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  customNote = '',
  isNoteEnabled = true,
  customBriefing = '',
  isBriefingEnabled = true
}) {
  if (!duty) return '';

  const activeBriefing = (isBriefingEnabled !== false && customBriefing)
    ? customBriefing
    : (isBriefingEnabled ? (duty.briefing_place || '') : '');

  // 1. Resolve Zone & Zonal Incharge
  let cleanZone = (duty.zone || '').trim();
  let cleanZonalIncharge = (
    duty.zonal_incharge || 
    duty.zonal || 
    duty.zonal_officer || 
    duty.zonalOfficer || 
    duty.zone_incharge || 
    duty.zonal_magistrate ||
    duty['जोनाल प्रभारी'] ||
    duty['जोनल प्रभारी'] ||
    ''
  ).trim();
  if (cleanZonalIncharge === '-') cleanZonalIncharge = '';

  if (!cleanZonalIncharge && cleanZone.includes('/')) {
    const parts = cleanZone.split('/');
    cleanZone = parts[0].trim();
    cleanZonalIncharge = parts.slice(1).join('/').trim();
  } else if (cleanZone.endsWith('/')) {
    cleanZone = cleanZone.replace(/\/+\s*$/, '').trim();
  }

  // Cross lookup in allRecords if missing
  if (!cleanZonalIncharge && cleanZone && Array.isArray(allRecords)) {
    const matchedZoneRec = allRecords.find(r => 
      r && 
      (r.zone || '').trim().toLowerCase() === cleanZone.toLowerCase() && 
      (r.zonal_incharge || r.zonal || r.zonal_officer || r.zonalOfficer || r.zone_incharge || r['जोनाल प्रभारी'] || r['जोनल प्रभारी'])
    );
    if (matchedZoneRec) {
      cleanZonalIncharge = (
        matchedZoneRec.zonal_incharge || 
        matchedZoneRec.zonal || 
        matchedZoneRec.zonal_officer || 
        matchedZoneRec.zonalOfficer || 
        matchedZoneRec.zone_incharge || 
        matchedZoneRec['जोनाल प्रभारी'] || 
        matchedZoneRec['जोनल प्रभारी'] || 
        ''
      ).trim();
    }
  }

  // 2. Resolve Sector & Sector Incharge
  let cleanSector = (duty.sector || '').trim();
  let cleanSectorIncharge = (
    duty.sector_incharge || 
    duty.sector_officer || 
    duty.sectorOfficer || 
    duty.sectorIncharge || 
    duty.sector_magistrate || 
    duty.sectorMagistrate || 
    duty.incharge || 
    duty['सेक्टर प्रभारी'] ||
    duty['सेक्टर अधिकारी'] ||
    duty['सेक्टर मजिस्ट्रेट'] ||
    duty['प्रभारी'] ||
    ''
  ).trim();
  if (cleanSectorIncharge === '-') cleanSectorIncharge = '';

  if (!cleanSectorIncharge && cleanSector.includes('/')) {
    const parts = cleanSector.split('/');
    cleanSector = parts[0].trim();
    cleanSectorIncharge = parts.slice(1).join('/').trim();
  } else if (cleanSector.endsWith('/')) {
    cleanSector = cleanSector.replace(/\/+\s*$/, '').trim();
  }

  if (!cleanSectorIncharge && cleanSector && Array.isArray(allRecords)) {
    const matchedSectorRec = allRecords.find(r => {
      if (!r) return false;
      const rSec = (r.sector || '').trim().toLowerCase();
      const currSec = cleanSector.toLowerCase();
      const isSame = rSec === currSec || rSec.startsWith(currSec) || currSec.startsWith(rSec);
      const inc = (
        r.sector_incharge || 
        r.sector_officer || 
        r.sectorOfficer || 
        r.sectorIncharge || 
        r.sector_magistrate || 
        r.sectorMagistrate || 
        r.incharge || 
        r['सेक्टर प्रभारी'] || 
        r['सेक्टर अधिकारी'] || 
        r['सेक्टर मजिस्ट्रेट'] || 
        r['प्रभारी'] || 
        ''
      ).trim();
      return isSame && inc && inc !== '-';
    });
    if (matchedSectorRec) {
      cleanSectorIncharge = (
        matchedSectorRec.sector_incharge || 
        matchedSectorRec.sector_officer || 
        matchedSectorRec.sectorOfficer || 
        matchedSectorRec.sectorIncharge || 
        matchedSectorRec.sector_magistrate || 
        matchedSectorRec.sectorMagistrate || 
        matchedSectorRec.incharge || 
        matchedSectorRec['सेक्टर प्रभारी'] || 
        matchedSectorRec['सेक्टर अधिकारी'] || 
        matchedSectorRec['सेक्टर मजिस्ट्रेट'] || 
        matchedSectorRec['प्रभारी'] || 
        ''
      ).trim();
    }
  }

  // Parse incharge and mobile numbers
  const zonalInfo = parseIncharge(cleanZonalIncharge);
  const sectorInfo = parseIncharge(cleanSectorIncharge);
  const zonalMobile = zonalInfo.mobile || duty.zonal_mobile || duty.zone_mobile || '';
  const sectorMobile = sectorInfo.mobile || duty.sector_mobile || '';

  // Resolve Rank and Officer Name
  const effectiveRank = duty?.rank ? resolvePoliceRank(duty.rank) : '';
  const displayCleanName = stripRankFromName(duty?.name) || '-';

  // Clean PNO
  const cleanPno = (duty.pno && !String(duty.pno).toUpperCase().startsWith('DUTY-'))
    ? String(duty.pno)
    : (duty.id && !String(duty.id).toUpperCase().startsWith('DUTY-') && String(duty.id).length <= 12)
      ? String(duty.id)
      : null;

  // Photo
  const photoHtml = duty.photo
    ? `<img src="${duty.photo}" style="width:100%;height:100%;object-fit:cover;" />`
    : `
      <div style="padding:2px;text-align:center;color:#94a3b8;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <svg style="width:22px;height:22px;margin:0 auto;display:block;stroke:#94a3b8;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <div style="font-size:8.5px;font-weight:800;color:#334155;margin-top:2px;line-height:1.1;">पासपोर्ट फोटो</div>
        <div style="font-size:7.5px;font-weight:600;color:#94a3b8;line-height:1;">चस्पा करें</div>
      </div>
    `;

  // Signature
  const signHtml = signatureImg
    ? `<img src="${signatureImg}" style="height:26px;max-width:85px;object-fit:contain;margin-left:auto;margin-bottom:2px;" />`
    : `<div style="font-family:serif;font-style:italic;font-size:11px;color:#475569;line-height:1;margin-bottom:2px;">(हस्ताक्षरित)</div>`;

  // QR Code
  let qrSvgHtml = '';
  try {
    const authCode = (duty.id && !String(duty.id).toUpperCase().startsWith('DUTY-') ? String(duty.id) : '') || `AUTH-${Math.abs(hashCode(duty.name + (duty.mobile || '') + (duty.duty_place || ''))).toString(36).toUpperCase()}`;

    const searchParam = (duty.mobile || duty.pno || duty.id || '').trim();
    const qrDirectUrl = typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/?search=${encodeURIComponent(searchParam)}`
      : '';

    const qrPayload = qrDirectUrl || [
      `DUTY_PASS: ${duty.id || ''}`,
      `PNO: ${duty.pno || ''}`,
      `MOB: ${duty.mobile || ''}`,
      `NAME: ${duty.name || ''}`,
      `POINT: ${duty.duty_place || ''}`,
      `AUTH: ${authCode}`
    ].join('\n');

    qrSvgHtml = renderToString(
      React.createElement(QRCodeSVG, {
        value: qrPayload,
        size: 54,
        level: 'M',
        includeMargin: false
      })
    );
  } catch (e) {
    qrSvgHtml = '';
  }

  const phoneIconSvg = `
    <svg style="width:12px;height:12px;stroke:#047857;display:inline-block;vertical-align:middle;margin-right:3px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
  `;

  return `
    <div class="foldable-pass-unit">
      <!-- ================= FRONT SIDE (LEFT PANEL: 90mm x 128mm) ================= -->
      <div class="pass-panel-front">
        <div class="punch-slot-bar">
          <div class="punch-slot"></div>
        </div>

        <div class="front-header">
          ${getUpPoliceLogoSvgString(30)}
          <div class="front-header-center">
            <div class="front-header-sub">उत्तर प्रदेश पुलिस • अयोध्या</div>
            <h1 class="front-header-title">${escapeHtml(eventTitle || 'मा० मुख्यमंत्री उ०प्र० अयोध्या आगमन')}</h1>
            <div><span class="front-header-badge">${escapeHtml(eventSubtitle || 'ड्यूटी पास - 2026')}</span></div>
          </div>
          ${getUpPoliceLogoSvgString(30)}
        </div>

        <div class="officer-profile-row">
          <div class="photo-frame">${photoHtml}</div>
          <div class="officer-details">
            <div class="officer-name-row">
              <span class="name-text">${escapeHtml(displayCleanName || duty.name || '-')}</span>
            </div>
            <div class="mobile-row">
              <span class="mobile-pill">${phoneIconSvg} ${escapeHtml(duty.mobile || 'अनुपलब्ध')}</span>
            </div>
            <div class="meta-row">
              मूल तैनाती: <strong>${escapeHtml(duty.posting || '-')}</strong> ${duty.district ? `(${escapeHtml(duty.district)})` : ''}
              ${cleanPno ? ` | P.No: <strong>${escapeHtml(cleanPno)}</strong>` : ''}
            </div>
          </div>
        </div>

        <div class="duty-spotlight-box">
          <div class="spotlight-lbl">ड्यूटी स्थल</div>
          <div class="spotlight-val">${escapeHtml(duty.duty_place || '-')}</div>
        </div>

        <div class="time-bar">
          <div>दिनाँक व समय: <strong>${escapeHtml(duty.shift || 'प्रातः 08:00 बजे से कार्यक्रम समाप्ति तक')}</strong></div>
          ${(duty.booth_no || duty.vehicle_no) ? `
            <div>
              ${duty.booth_no ? `<span style="background:#dbeafe;color:#1e40af;padding:1px 5px;border-radius:3px;font-weight:bold;margin-right:3px;">बूथ: ${escapeHtml(duty.booth_no)}</span>` : ''}
              ${duty.vehicle_no ? `<span style="background:#fef3c7;color:#92400e;padding:1px 5px;border-radius:3px;font-weight:bold;">वाहन: ${escapeHtml(duty.vehicle_no)}</span>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="footer-security-bar">
          <div class="verified-unit">
            <div class="qr-box">${qrSvgHtml}</div>
            <div>
              <div class="ver-tag">● डिजिटल सत्यापित पास</div>
              <div class="pass-id-mono">ID: ${escapeHtml(cleanPno || duty.id || 'DUTY-0001')}</div>
            </div>
          </div>
          <div class="sign-block">
            ${signHtml}
            <div class="sign-title">वरिष्ठ पुलिस अधीक्षक,</div>
            <div class="sign-title">अयोध्या</div>
          </div>
        </div>
      </div>

      <!-- ================= BACK SIDE (RIGHT PANEL: 90mm x 112mm) ================= -->
      <div class="pass-panel-back">
        <div class="punch-slot-bar">
          <div class="punch-slot"></div>
        </div>

        <div class="back-header-bar">
          जोन, सेक्टर एवं ब्रीफिंग विवरण
        </div>

        <div class="back-card back-zone-card">
          <div class="back-card-lbl back-zone-lbl">
            <span>जोन विवरण</span>
          </div>
          <div class="back-card-name back-zone-name">${escapeHtml(cleanZone || 'जोन-01')}</div>
          <div class="back-divider"></div>
          <div class="back-incharge-name">जोनल प्रभारी: <strong>${escapeHtml(zonalInfo.name || 'नियुक्त अधिकारी')}</strong></div>
          ${duty.zonal_sahyogarth ? `
            <div style="font-size:10.5px;color:#1e40af;font-weight:700;margin-top:2px;">सहयोगार्थ: <strong>${escapeHtml(duty.zonal_sahyogarth)}</strong></div>
          ` : ''}
          ${zonalMobile ? `
            <div>
              <span class="back-mob-pill back-zone-mob">📞 ${escapeHtml(zonalMobile)}</span>
            </div>
          ` : ''}
        </div>

        <div class="back-card back-sector-card">
          <div class="back-card-lbl back-sector-lbl">
            <span>सेक्टर विवरण</span>
          </div>
          <div class="back-card-name back-sector-name">${escapeHtml(cleanSector || 'सेक्टर-01')}</div>
          <div class="back-divider"></div>
          <div class="back-incharge-name">सेक्टर प्रभारी: <strong>${escapeHtml(sectorInfo.name || 'नियुक्त अधिकारी')}</strong></div>
          ${duty.sector_sahyogarth ? `
            <div style="font-size:10.5px;color:#312e81;font-weight:700;margin-top:2px;">सहयोगार्थ: <strong>${escapeHtml(duty.sector_sahyogarth)}</strong></div>
          ` : ''}
          ${sectorMobile ? `
            <div>
              <span class="back-mob-pill back-sector-mob">📞 ${escapeHtml(sectorMobile)}</span>
            </div>
          ` : ''}
        </div>

        <div class="back-briefing-box">
          <div class="back-briefing-lbl">📍 ब्रीफिंग स्थल व समय</div>
          <div class="back-briefing-val">${escapeHtml(activeBriefing || 'दिनाँक- 01.11.2026 को पूर्वान्ह 13.00 बजे श्रीराम कथा पार्क नया घाट, अयोध्या')}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates HTML for a Single-Sided VVIP Security Pass (for 4-in-1 and 6-in-1 Bulk Grid Printing)
 */
export function renderVvipCardHtml({
  duty,
  allRecords = [],
  eventTitle = '',
  eventSubtitle = '',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  customNote = '',
  isNoteEnabled = true,
  customBriefing = '',
  isBriefingEnabled = true,
  layoutMode = 4,
  isA4 = false
}) {
  if (!duty) return '';

  const isCompact = Number(layoutMode) === 6;
  const activeBriefing = (isBriefingEnabled !== false && customBriefing)
    ? customBriefing
    : (isBriefingEnabled ? (duty.briefing_place || '') : '');

  // 1. Resolve Zone & Zonal Incharge
  let cleanZone = (duty.zone || '').trim();
  let cleanZonalIncharge = (
    duty.zonal_incharge || 
    duty.zonal || 
    duty.zonal_officer || 
    duty.zonalOfficer || 
    duty.zone_incharge || 
    duty.zonal_magistrate ||
    duty['जोनाल प्रभारी'] ||
    duty['जोनल प्रभारी'] ||
    ''
  ).trim();
  if (cleanZonalIncharge === '-') cleanZonalIncharge = '';

  if (!cleanZonalIncharge && cleanZone.includes('/')) {
    const parts = cleanZone.split('/');
    cleanZone = parts[0].trim();
    cleanZonalIncharge = parts.slice(1).join('/').trim();
  } else if (cleanZone.endsWith('/')) {
    cleanZone = cleanZone.replace(/\/+\s*$/, '').trim();
  }

  if (!cleanZonalIncharge && cleanZone && Array.isArray(allRecords)) {
    const matchedZoneRec = allRecords.find(r => 
      r && 
      (r.zone || '').trim().toLowerCase() === cleanZone.toLowerCase() && 
      (r.zonal_incharge || r.zonal || r.zonal_officer || r.zonalOfficer || r.zone_incharge || r['जोनाल प्रभारी'] || r['जोनल प्रभारी'])
    );
    if (matchedZoneRec) {
      cleanZonalIncharge = (
        matchedZoneRec.zonal_incharge || 
        matchedZoneRec.zonal || 
        matchedZoneRec.zonal_officer || 
        matchedZoneRec.zonalOfficer || 
        matchedZoneRec.zone_incharge || 
        matchedZoneRec['जोनाल प्रभारी'] || 
        matchedZoneRec['जोनल प्रभारी'] || 
        ''
      ).trim();
    }
  }

  // 2. Resolve Sector & Sector Incharge
  let cleanSector = (duty.sector || '').trim();
  let cleanSectorIncharge = (
    duty.sector_incharge || 
    duty.sector_officer || 
    duty.sectorOfficer || 
    duty.sectorIncharge || 
    duty.sector_magistrate || 
    duty.sectorMagistrate || 
    duty.incharge || 
    duty['सेक्टर प्रभारी'] ||
    duty['सेक्टर अधिकारी'] ||
    duty['सेक्टर मजिस्ट्रेट'] ||
    duty['प्रभारी'] ||
    ''
  ).trim();
  if (cleanSectorIncharge === '-') cleanSectorIncharge = '';

  if (!cleanSectorIncharge && cleanSector.includes('/')) {
    const parts = cleanSector.split('/');
    cleanSector = parts[0].trim();
    cleanSectorIncharge = parts.slice(1).join('/').trim();
  } else if (cleanSector.endsWith('/')) {
    cleanSector = cleanSector.replace(/\/+\s*$/, '').trim();
  }

  if (!cleanSectorIncharge && cleanSector && Array.isArray(allRecords)) {
    const matchedSectorRec = allRecords.find(r => {
      if (!r) return false;
      const rSec = (r.sector || '').trim().toLowerCase();
      const currSec = cleanSector.toLowerCase();
      const isSame = rSec === currSec || rSec.startsWith(currSec) || currSec.startsWith(rSec);
      const inc = (
        r.sector_incharge || 
        r.sector_officer || 
        r.sectorOfficer || 
        r.sectorIncharge || 
        r.sector_magistrate || 
        r.sectorMagistrate || 
        r.incharge || 
        r['सेक्टर प्रभारी'] || 
        r['सेक्टर अधिकारी'] || 
        r['सेक्टर मजिस्ट्रेट'] || 
        r['प्रभारी'] || 
        ''
      ).trim();
      return isSame && inc && inc !== '-';
    });
    if (matchedSectorRec) {
      cleanSectorIncharge = (
        matchedSectorRec.sector_incharge || 
        matchedSectorRec.sector_officer || 
        matchedSectorRec.sectorOfficer || 
        matchedSectorRec.sectorIncharge || 
        matchedSectorRec.sector_magistrate || 
        matchedSectorRec.sectorMagistrate || 
        matchedSectorRec.incharge || 
        matchedSectorRec['सेक्टर प्रभारी'] || 
        matchedSectorRec['सेक्टर अधिकारी'] || 
        matchedSectorRec['सेक्टर मजिस्ट्रेट'] || 
        matchedSectorRec['प्रभारी'] || 
        ''
      ).trim();
    }
  }

  const zonalInfo = parseIncharge(cleanZonalIncharge);
  const sectorInfo = parseIncharge(cleanSectorIncharge);
  const zonalMobile = zonalInfo.mobile || duty.zonal_mobile || duty.zone_mobile || '';
  const sectorMobile = sectorInfo.mobile || duty.sector_mobile || '';

  const effectiveRank = duty?.rank ? resolvePoliceRank(duty.rank) : '';
  const displayCleanName = stripRankFromName(duty?.name) || '-';

  const cleanPno = (duty.pno && !String(duty.pno).toUpperCase().startsWith('DUTY-'))
    ? String(duty.pno)
    : (duty.id && !String(duty.id).toUpperCase().startsWith('DUTY-') && String(duty.id).length <= 12)
      ? String(duty.id)
      : null;

  const photoHtml = duty.photo
    ? `<img src="${duty.photo}" style="width:100%;height:100%;object-fit:cover;" />`
    : `
      <div style="padding:2px;text-align:center;color:#94a3b8;">
        <svg style="width:${isCompact ? '16px' : '20px'};height:${isCompact ? '16px' : '20px'};margin:0 auto;display:block;stroke:#94a3b8;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <div style="font-size:${isCompact ? '6.5px' : '7.5px'};font-weight:700;color:#475569;margin-top:1px;">फोटो</div>
      </div>
    `;

  const signHtml = signatureImg
    ? `<img src="${signatureImg}" style="height:${isCompact ? '16px' : '20px'};max-width:${isCompact ? '65px' : '80px'};object-fit:contain;margin-left:auto;" />`
    : `<div style="font-family:serif;font-style:italic;font-size:${isCompact ? '9px' : '10.5px'};color:#475569;line-height:1;">(हस्ताक्षरित)</div>`;

  let qrSvgHtml = '';
  try {
    const authCode = (duty.id && !String(duty.id).toUpperCase().startsWith('DUTY-') ? String(duty.id) : '') || `AUTH-${Math.abs(hashCode(duty.name + (duty.mobile || '') + (duty.duty_place || ''))).toString(36).toUpperCase()}`;

    const searchParam = (duty.mobile || duty.pno || duty.id || '').trim();
    const qrDirectUrl = typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}/?search=${encodeURIComponent(searchParam)}`
      : '';

    const qrPayload = qrDirectUrl || [
      `DUTY_PASS: ${duty.id || ''}`,
      `PNO: ${duty.pno || ''}`,
      `MOB: ${duty.mobile || ''}`,
      `NAME: ${duty.name || ''}`,
      `AUTH: ${authCode}`
    ].join('\n');

    qrSvgHtml = renderToString(
      React.createElement(QRCodeSVG, {
        value: qrPayload,
        size: isCompact ? 28 : 36,
        level: 'M',
        includeMargin: false
      })
    );
  } catch (e) {
    qrSvgHtml = '';
  }

  const phoneIconSvg = `
    <svg style="width:${isCompact ? '10px' : '12px'};height:${isCompact ? '10px' : '12px'};stroke:#047857;display:inline-block;vertical-align:middle;margin-right:2px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
  `;

  const zoneCode = cleanZone ? cleanZone.split(/[(/]/)[0].trim() : '01';

  return `
    <div class="vvip-single-card ${isCompact ? 'compact-6' : ''}">
      <!-- Header -->
      <div class="single-header ${isCompact ? 'compact-6' : ''}">
        ${getUpPoliceLogoSvgString(isCompact ? 22 : 28)}
        <div class="single-header-center">
          <div class="single-header-sub">उत्तर प्रदेश पुलिस • अयोध्या</div>
          <h1 class="single-header-title">${escapeHtml(eventTitle || 'मा० मुख्यमंत्री उ०प्र० अयोध्या आगमन')}</h1>
          <div><span class="single-header-badge">${escapeHtml(eventSubtitle || 'ड्यूटी पास - 2026')}</span></div>
        </div>
        ${getUpPoliceLogoSvgString(isCompact ? 22 : 28)}
      </div>

      <!-- Officer Profile Row -->
      <div class="single-profile-row">
        <div class="single-photo-frame">${photoHtml}</div>
        <div class="single-officer-details">
          <div class="single-name-row">
            <span class="single-name-text">${escapeHtml(displayCleanName || duty.name || '-')}</span>
          </div>
          <div>
            <span class="single-mobile-pill">${phoneIconSvg} ${escapeHtml(duty.mobile || 'अनुपलब्ध')}</span>
          </div>
          <div class="single-meta-row">
            मूल तैनाती: <strong>${escapeHtml(duty.posting || '-')}</strong> ${duty.district ? `(${escapeHtml(duty.district)})` : ''}
            ${cleanPno ? ` | P.No: <strong>${escapeHtml(cleanPno)}</strong>` : ''}
          </div>
        </div>
      </div>

      <!-- Spotlight Duty Box -->
      <div class="single-spotlight-box">
        <div class="single-spotlight-lbl">ड्यूटी स्थल</div>
        <div class="single-spotlight-val">${escapeHtml(duty.duty_place || '-')}</div>
      </div>

      <!-- Time Bar -->
      <div class="single-time-bar">
        <div>दिनाँक व समय: <strong>${escapeHtml(duty.shift || 'प्रातः 08:00 बजे से')}</strong></div>
        ${(duty.booth_no || duty.vehicle_no) ? `
          <div>
            ${duty.booth_no ? `<span style="background:#dbeafe;color:#1e40af;padding:0.5px 4px;border-radius:3px;font-weight:bold;margin-right:2px;">बूथ: ${escapeHtml(duty.booth_no)}</span>` : ''}
            ${duty.vehicle_no ? `<span style="background:#fef3c7;color:#92400e;padding:0.5px 4px;border-radius:3px;font-weight:bold;">वाहन: ${escapeHtml(duty.vehicle_no)}</span>` : ''}
          </div>
        ` : ''}
      </div>

      <!-- Operational Grid: Zone and Sector Side-by-Side Cards -->
      <div class="single-ops-grid">
        <div class="single-op-card single-zone-card">
          <div class="single-op-header" style="color:#1e40af;">
            <span>जोन</span>
            <span style="font-size:7px;background:#dbeafe;padding:0.5px 3px;border-radius:2px;">ZONE</span>
          </div>
          <div class="single-op-name" style="color:#172554;">${escapeHtml(cleanZone || 'जोन-01')}</div>
          <div class="single-incharge-text">प्रभारी: <strong>${escapeHtml(zonalInfo.name || 'नियुक्त अधिकारी')}</strong></div>
          ${zonalMobile ? `<div class="single-incharge-mob">📞 ${escapeHtml(zonalMobile)}</div>` : ''}
        </div>

        <div class="single-op-card single-sector-card">
          <div class="single-op-header" style="color:#3730a3;">
            <span>सेक्टर</span>
            <span style="font-size:7px;background:#e0e7ff;padding:0.5px 3px;border-radius:2px;">SECTOR</span>
          </div>
          <div class="single-op-name" style="color:#1e1b4b;">${escapeHtml(cleanSector || 'सेक्टर-01')}</div>
          <div class="single-incharge-text">प्रभारी: <strong>${escapeHtml(sectorInfo.name || 'नियुक्त अधिकारी')}</strong></div>
          ${sectorMobile ? `<div class="single-incharge-mob">📞 ${escapeHtml(sectorMobile)}</div>` : ''}
        </div>
      </div>

      <!-- Briefing Box -->
      ${activeBriefing ? `
        <div class="single-briefing-box">
          📍 <strong>ब्रीफिंग:</strong> ${escapeHtml(activeBriefing)}
        </div>
      ` : ''}

      <!-- Security Footer -->
      <div class="single-footer-bar" style="display:flex;justify-content:space-between;align-items:flex-end;width:100%;margin-top:auto;box-sizing:border-box;">
        <div style="display:flex;align-items:center;gap:4px;text-align:left;">
          <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:3px;padding:1px;line-height:0;">${qrSvgHtml}</div>
          <div style="text-align:left;">
            <div style="font-size:${isCompact ? '7px' : '8px'};font-weight:800;color:#065f46;">● सत्यापित पास</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:${isCompact ? '8.5px' : '10px'};font-weight:800;color:#1e293b;">ID: ${escapeHtml(cleanPno || duty.id || 'DUTY-0001')}</div>
          </div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;">
          ${signHtml}
          <div style="font-size:${isCompact ? '8px' : '9.5px'};font-weight:800;color:#020617;line-height:1.15;">वरिष्ठ पुलिस अधीक्षक,</div>
          <div style="font-size:${isCompact ? '8px' : '9.5px'};font-weight:800;color:#020617;line-height:1.15;">अयोध्या</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Bulk Print Engine: Supports 2-in-1 Foldable, 4-in-1 Grid, and 6-in-1 Grid
 */
export function printLegalBulk({
  records = [],
  eventTitle = '',
  eventSubtitle = '',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  customNote = '',
  isNoteEnabled = true,
  customBriefing = '',
  isBriefingEnabled = true,
  layoutMode = 6,
  paperSize = 'legal'
}) {
  try {
    const validRecords = (records || []).filter(r => r && (r.name || r.id));
    if (validRecords.length === 0) {
      alert('प्रिंट करने हेतु कोई रिकॉर्ड उपलब्ध नहीं है।');
      return;
    }

    const isA4 = paperSize === 'a4';
    const effectiveMode = Number(layoutMode) || 2;
    const passesPerPage = effectiveMode === 6 ? 3 : (effectiveMode === 4 ? 2 : 1);
    const totalPages = Math.ceil(validRecords.length / passesPerPage);

    let pagesHtml = '';

    for (let p = 0; p < totalPages; p++) {
      const pageRecords = validRecords.slice(p * passesPerPage, (p + 1) * passesPerPage);

      pagesHtml += `<div class="foldable-print-page">`;
      for (let i = 0; i < pageRecords.length; i++) {
        const duty = pageRecords[i];
        pagesHtml += renderFoldablePassUnitHtml({
          duty,
          allRecords: records,
          eventTitle,
          eventSubtitle,
          signatureImg,
          signatoryText,
          customNote,
          isNoteEnabled,
          customBriefing,
          isBriefingEnabled
        });
      }
      pagesHtml += `</div>`;
    }

    const paperLabel = isA4 ? 'A4' : 'Legal';

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="hi">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(eventTitle || 'ड्यूटी पास')} - Bulk Print (${paperLabel} - ${effectiveMode}in1)</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
        <style>
          ${getSharedFoldablePassStyles(isA4)}
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = function() {
            if (document.fonts) {
              document.fonts.ready.then(function() {
                setTimeout(function() { window.print(); }, 400);
              });
            } else {
              setTimeout(function() { window.print(); }, 400);
            }
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('पॉप-अप ब्लॉक हो गया है। कृपया ब्राउज़र में पॉप-अप की अनुमति दें।');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();
  } catch (err) {
    console.error('Print Error:', err);
    alert(`प्रिंट इंजन त्रुटि: ${err.message}`);
  }
}

/**
 * Dedicated Single Officer Foldable Pass Print Engine
 */
export function printIndividualPass({
  duty,
  allRecords = [],
  eventTitle = '',
  eventSubtitle = '',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  customNote = '',
  isNoteEnabled = true,
  customBriefing = '',
  isBriefingEnabled = true
}) {
  if (!duty) return;

  try {
    const fullHtml = generateIndividualPassHtml({
      duty,
      allRecords,
      eventTitle,
      eventSubtitle,
      signatureImg,
      signatoryText,
      customNote,
      isNoteEnabled,
      customBriefing,
      isBriefingEnabled
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('पॉप-अप ब्लॉक हो गया है। कृपया ब्राउज़र में पॉप-अप की अनुमति दें।');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(fullHtml);
    printWindow.document.close();
  } catch (err) {
    console.error('Individual Pass Print Error:', err);
    alert(`प्रिंट त्रुटि: ${err.message}`);
  }
}

/**
 * HTML Generator for Individual Foldable Duty Pass (180mm x 128mm)
 */
export function generateIndividualPassHtml({
  duty,
  allRecords = [],
  eventTitle = '',
  eventSubtitle = '',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  customNote = '',
  isNoteEnabled = true,
  customBriefing = '',
  isBriefingEnabled = true
}) {
  if (!duty) return '';

  const isA4 = true;
  const passHtml = renderFoldablePassUnitHtml({
    duty,
    allRecords,
    eventTitle,
    eventSubtitle,
    signatureImg,
    signatoryText,
    customNote,
    isNoteEnabled,
    customBriefing,
    isBriefingEnabled
  });

  return `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(duty.name || 'Duty Pass')} - अयोध्या पुलिस ड्यूटी पास</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
      <style>
        ${getSharedFoldablePassStyles(isA4)}
      </style>
    </head>
    <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f8fafc;padding:10px;">
      ${passHtml}
      <script>
        window.onload = function() {
          if (document.fonts) {
            document.fonts.ready.then(function() {
              setTimeout(function() { window.print(); }, 400);
            });
          } else {
            setTimeout(function() { window.print(); }, 400);
          }
        };
      </script>
    </body>
    </html>
  `;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
