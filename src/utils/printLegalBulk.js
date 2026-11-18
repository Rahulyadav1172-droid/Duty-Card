// Dedicated high-speed isolated Legal print engine supporting Election 2-in-1 (with Co-deployed Force), 4-in-1, 6-in-1 layouts, and 4-in-1 Lanyard Pouch ID Card
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { resolvePoliceRank, stripRankFromName } from './rankResolver';
import { ELECTION_DUTY_CARD_INSTRUCTIONS, ELECTION_CUG_DIRECTORY } from '../data/electionStandardData';

/**
 * Renders the Front Face of the 4-in-1 Compact Visiting Card / Pocket ID Badge
 * Compact visiting card size (~103mm x 85mm):
 * UP Police Header, Photo, Officer Name, Rank, Mobile, PNO, Posting, Prominent Duty Place, Shift, QR, SSP Signature.
 */
export function renderIdBadgeHorizontalFrontHtml({
  duty,
  eventTitle = '',
  eventSubtitle = '',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  phoneSvg = ''
}) {
  if (!duty) {
    return `
      <div class="id-badge-h-card empty-slot">
        <div class="empty-text">स्थान रिक्त</div>
      </div>
    `;
  }

  const cleanPno = (duty.pno && !String(duty.pno).toUpperCase().startsWith('DUTY-'))
    ? String(duty.pno)
    : (duty.id && !String(duty.id).toUpperCase().startsWith('DUTY-') && String(duty.id).length <= 12)
      ? String(duty.id)
      : null;

  const cleanOfficerName = (duty.name || '').trim()
    .replace(/,\s*\d{10}\b/g, '')
    .replace(/\b\d{10}\b/g, '')
    .replace(/[,।]?\s*नं0?[-:]?\s*$/g, '')
    .replace(/[,।]?\s*नं\s*\(?.*$/g, '')
    .replace(/,\s*$/, '')
    .trim() || duty.name;

  const effectiveRank = resolvePoliceRank(duty.rank, cleanOfficerName);
  const displayCleanName = stripRankFromName(cleanOfficerName);

  const photoHtml = duty.photo
    ? `<img src="${duty.photo}" class="officer-photo" style="width:100%;height:100%;object-fit:cover;" />`
    : `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#64748b;text-align:center;">
        <svg style="width:18px;height:18px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span style="font-size:6px;font-weight:bold;line-height:1;margin-top:1px;">फोटो</span>
      </div>
    `;

  const signHtml = signatureImg
    ? `<img src="${signatureImg}" style="height:18px;max-width:70px;object-fit:contain;margin-left:auto;" />`
    : `<div style="font-style:italic;font-size:7px;color:#475569;">(हस्ताक्षरित)</div>`;

  let qrSvgHtml = '';
  try {
    const authCode = cleanPno || (duty.id && !String(duty.id).toUpperCase().startsWith('DUTY-') ? String(duty.id) : '') || `AUTH-${Math.abs(hashCode(duty.name + (duty.mobile || '') + (duty.duty_place || ''))).toString(36).toUpperCase()}`;
    const qrPayload = [
      `नाम: ${(duty.name || '').trim()}`,
      `मो०: ${(duty.mobile || '').trim()}`,
      `स्थान: ${(duty.duty_place || '').trim()}`,
      `ID: ${authCode}`
    ].join('\n');

    qrSvgHtml = renderToString(
      React.createElement(QRCodeSVG, {
        value: qrPayload,
        size: 28,
        level: 'M',
        includeMargin: false,
        style: { width: '100%', height: '100%', display: 'block' }
      })
    );
  } catch (e) {
    qrSvgHtml = '';
  }

  const cleanDutyPlace = (duty.duty_place || '-').trim();
  const dutyPlaceFontSize = cleanDutyPlace.length > 35 ? '13.5px' : (cleanDutyPlace.length > 20 ? '16px' : '18px');
  const cleanOfficerDisplay = displayCleanName || duty.name || '';
  const officerNameFontSize = cleanOfficerDisplay.length > 25 ? '13px' : '15.5px';

  return `
    <div class="id-badge-h-card id-badge-h-front">
      <!-- 1. Top Header Matching Standard Duty Cards -->
      <div style="background:#ffffff;border-bottom:2px solid #0b132b;padding:2.5px 6px;display:flex;align-items:center;justify-content:space-between;gap:6px;">
        <img src="/badge.png" alt="UP Police" style="width:26px;height:26px;object-fit:contain;flex-shrink:0;" />
        <div style="text-align:center;flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:900;color:#000000;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escapeHtml(eventTitle || 'मेला चौदह कोसी परिक्रमा')}
          </div>
          <div style="font-size:10px;font-weight:800;color:#333333;line-height:1.1;margin-top:1px;">
            ${escapeHtml(eventSubtitle || 'ड्यूटी कार्ड अयोध्या-2026')}
          </div>
        </div>
        <img src="/badge.png" alt="UP Police" style="width:26px;height:26px;object-fit:contain;flex-shrink:0;" />
      </div>

      <!-- Main Body Container -->
      <div style="padding:4px 7px;display:flex;flex-direction:column;justify-content:space-between;flex:1;gap:3px;box-sizing:border-box;">
        <!-- 2. Officer Profile Strip (Horizontal: Photo Left + Info Right) -->
        <div style="display:flex;align-items:stretch;gap:6px;background:#f8fafc;border:1.2px solid #cbd5e1;border-radius:4px;padding:3.5px 6px;">
          <!-- Photo Frame -->
          <div style="width:38px;height:46px;border:1.2px dashed #64748b;border-radius:4px;background:#ffffff;overflow:hidden;flex-shrink:0;">
            ${photoHtml}
          </div>

          <!-- Officer Metadata -->
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
                <span style="font-size:${officerNameFontSize};font-weight:900;color:#0f172a;line-height:1.15;">
                  ${escapeHtml(cleanOfficerDisplay)}
                </span>
              </div>

              <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;color:#1e3a8a;margin-top:1.5px;">
                <span style="display:flex;align-items:center;gap:2px;font-family:monospace;font-size:11.5px;font-weight:900;">
                  ${phoneSvg} ${escapeHtml(duty.mobile || '-')}
                </span>
                ${cleanPno ? `
                  <span style="color:#475569;font-family:monospace;font-size:9.5px;">PNO: <strong>${escapeHtml(cleanPno)}</strong></span>
                ` : ''}
              </div>
            </div>

            <div style="font-size:10px;color:#334155;border-top:1px solid #cbd5e1;padding-top:1.5px;margin-top:1.5px;line-height:1.15;">
              मूल तैनाती: <strong style="color:#0f172a;">${escapeHtml(duty.posting || duty.posting_place || duty.thana || (duty.district ? 'जनपद ' + duty.district : '-'))}</strong>
            </div>
          </div>
        </div>

        <!-- 3. HERO BANNER: ड्यूटी स्थल - Full Width (More Prominent Space) -->
        <div style="background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);border:1.5px solid #d97706;border-radius:4px;padding:3.5px 7px;text-align:center;">
          <div style="font-size:10px;font-weight:900;color:#92400e;letter-spacing:0.5px;">
            ड्यूटी स्थल
          </div>
          <div style="font-size:${dutyPlaceFontSize};font-weight:900;color:#78350f;line-height:1.25;margin-top:1.5px;">
            ${escapeHtml(cleanDutyPlace)}
          </div>
        </div>

        <!-- 4. दिनाँक व समय - Full Width (No Truncation) -->
        <div style="background:#f0fdf4;border:1.2px solid #86efac;border-radius:4px;padding:3px 7px;display:flex;justify-content:space-between;align-items:center;font-size:10.5px;">
          <span style="font-weight:900;color:#166534;">
            दिनाँक व समय:
          </span>
          <span style="font-weight:900;color:#0f172a;">
            ${escapeHtml(duty.shift || 'प्रातः 09:00 से समाप्ति तक')}
          </span>
        </div>

        <!-- 5. SECURITY & SIGNATURE FOOTER -->
        <div style="border-top:1.5px solid #0f172a;padding-top:3px;margin-top:auto;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:5px;">
            <div style="width:36px;height:36px;border:1px solid #94a3b8;border-radius:3px;background:#ffffff;display:flex;align-items:center;justify-content:center;padding:1px;box-sizing:border-box;flex-shrink:0;overflow:hidden;">
              ${qrSvgHtml}
            </div>
            <div style="display:flex;flex-direction:column;justify-content:center;gap:1.5px;">
              <div style="font-size:8.5px;font-weight:900;color:#166534;background:#dcfce7;border:0.8px solid #86efac;padding:1px 4px;border-radius:2px;white-space:nowrap;line-height:1;">
                ✓ अधिकृत पास
              </div>
              <div style="font-size:8.5px;font-family:monospace;color:#1e293b;font-weight:800;line-height:1;margin-top:1px;">
                ID: ${escapeHtml(cleanPno || duty.id || '-')}
              </div>
            </div>
          </div>

          <div style="text-align:center;line-height:1.15;">
            <div style="font-size:9.5px;font-weight:900;color:#475569;letter-spacing:0.5px;">अयोध्या पुलिस</div>
            <div style="font-size:7.5px;font-weight:800;color:#94a3b8;letter-spacing:0.8px;">AYODHYA POLICE</div>
          </div>

          <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;">
            ${signHtml}
            <div style="font-size:10px;font-weight:900;color:#020617;line-height:1.1;margin-top:1px;">
              ${escapeHtml(signatoryText || 'वरिष्ठ पुलिस अधीक्षक, अयोध्या')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders the Back Face of the 4-in-1 Compact Visiting Card / Pocket ID Badge
 * Compact visiting card size (~103mm x 85mm):
 * Header, Officer Mini Strip, Zone/Zonal incharge, Sector/Sector incharge, Briefing, Note (विशेष नोट), Sign-off.
 */
export function renderIdBadgeHorizontalBackHtml({
  duty,
  eventTitle = '',
  eventSubtitle = '',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  isNoteEnabled = true,
  customNote = '',
  isBriefingEnabled = true,
  customBriefing = '',
  phoneSvg = '',
  records = []
}) {
  if (!duty) {
    return `
      <div class="id-badge-h-card id-badge-h-back empty-slot">
        <div class="empty-text">स्थान रिक्त</div>
      </div>
    `;
  }

  const cleanPno = (duty.pno && !String(duty.pno).toUpperCase().startsWith('DUTY-'))
    ? String(duty.pno)
    : (duty.id && !String(duty.id).toUpperCase().startsWith('DUTY-') && String(duty.id).length <= 12)
      ? String(duty.id)
      : null;

  const cleanOfficerName = (duty.name || '').trim()
    .replace(/,\s*\d{10}\b/g, '')
    .replace(/\b\d{10}\b/g, '')
    .replace(/[,।]?\s*नं0?[-:]?\s*$/g, '')
    .replace(/[,।]?\s*नं\s*\(?.*$/g, '')
    .replace(/,\s*$/, '')
    .trim() || duty.name;

  const effectiveRank = resolvePoliceRank(duty.rank, cleanOfficerName);
  const displayCleanName = stripRankFromName(cleanOfficerName);

  const activeNote = (isNoteEnabled !== false && customNote) ? customNote : (isNoteEnabled ? (duty.note || '') : '');
  const activeBriefing = (isBriefingEnabled !== false && customBriefing) ? customBriefing : (isBriefingEnabled ? (duty.briefing_place || '') : '');

  // Clean & Parse Zone and Zonal Incharge
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
  if (cleanZonalIncharge && cleanZone.includes(cleanZonalIncharge)) {
    cleanZone = cleanZone.replace(cleanZonalIncharge, '').replace(/\/+\s*$/, '').trim();
  }

  if (!cleanZonalIncharge && cleanZone && Array.isArray(records)) {
    const matchedZone = records.find(r => 
      r && 
      (r.zone || '').trim().toLowerCase() === cleanZone.toLowerCase() && 
      (r.zonal_incharge || r.zonal || r.zonal_officer || r.zonalOfficer || r.zone_incharge || r['जोनाल प्रभारी'] || r['जोनल प्रभारी'])
    );
    if (matchedZone) {
      cleanZonalIncharge = (
        matchedZone.zonal_incharge || 
        matchedZone.zonal || 
        matchedZone.zonal_officer || 
        matchedZone.zonalOfficer || 
        matchedZone.zone_incharge || 
        matchedZone['जोनाल प्रभारी'] || 
        matchedZone['जोनल प्रभारी'] || 
        ''
      ).trim();
    }
  }

  // Clean & Parse Sector and Sector Incharge
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
  if (cleanSectorIncharge && cleanSector.includes(cleanSectorIncharge)) {
    cleanSector = cleanSector.replace(cleanSectorIncharge, '').replace(/\/+\s*$/, '').trim();
  }

  if (!cleanSectorIncharge && cleanSector && Array.isArray(records)) {
    const matchedSector = records.find(r => {
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
    if (matchedSector) {
      cleanSectorIncharge = (
        matchedSector.sector_incharge || 
        matchedSector.sector_officer || 
        matchedSector.sectorOfficer || 
        matchedSector.sectorIncharge || 
        matchedSector.sector_magistrate || 
        matchedSector.sectorMagistrate || 
        matchedSector.incharge || 
        matchedSector['सेक्टर प्रभारी'] || 
        matchedSector['सेक्टर अधिकारी'] || 
        matchedSector['सेक्टर मजिस्ट्रेट'] || 
        matchedSector['प्रभारी'] || 
        ''
      ).trim();
    }
  }

  const signHtml = signatureImg
    ? `<img src="${signatureImg}" style="height:20px;max-width:70px;object-fit:contain;margin-left:auto;" />`
    : `<div style="font-style:italic;font-size:7px;color:#475569;">(हस्ताक्षरित)</div>`;

  return `
    <div class="id-badge-h-card id-badge-h-back">
      <!-- 1. Top Header Matching Front Face & Standard Cards -->
      <div style="background:#ffffff;border-bottom:2px solid #0b132b;padding:3.5px 8px;display:flex;align-items:center;justify-content:space-between;gap:6px;">
        <img src="/badge.png" alt="UP Police" style="width:30px;height:30px;object-fit:contain;flex-shrink:0;" />
        <div style="text-align:center;flex:1;min-width:0;">
          <div style="font-size:16px;font-weight:900;color:#000000;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${escapeHtml(eventTitle || 'मेला चौदह कोसी परिक्रमा')}
          </div>
          <div style="font-size:10.5px;font-weight:800;color:#333333;line-height:1.1;margin-top:1px;">
            ${escapeHtml(eventSubtitle || 'ड्यूटी कार्ड अयोध्या-2026')}
          </div>
        </div>
        <img src="/badge.png" alt="UP Police" style="width:30px;height:30px;object-fit:contain;flex-shrink:0;" />
      </div>

      <!-- Main Body Container -->
      <div style="padding:4px 7px;display:flex;flex-direction:column;justify-content:space-between;flex:1;gap:3px;box-sizing:border-box;">
        <!-- 2. Zone Hierarchy Box (Full Width) -->
        <div style="background:#ffffff;border:1.2px solid #cbd5e1;border-radius:4px;padding:3px 7px;font-size:10px;line-height:1.35;">
          <div style="font-weight:900;color:#0f172a;border-bottom:0.8px solid #cbd5e1;padding-bottom:1.5px;margin-bottom:2px;font-size:11px;">
            जोन / जोनल प्रभारी
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <div style="padding-bottom:2px;border-bottom:1px dotted #94a3b8;">
              <span style="color:#64748b;font-weight:700;">जोन:</span> <strong style="color:#0f172a;font-weight:900;font-size:11.5px;">${escapeHtml(cleanZone || '-')}</strong>
            </div>
            ${cleanZonalIncharge ? `
              <div style="padding-top:1.5px;">
                <span style="color:#64748b;font-weight:700;">जोनल प्रभारी:</span> <strong style="color:#0369a1;font-weight:900;font-size:11px;">${escapeHtml(cleanZonalIncharge)}</strong>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 3. Sector Hierarchy Box (Full Width Below Zone) -->
        <div style="background:#ffffff;border:1.2px solid #cbd5e1;border-radius:4px;padding:3px 7px;font-size:10px;line-height:1.35;">
          <div style="font-weight:900;color:#0f172a;border-bottom:0.8px solid #cbd5e1;padding-bottom:1.5px;margin-bottom:2px;font-size:11px;">
            सेक्टर / सेक्टर प्रभारी
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <div style="padding-bottom:2px;border-bottom:1px dotted #94a3b8;">
              <span style="color:#64748b;font-weight:700;">सेक्टर:</span> <strong style="color:#0f172a;font-weight:900;font-size:11.5px;">${escapeHtml(cleanSector || '-')}</strong>
            </div>
            ${cleanSectorIncharge ? `
              <div style="padding-top:1.5px;">
                <span style="color:#64748b;font-weight:700;">सेक्टर प्रभारी:</span> <strong style="color:#0369a1;font-weight:900;font-size:11px;">${escapeHtml(cleanSectorIncharge)}</strong>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- 4. ब्रीफिंग स्थल -->
        <div style="background:#f0f9ff;border:1.2px solid #bae6fd;border-radius:4px;padding:3px 7px;font-size:10.5px;display:flex;align-items:flex-start;gap:6px;line-height:1.3;">
          <span style="font-weight:900;color:#0369a1;white-space:nowrap;">ब्रीफिंग स्थल:</span>
          <span style="font-weight:800;color:#0f172a;">${escapeHtml(activeBriefing || duty.briefing_place || customBriefing || '-')}</span>
        </div>

        <!-- 5. विशेष निर्देश -->
        <div style="background:#fffbeb;border:1.2px solid #fde68a;border-radius:4px;padding:3.5px 7px;font-size:10px;line-height:1.35;">
          <span style="font-weight:900;color:#92400e;">विशेष निर्देश: </span>
          <span style="color:#78350f;font-weight:700;">
            ${escapeHtml(activeNote) ? escapeHtml(activeNote) : 'आवंटित ड्यूटी पॉइंट पर समय से उपस्थित रहें व उच्चाधिकारियों के निर्देशों का पालन करें।'}
          </span>
        </div>

        <!-- 6. Centered Smart Cell Ayodhya Footer Box -->
        <div style="border:1px solid #0f172a;border-radius:3px;background:#ffffff;color:#000000;font-size:8px;font-weight:900;letter-spacing:0.8px;text-align:center;padding:2px 0;margin-top:auto;text-transform:uppercase;">
          DESIGN AND DEVELOPED BY SMART CELL AYODHYA
        </div>
      </div>
    </div>
  `;
}

export const renderIdBadgeFrontHtml = renderIdBadgeHorizontalFrontHtml;
export const renderIdBadgeBackHtml = renderIdBadgeHorizontalBackHtml;
export const renderIdBadgeHtml = renderIdBadgeHorizontalFrontHtml;

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
  layoutMode = 6, // 2 (Election Special with Co-force), 4, or 6 cards per page
  includeCoForce = true,
  paperSize = 'a4', // 'a4' | 'legal'
  includeBackSide = false,
  cardFormat = 'standard', // 'id_badge' (4-in-1 Legal Lanyard Polybag ID Badge) | 'standard'
  badgeLayoutMode = 'side_by_side' // 'side_by_side' (2 Officers / 4 Cards per Legal page: Front & Back side-by-side) | 'duplex'
}) {
  try {
    const validRecords = (records || []).filter(r => r && (r.name || r.id));
    if (validRecords.length === 0) {
      alert('प्रिंट करने हेतु कोई रिकॉर्ड उपलब्ध नहीं है।');
      return;
    }

    const isIdBadge = cardFormat === 'id_badge';
    const is2In1 = !isIdBadge && layoutMode === 2;
    const is4In1 = isIdBadge || layoutMode === 4;
    const CARDS_PER_PAGE = isIdBadge ? 4 : (is2In1 ? 2 : (is4In1 ? 4 : 6));
    const effectivePaperSize = isIdBadge ? 'legal' : paperSize;
    const totalPages = Math.ceil(validRecords.length / CARDS_PER_PAGE);

    // Modern crisp vector SVG icons (replacing old pixelated emojis)
    const phoneSvg = `
      <svg class="icon-phone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
      </svg>
    `;

    const usersSvg = `
      <svg class="icon-users" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    `;

    let pagesHtml = '';

    // =========================================================================
    // BRANCH A: DEDICATED 5-IN-1 LANYARD POUCH ID CARD (LEGAL)
    // 5 OFFICERS (5 FRONT + 5 BACK SIDES) = 10 CELLS PER LEGAL SHEET
    // =========================================================================
    if (isIdBadge) {
      const OFFICERS_PER_PAGE = 5;
      const totalPages = Math.ceil(validRecords.length / OFFICERS_PER_PAGE);

      for (let p = 0; p < totalPages; p++) {
        const pageRecords = validRecords.slice(p * OFFICERS_PER_PAGE, (p + 1) * OFFICERS_PER_PAGE);

        let rowCardsHtml = '';
        for (let r = 0; r < OFFICERS_PER_PAGE; r++) {
          const duty = pageRecords[r];

          const frontFace = duty
            ? renderIdBadgeHorizontalFrontHtml({
                duty,
                eventTitle,
                eventSubtitle,
                signatureImg,
                signatoryText,
                phoneSvg
              })
            : `<div class="id-badge-h-card empty-slot"><div class="empty-text">स्थान रिक्त</div></div>`;

          const backFace = duty
            ? renderIdBadgeHorizontalBackHtml({
                duty,
                eventTitle,
                eventSubtitle,
                signatureImg,
                signatoryText,
                isNoteEnabled,
                customNote,
                isBriefingEnabled,
                customBriefing,
                phoneSvg,
                records: validRecords
              })
            : `<div class="id-badge-h-card id-badge-h-back empty-slot"><div class="empty-text">स्थान रिक्त</div></div>`;

          rowCardsHtml += frontFace + backFace;
        }

        pagesHtml += `
          <div class="legal-page page-id-badge-5in1">
            <div class="cut-line-v-center"></div>
            <div class="cut-line-h cut-line-h-1">
              <span class="cut-badge-h">✂️ यहां से काटें (Cut across)</span>
            </div>
            <div class="cut-line-h cut-line-h-2">
              <span class="cut-badge-h">✂️ यहां से काटें (Cut across)</span>
            </div>
            <div class="cut-line-h cut-line-h-3">
              <span class="cut-badge-h">✂️ यहां से काटें (Cut across)</span>
            </div>
            <div class="cut-line-h cut-line-h-4">
              <span class="cut-badge-h">✂️ यहां से काटें (Cut across)</span>
            </div>
            ${rowCardsHtml}
          </div>
        `;
      }
    } else {
      // =========================================================================
      // BRANCH B: STANDARD 2 / 4 / 6 IN 1 ROSTER CARD FORMAT
      // =========================================================================
      for (let p = 0; p < totalPages; p++) {
        const pageRecords = validRecords.slice(p * CARDS_PER_PAGE, (p + 1) * CARDS_PER_PAGE);

        let cardsHtml = '';
        for (let c = 0; c < CARDS_PER_PAGE; c++) {
        const duty = pageRecords[c];
        if (!duty) {
          cardsHtml += `
            <div class="duty-card empty-slot">
              <div class="empty-text">स्थान रिक्त</div>
            </div>
          `;
          continue;
        }

        const activeNote = (isNoteEnabled !== false && customNote) ? customNote : (isNoteEnabled ? (duty.note || '') : '');
        const activeBriefing = (isBriefingEnabled !== false && customBriefing) ? customBriefing : (isBriefingEnabled ? (duty.briefing_place || '') : '');

        // Find co-deployed force at the same duty place
        const coForceList = validRecords.filter(r => 
          r && 
          r.id !== duty.id && 
          (r.duty_place || '').trim() && 
          (r.duty_place || '').trim().toLowerCase() === (duty.duty_place || '').trim().toLowerCase()
        );

        const photoHtml = duty.photo
          ? `<img src="${duty.photo}" class="officer-photo" />`
          : `
            <div class="photo-placeholder">
              <svg class="photo-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>पासपोर्ट फोटो</span>
            </div>
          `;

        const signHtml = signatureImg
          ? `<img src="${signatureImg}" class="sign-img" />`
          : `<div class="sign-text">(हस्ताक्षरित)</div>`;

        // Exact QR Code Content requested: name, mobile, mul tainati, district, duty point, auth code
        let qrSvgHtml = '';
        try {
          const authCode = (duty.id && !String(duty.id).toUpperCase().startsWith('DUTY-') ? String(duty.id) : '') || `AUTH-${Math.abs(hashCode(duty.name + (duty.mobile || '') + (duty.duty_place || ''))).toString(36).toUpperCase()}`;

          const qrPayload = [
            `नाम: ${(duty.name || '').trim()}`,
            `मोबाइल: ${(duty.mobile || '').trim()}`,
            `मूल तैनाती: ${(duty.posting || '').trim()}`,
            `जिला: ${(duty.district || '').trim()}`,
            `ड्यूटी पॉइंट: ${(duty.duty_place || '').trim()}`,
            `सत्यापन कोड: ${authCode}`
          ].join('\n');

          qrSvgHtml = renderToString(
            React.createElement(QRCodeSVG, {
              value: qrPayload,
              size: is2In1 ? 38 : (is4In1 ? 30 : 24),
              level: 'L',
              includeMargin: false
            })
          );
        } catch (e) {
          qrSvgHtml = '';
        }

        // Clean PNO (omit synthetic IDs)
        const cleanPno = (duty.pno && !String(duty.pno).toUpperCase().startsWith('DUTY-'))
          ? String(duty.pno)
          : (duty.id && !String(duty.id).toUpperCase().startsWith('DUTY-') && String(duty.id).length <= 12)
            ? String(duty.id)
            : null;

        // Clean Officer Name (remove duplicate mobile or trailing number noise)
        const cleanOfficerName = (duty.name || '').trim()
          .replace(/,\s*\d{10}\b/g, '')
          .replace(/\b\d{10}\b/g, '')
          .replace(/[,।]?\s*नं0?[-:]?\s*$/g, '')
          .replace(/[,।]?\s*नं\s*\(?.*$/g, '')
          .replace(/,\s*$/, '')
          .trim() || duty.name;

        const effectiveRank = resolvePoliceRank(duty.rank, cleanOfficerName);
        const displayCleanName = stripRankFromName(cleanOfficerName);

        // Clean & Parse Zone and Zonal Incharge
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
        if (cleanZonalIncharge && cleanZone.includes(cleanZonalIncharge)) {
          cleanZone = cleanZone.replace(cleanZonalIncharge, '').replace(/\/+\s*$/, '').trim();
        }

        if (!cleanZonalIncharge && cleanZone && Array.isArray(records)) {
          const matchedZone = records.find(r => 
            r && 
            (r.zone || '').trim().toLowerCase() === cleanZone.toLowerCase() && 
            (r.zonal_incharge || r.zonal || r.zonal_officer || r.zonalOfficer || r.zone_incharge || r['जोनाल प्रभारी'] || r['जोनल प्रभारी'])
          );
          if (matchedZone) {
            cleanZonalIncharge = (
              matchedZone.zonal_incharge || 
              matchedZone.zonal || 
              matchedZone.zonal_officer || 
              matchedZone.zonalOfficer || 
              matchedZone.zone_incharge || 
              matchedZone['जोनाल प्रभारी'] || 
              matchedZone['जोनल प्रभारी'] || 
              ''
            ).trim();
          }
        }

        // Clean & Parse Sector and Sector Incharge
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
        if (cleanSectorIncharge && cleanSector.includes(cleanSectorIncharge)) {
          cleanSector = cleanSector.replace(cleanSectorIncharge, '').replace(/\/+\s*$/, '').trim();
        }

        if (!cleanSectorIncharge && cleanSector && Array.isArray(records)) {
          const matchedSector = records.find(r => {
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
          if (matchedSector) {
            cleanSectorIncharge = (
              matchedSector.sector_incharge || 
              matchedSector.sector_officer || 
              matchedSector.sectorOfficer || 
              matchedSector.sectorIncharge || 
              matchedSector.sector_magistrate || 
              matchedSector.sectorMagistrate || 
              matchedSector.incharge || 
              matchedSector['सेक्टर प्रभारी'] || 
              matchedSector['सेक्टर अधिकारी'] || 
              matchedSector['सेक्टर मजिस्ट्रेट'] || 
              matchedSector['प्रभारी'] || 
              ''
            ).trim();
          }
        }

        cleanZone = cleanZone.replace(/\/+\s*$/, '').trim();
        cleanSector = cleanSector.replace(/\/+\s*$/, '').trim();
        if (cleanZonalIncharge && cleanZone.includes(cleanZonalIncharge)) {
          cleanZone = cleanZone.replace(cleanZonalIncharge, '').replace(/\/+\s*$/, '').trim();
        }
        if (cleanSectorIncharge && cleanSector.includes(cleanSectorIncharge)) {
          cleanSector = cleanSector.replace(cleanSectorIncharge, '').replace(/\/+\s*$/, '').trim();
        }

        // Co-deployed Force logic (2-in-1: Dual sections for Police & Home Guard, max 10 each | Other formats: Single section, max 5)
        let coForceHtml = '';
        if (includeCoForce && coForceList.length > 0) {
          const isHomeGuardRecord = (r) => {
            if (!r) return false;
            const combined = `${r.rank || ''} ${r.designation || ''} ${r.name || ''} ${r.composite_details || ''} ${r.posting || ''} ${r.posting_place || ''} ${r.force_type || ''} ${r.category || ''} ${r.dept || ''}`.toLowerCase();
            return (
              combined.includes('होमगार्ड') || 
              combined.includes('हो०गा') || 
              combined.includes('हो0गा') || 
              combined.includes('होगा') || 
              combined.includes('पीआरडी') || 
              combined.includes('prd') || 
              /\bhg\b/i.test(combined) || 
              /\bhome\s*guard\b/i.test(combined) ||
              /ह[0०.]?गा[0०.]?/i.test(combined) ||
              /हो[0०.]?गा[0०.]?/i.test(combined)
            );
          };

          if (is2In1) {
            // =========================================================================
            // 2-IN-1 FORMAT ONLY: TWO DUAL SECTIONS (POLICE & HOMEGUARD), MAX 10 EACH
            // =========================================================================
            const policeList = coForceList.filter(r => !isHomeGuardRecord(r));
            const hgList = coForceList.filter(r => isHomeGuardRecord(r));

            const maxVisible2in1 = 10;
            const dispPolice = policeList.slice(0, maxVisible2in1);
            const remPolice = policeList.length - dispPolice.length;

            const dispHg = hgList.slice(0, maxVisible2in1);
            const remHg = hgList.length - dispHg.length;

            const renderCoRows = (list, isHgTable = false) => {
              if (!list || list.length === 0) {
                return `<tr><td colspan="4" style="text-align:center;padding:7px 4px;color:#64748b;font-style:italic;font-size:10.5px;">इस पॉइंट पर ${isHgTable ? 'होमगार्ड' : 'पुलिस'} बल तैनात नहीं है</td></tr>`;
              }
              return list.map((colleague, cIdx) => {
                let cleanColleagueName = (colleague.name || '').trim()
                  .replace(/,\s*\d{10}\b/g, '')
                  .replace(/\b\d{10}\b/g, '')
                  .replace(/[,।]?\s*नं0?[-:]?\s*$/g, '')
                  .replace(/[,।]?\s*नं\s*\(?.*$/g, '')
                  .replace(/,\s*$/, '')
                  .trim();

                const postingStr = (colleague.posting || colleague.posting_place || colleague.thana || '').trim();
                const districtStr = (colleague.district || '').trim();
                let fullPosting = postingStr;
                if (districtStr && !fullPosting.includes(districtStr)) {
                  fullPosting = fullPosting ? `${fullPosting} (${districtStr})` : districtStr;
                }
                if (!fullPosting) fullPosting = '-';

                return `
                  <tr>
                    <td class="co-td-idx" style="width:20px;text-align:center;">${cIdx + 1}</td>
                    <td class="co-td-name"><strong>${escapeHtml(cleanColleagueName || '-')}</strong></td>
                    <td class="co-td-mob font-mono">${phoneSvg}<span>${escapeHtml(colleague.mobile || '-')}</span></td>
                    <td class="co-td-post">${escapeHtml(fullPosting)}</td>
                  </tr>
                `;
              }).join('');
            };

            coForceHtml = `
              <div class="co-force-dual-grid">
                <!-- 1. सहयोगार्थ पुलिस बल (अधिकतम 10) -->
                <div class="co-force-container">
                  <div class="co-force-header">
                    <div class="co-hdr-title">
                      ${usersSvg}
                      <span>सहयोगार्थ पुलिस बल:</span>
                    </div>
                    <span class="co-count font-mono">कुल: ${policeList.length} जवान</span>
                  </div>
                  <table class="co-force-table">
                    <thead>
                      <tr>
                        <th style="width:20px;text-align:center;">क्र०</th>
                        <th>पद व नाम</th>
                        <th style="width:95px;">मोबाइल नंबर</th>
                        <th>मूल तैनाती (जनपद)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${renderCoRows(dispPolice, false)}
                    </tbody>
                  </table>
                  ${remPolice > 0 ? `
                    <div class="co-more-note">
                      और भी सहयोगार्थ हैं......
                    </div>
                  ` : ''}
                </div>

                <!-- 2. सहयोगार्थ होमगार्ड बल (अधिकतम 10) -->
                <div class="co-force-container">
                  <div class="co-force-header" style="background:#fef3c7;border-bottom-color:#fde68a;">
                    <div class="co-hdr-title" style="color:#92400e;">
                      ${usersSvg}
                      <span>सहयोगार्थ होमगार्ड बल:</span>
                    </div>
                    <span class="co-count font-mono" style="color:#b45309;">कुल: ${hgList.length} जवान</span>
                  </div>
                  <table class="co-force-table">
                    <thead>
                      <tr>
                        <th style="width:20px;text-align:center;">क्र०</th>
                        <th>पद व नाम</th>
                        <th style="width:95px;">मोबाइल नंबर</th>
                        <th>मूल तैनाती (जनपद)</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${renderCoRows(dispHg, true)}
                    </tbody>
                  </table>
                  ${remHg > 0 ? `
                    <div class="co-more-note">
                      और भी सहयोगार्थ हैं......
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          } else {
            // =========================================================================
            // STANDARD FORMAT (4-in-1, 6-in-1, id_badge): SINGLE TABLE (MAX 5)
            // =========================================================================
            const maxVisible = 5;
            const displayedCoForce = coForceList.slice(0, maxVisible);
            const remainingCount = coForceList.length - displayedCoForce.length;

            const coRows = displayedCoForce.map((colleague, cIdx) => {
              let cleanColleagueName = (colleague.name || '').trim()
                .replace(/,\s*\d{10}\b/g, '')
                .replace(/\b\d{10}\b/g, '')
                .replace(/[,।]?\s*नं0?[-:]?\s*$/g, '')
                .replace(/[,।]?\s*नं\s*\(?.*$/g, '')
                .replace(/,\s*$/, '')
                .trim();

              const postingStr = (colleague.posting || colleague.posting_place || colleague.thana || '').trim();
              const districtStr = (colleague.district || '').trim();
              let fullPosting = postingStr;
              if (districtStr && !fullPosting.includes(districtStr)) {
                fullPosting = fullPosting ? `${fullPosting} (${districtStr})` : districtStr;
              }
              if (!fullPosting) fullPosting = '-';

              return `
                <tr>
                  <td class="co-td-idx">${cIdx + 1}</td>
                  <td class="co-td-name"><strong>${escapeHtml(cleanColleagueName || '-')}</strong></td>
                  <td class="co-td-mob font-mono">${phoneSvg}<span>${escapeHtml(colleague.mobile || '-')}</span></td>
                  <td class="co-td-post">${escapeHtml(fullPosting)}</td>
                </tr>
              `;
            }).join('');

            coForceHtml = `
              <div class="co-force-container">
                <div class="co-force-header">
                  <div class="co-hdr-title">
                    ${usersSvg}
                    <span>सहयोगार्थ पुलिस बल (उसी पॉइंट पर तैनात साथी):</span>
                  </div>
                  <span class="co-count font-mono">कुल: ${coForceList.length} जवान</span>
                </div>
                <table class="co-force-table">
                  <thead>
                    <tr>
                      <th style="width:24px;text-align:center;">क्र०</th>
                      <th>पद व नाम</th>
                      <th style="width:105px;">मोबाइल नंबर</th>
                      <th>मूल तैनाती (जनपद)</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${coRows}
                  </tbody>
                </table>
                ${remainingCount > 0 ? `
                  <div class="co-more-note">
                    और भी सहयोगार्थ हैं......
                  </div>
                ` : ''}
              </div>
            `;
          }
        }

        cardsHtml += `
          <div class="duty-card ${is2In1 ? 'card-2in1' : ''} ${!coForceHtml ? 'no-co-force' : 'has-co-force'}">
            <!-- 1. Header Section -->
            <div class="card-header">
              <img src="/badge.png" class="badge-icon" alt="UP Police" />
              <div class="header-titles">
                <h2 class="title-main">${escapeHtml(eventTitle || 'उत्तर प्रदेश पुलिस')}</h2>
                <p class="title-sub">${escapeHtml(eventSubtitle || 'डिजिटल ड्यूटी पास')}</p>
              </div>
              <img src="/badge.png" class="badge-icon" alt="UP Police" />
            </div>

            <!-- 2. Officer Profile Section (Photo Left | Full Details Right) -->
            <div class="officer-card">
              <div class="photo-frame">
                ${photoHtml}
              </div>
              <div class="officer-info">
                <div>
                  <span class="officer-tag">अधिकारी / कर्मचारी विवरण:</span>
                  <h3 class="officer-name">
                    <span>${escapeHtml(duty.name || cleanOfficerName || duty.composite_details || '-')}</span>
                  </h3>
                  <div class="officer-mobile">
                    ${phoneSvg}
                    <strong>${escapeHtml(duty.mobile || 'अनुपलब्ध')}</strong>
                  </div>
                </div>
                <div class="officer-sub-bar">
                  ${cleanPno ? `<span>P.No: <strong>${escapeHtml(cleanPno)}</strong></span>` : ''}
                  <span>मूल तैनाती: <strong>${escapeHtml(duty.posting || duty.posting_place || duty.thana || (duty.district ? `जनपद ${duty.district}` : '-'))}</strong> ${duty.posting && duty.district && !String(duty.posting).includes(duty.district) ? `(${escapeHtml(duty.district)})` : ''}</span>
                </div>
              </div>
            </div>

            <!-- 3. Assignment Table (Clean, Bold, Professional) -->
            <div class="table-container">
              <table class="card-table">
                <tbody>
                  <tr class="row-duty-place">
                    <td class="td-lbl">ड्यूटी स्थल</td>
                    <td class="td-val td-duty-val">${escapeHtml(duty.duty_place || '-')}</td>
                  </tr>
                  ${duty.booth_no ? `
                  <tr class="row-booth">
                    <td class="td-lbl">बूथ सं० / श्रेणी</td>
                    <td class="td-val font-bold" style="color:#1e3a8a;">
                      बूथ सं० <strong>${escapeHtml(duty.booth_no)}</strong> ${duty.category ? `(${escapeHtml(duty.category)})` : ''}
                    </td>
                  </tr>` : ''}
                  ${(duty.vehicle_no || duty.bus_no) ? `
                  <tr class="row-vehicle">
                    <td class="td-lbl">वाहन / बस सं०</td>
                    <td class="td-val font-bold" style="color:#b45309;">
                      🚌 वाहन सं० <strong>${escapeHtml(duty.vehicle_no || duty.bus_no)}</strong>
                    </td>
                  </tr>` : ''}
                  ${(duty.weapon || duty.duty_type || duty.weapon_type) ? `
                  <tr class="row-weapon">
                    <td class="td-lbl">शस्त्र स्थिति</td>
                    <td class="td-val font-bold" style="color:#0f766e;">
                      🛡️ ${escapeHtml(duty.weapon || duty.duty_type || duty.weapon_type)}
                    </td>
                  </tr>` : ''}
                  ${(duty.capf || duty.pac) ? `
                  <tr class="row-capf">
                    <td class="td-lbl">सीएपीएफ/पीएसी</td>
                    <td class="td-val font-bold" style="color:#6b21a8;">
                      🎖️ ${escapeHtml(duty.capf || duty.pac)}
                    </td>
                  </tr>` : ''}
                  <tr>
                    <td class="td-lbl">दिनाँक व समय</td>
                    <td class="td-val font-bold">${escapeHtml(duty.shift || '-')}</td>
                  </tr>
                  ${(!coForceHtml) ? `
                  <tr>
                    <td class="td-lbl">जोन</td>
                    <td class="td-val font-semibold">${escapeHtml(cleanZone || '-')}</td>
                  </tr>
                  ${cleanZonalIncharge ? `
                  <tr class="row-incharge">
                    <td class="td-lbl">जोनल प्रभारी</td>
                    <td class="td-val incharge-val"><strong>${escapeHtml(cleanZonalIncharge)}</strong></td>
                  </tr>` : ''}
                  <tr>
                    <td class="td-lbl">सेक्टर</td>
                    <td class="td-val font-semibold">${escapeHtml(cleanSector || '-')}</td>
                  </tr>
                  ${cleanSectorIncharge ? `
                  <tr class="row-incharge">
                    <td class="td-lbl">सेक्टर प्रभारी</td>
                    <td class="td-val incharge-val"><strong>${escapeHtml(cleanSectorIncharge)}</strong></td>
                  </tr>` : ''}
                  ` : `
                  <tr>
                    <td class="td-lbl">जोन / जोनल प्रभारी</td>
                    <td class="td-val">
                      <div style="display:flex; flex-direction:column; width:100%; gap:2px;">
                        <div style="font-weight:700; color:#0f172a; line-height:1.25; ${cleanZonalIncharge ? 'padding-bottom:2px; border-bottom:1px dotted #94a3b8;' : ''}">${escapeHtml(cleanZone || '-')}</div>
                        ${cleanZonalIncharge ? `
                          <div style="color:#0369a1; font-weight:800; font-size:11px; line-height:1.2; padding-top:1.5px;">
                            <span style="color:#475569; font-weight:700;">जोनल प्रभारी:</span> <strong>${escapeHtml(cleanZonalIncharge)}</strong>
                          </div>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td class="td-lbl">सेक्टर / सेक्टर प्रभारी</td>
                    <td class="td-val">
                      <div style="display:flex; flex-direction:column; width:100%; gap:2px;">
                        <div style="font-weight:700; color:#0f172a; line-height:1.25; ${cleanSectorIncharge ? 'padding-bottom:2px; border-bottom:1px dotted #94a3b8;' : ''}">${escapeHtml(cleanSector || '-')}</div>
                        ${cleanSectorIncharge ? `
                          <div style="color:#0369a1; font-weight:800; font-size:11px; line-height:1.2; padding-top:1.5px;">
                            <span style="color:#475569; font-weight:700;">सेक्टर प्रभारी:</span> <strong>${escapeHtml(cleanSectorIncharge)}</strong>
                          </div>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                  `}
                  ${activeBriefing ? `
                  <tr class="row-briefing">
                    <td class="td-lbl">ब्रीफिंग स्थल</td>
                    <td class="td-val font-bold">${escapeHtml(activeBriefing)}</td>
                  </tr>` : ''}
                  ${activeNote ? `
                  <tr class="row-note">
                    <td class="td-lbl">विशेष निर्देश</td>
                    <td class="td-val font-bold note-val">${escapeHtml(activeNote)}</td>
                  </tr>` : ''}
                </tbody>
              </table>
            </div>

            <!-- 4. Co-deployed Force Section (सहयोगार्थ पुलिस बल) -->
            ${coForceHtml}

            <!-- 5. Authorization Footer (QR Code Left | Signature Right) -->
            <div class="card-footer">
              <div class="footer-left">
                <div class="footer-qr-frame">${qrSvgHtml}</div>
                <div class="footer-auth-details">
                  <div class="verified-pill">
                    <span class="dot">●</span>
                    <span>सत्यापित पास</span>
                  </div>
                  <div class="auth-code">ID: ${escapeHtml(cleanPno || duty.id || '-')}</div>
                </div>
              </div>

              <div class="footer-right">
                ${signHtml}
                <div class="signatory-title">${escapeHtml(signatoryText)}</div>
              </div>
            </div>
          </div>
        `;
      }

      pagesHtml += `
        <div class="legal-page ${is2In1 ? 'page-2in1' : ''}">
          ${is2In1 ? `
            <div class="cut-line-h-center"></div>
          ` : is4In1 ? `
            <div class="cut-line-h-center"></div>
            <div class="cut-line-v"></div>
          ` : `
            <div class="cut-line-h1"></div>
            <div class="cut-line-h2"></div>
            <div class="cut-line-v"></div>
          `}
          ${cardsHtml}
        </div>
      `;

      // If Back Side printing is requested, append the paired Back Page (Duplex ready)
      if (includeBackSide) {
        let backCardsHtml = '';
        for (let c = 0; c < CARDS_PER_PAGE; c++) {
          backCardsHtml += `
            <div class="duty-card card-back-face" style="display:flex; flex-direction:column; justify-content:space-between; padding:${is2In1 ? '8px 10px' : is4In1 ? '6px 8px' : '4px 6px'}; background:#ffffff; border:1.8px solid #0f172a; border-radius:6px; box-sizing:border-box; overflow:hidden;">
              <div style="border-bottom:1.5px solid #0f172a; padding-bottom:3px; margin-bottom:3px; text-align:center;">
                <div style="font-weight:900; font-size:${is2In1 ? '11.5px' : is4In1 ? '9px' : '7.5px'}; color:#0f172a; letter-spacing:0.2px;">
                  ⚖️ पुलिस कर्मियों हेतु 16 महत्वपूर्ण निर्देश (आदर्श आचार संहिता व कर्तव्य)
                </div>
                <div style="font-size:${is2In1 ? '8.5px' : '6.5px'}; color:#475569; font-weight:bold;">
                  कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या — निष्पक्ष, निर्भीक व पारदर्शी निर्वाचन
                </div>
              </div>

              <div style="flex:1; display:grid; grid-template-columns:${is2In1 ? '1.2fr 1fr' : '1fr'}; gap:5px; overflow:hidden;">
                <!-- Instructions -->
                <div style="overflow:hidden; font-size:${is2In1 ? '8.5px' : is4In1 ? '6.8px' : '5.8px'}; line-height:1.22;">
                  <div style="font-weight:900; color:#1e293b; border-bottom:1px solid #cbd5e1; margin-bottom:2px;">
                    📋 अनिवार्य आचार संहिता हिदायतें:
                  </div>
                  <div style="space-y:1px;">
                    ${ELECTION_DUTY_CARD_INSTRUCTIONS.map(inst => `
                      <div style="margin-bottom:${is2In1 ? '2px' : '1px'}; text-align:justify;">
                        ${escapeHtml(inst)}
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- CUG Directory -->
                <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:4px; padding:3px; display:flex; flex-direction:column; justify-content:space-between; overflow:hidden; font-size:${is2In1 ? '8px' : is4In1 ? '6.5px' : '5.5px'}; line-height:1.15;">
                  <div>
                    <div style="font-weight:900; color:#0f172a; text-align:center; background:#e2e8f0; padding:1px; margin-bottom:2px; font-size:${is2In1 ? '8.5px' : '6.8px'};">
                      📞 सीयूजी दूरभाष निर्देशिका (जनपद अयोध्या)
                    </div>
                    <div style="margin-bottom:2px;">
                      <span style="font-weight:900; color:#b45309;">उच्चाधिकारी: </span>
                      ${ELECTION_CUG_DIRECTORY.higher_officers.slice(0, 6).map(h => `${escapeHtml(h.designation)}: <strong>${escapeHtml(h.mobile)}</strong>`).join(', ')}
                    </div>
                    <div style="margin-bottom:2px;">
                      <span style="font-weight:900; color:#047857;">नियंत्रण कक्ष: </span>
                      पुलिस: <strong>9454402648</strong> / 112 | जनपद: <strong>9454417465</strong>
                    </div>
                    <div style="margin-bottom:2px;">
                      <span style="font-weight:900; color:#1d4ed8;">एसडीएम/सीओ: </span>
                      ${ELECTION_CUG_DIRECTORY.sub_divisions.slice(0, 4).map(s => `${escapeHtml(s.sdm)}: <strong>${escapeHtml(s.sdm_mobile)}</strong> | ${escapeHtml(s.co)}: <strong>${escapeHtml(s.co_mobile)}</strong>`).join(' | ')}
                    </div>
                    <div>
                      <span style="font-weight:900; color:#be123c;">थाना प्रभारी (SHOs): </span>
                      ${ELECTION_CUG_DIRECTORY.police_stations.slice(0, 10).map(t => `${escapeHtml(t.thana)}: <strong>${escapeHtml(t.mobile)}</strong>`).join(', ')}
                    </div>
                  </div>
                  <div style="border-top:1px solid #94a3b8; padding-top:1px; text-align:center; font-weight:900; font-size:${is2In1 ? '8.5px' : '6.5px'}; color:#0f172a;">
                    ( वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या )
                  </div>
                </div>
              </div>
            </div>
          `;
        }

        pagesHtml += `
          <div class="legal-page page-back ${is2In1 ? 'page-2in1' : ''}">
            ${is2In1 ? `
              <div class="cut-line-h-center"></div>
            ` : is4In1 ? `
              <div class="cut-line-h-center"></div>
              <div class="cut-line-v"></div>
            ` : `
              <div class="cut-line-h1"></div>
              <div class="cut-line-h2"></div>
              <div class="cut-line-v"></div>
            `}
            ${backCardsHtml}
          </div>
        `;
      }
    }
    } // Closes Branch B (Standard 2/4/6 in 1)

    const isA4 = effectivePaperSize === 'a4';
    const paperLabel = isA4 ? 'A4' : 'Legal';
    const layoutName = isIdBadge ? 'गले का पॉलीबैग ID कार्ड (4-इन-1 लीगल)' : (is2In1 ? '2-in-1 Election Special' : (is4In1 ? '4-in-1 Standard' : '6-in-1 Compact'));

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="hi">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(eventTitle || 'ड्यूटी पास')} - ${escapeHtml(layoutName)}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @font-face {
            font-family: 'Kokila';
            src: url('/fonts/kokila.ttf') format('truetype'),
                 local('Kokila'), local('Kokila-Regular'), local('kokila');
            font-weight: 400;
            font-style: normal;
          }
          @font-face {
            font-family: 'Kokila';
            src: url('/fonts/kokilab.ttf') format('truetype'),
                 local('Kokila Bold'), local('Kokila-Bold'), local('kokilab');
            font-weight: 700 900;
            font-style: normal;
          }
          @page {
            size: ${isIdBadge ? 'legal portrait' : (isA4 ? 'A4 portrait' : 'legal portrait')};
            margin: ${isIdBadge ? '3mm 3mm' : '4mm 4mm'};
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Kokila', 'Mangal', 'Mukta', 'Noto Sans Devanagari', sans-serif !important;
          }
          body {
            font-family: 'Kokila', 'Mangal', 'Mukta', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            background: #ffffff;
            color: #020617;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            letter-spacing: 0.15px;
          }

          /* Responsive Page Dimensions (A4: 210x297mm vs Legal: 215.9x355.6mm) */
          .legal-page {
            width: ${isA4 ? '202mm' : '207.9mm'};
            height: ${isA4 ? '289mm' : '347.6mm'};
            display: grid;
            grid-template-columns: ${is2In1 ? '1fr' : '1fr 1fr'};
            grid-template-rows: ${is2In1 ? '1fr 1fr' : is4In1 ? '1fr 1fr' : '1fr 1fr 1fr'};
            gap: ${isA4 ? (is4In1 ? '3.5mm' : '2.5mm') : (is4In1 ? '5mm' : '3.5mm')};
            padding: 1mm;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            box-sizing: border-box;
            position: relative;
            background: #ffffff;
          }

          /* 2-in-1 Full Vertical Layout */
          .page-2in1 {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 1fr;
            gap: ${isA4 ? '4mm' : '6mm'};
            padding: 2mm;
          }

          /* ========================================================= */
          /* 5-IN-1 COMPACT VISITING / POCKET ID CARD (LEGAL PORTRAIT) */
          /* 5 CARDS (5 OFFICERS) PER PAGE: 5 ROWS x 2 COLS           */
          /* ========================================================= */
          .page-id-badge-5in1,
          .page-id-badge-4in1 {
            width: 209mm;
            height: 348mm;
            max-height: 348mm;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: repeat(5, 1fr);
            gap: 1.2mm 2.5mm;
            padding: 1mm 1.5mm;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            box-sizing: border-box;
            position: relative;
            background: #ffffff;
            overflow: hidden;
          }

          .id-badge-h-card {
            border: 1.5px solid #0f172a;
            border-radius: 6px;
            padding: 0;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            box-sizing: border-box;
            height: 100%;
            overflow: hidden;
            position: relative;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            font-family: 'Kokila', 'Mangal', 'Mukta', 'Noto Sans Devanagari', sans-serif;
          }

          .id-badge-h-back {
            border-color: #0f172a;
            background: #ffffff;
          }

          .cut-line-v-center {
            position: absolute;
            left: 50%;
            top: 0;
            bottom: 0;
            border-left: 1.5px dashed #d97706;
            pointer-events: none;
            z-index: 10;
          }

          .cut-line-h {
            position: absolute;
            left: 0;
            right: 0;
            border-top: 1.5px dashed #94a3b8;
            pointer-events: none;
            z-index: 10;
          }
          .cut-line-h-1 { top: 20%; }
          .cut-line-h-2 { top: 40%; }
          .cut-line-h-3 { top: 60%; }
          .cut-line-h-4 { top: 80%; }

          .cut-badge-h {
            position: absolute;
            left: 50%;
            top: 0;
            transform: translate(-50%, -50%);
            background: #ffffff;
            padding: 1px 6px;
            border: 1px dashed #64748b;
            border-radius: 3px;
            font-size: 6.5px;
            font-weight: 800;
            color: #475569;
            white-space: nowrap;
          }

          .page-id-badge {
            width: 207.9mm;
            height: 349.6mm;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 4mm;
            padding: 1.5mm;
            page-break-after: always;
            break-after: page;
            box-sizing: border-box;
            position: relative;
            background: #ffffff;
          }

          .id-badge-card {
            border: 2px solid #0b132b;
            box-shadow: inset 0 0 0 1.5px #d97706;
            border-radius: 8px;
            padding: 8px 10px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            box-sizing: border-box;
            height: 100%;
            overflow: hidden;
            position: relative;
          }

          .id-badge-back {
            box-shadow: inset 0 0 0 1.5px #1e3a8a;
            padding: 7px 9px;
            background: #ffffff;
          }

          .id-badge-duty-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 1.8px solid #b45309;
            border-radius: 6px;
            padding: 5px 8px;
            margin: 5px 0;
            text-align: center;
            box-shadow: 0 1px 3px rgba(180, 83, 9, 0.12);
          }

          .id-badge-duty-lbl {
            font-size: 8.5px;
            font-weight: 900;
            color: #78350f;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }

          .id-badge-duty-val {
            font-size: 14.5px;
            font-weight: 900;
            color: #0f172a;
            line-height: 1.25;
            margin-top: 2px;
            word-break: break-word;
          }

          .id-badge-time-box {
            background: #f8fafc;
            border: 1.2px solid #cbd5e1;
            border-radius: 5px;
            padding: 4px 7px;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
          }

          .badge-back-section {
            border: 1.2px solid #cbd5e1;
            border-radius: 5px;
            overflow: hidden;
            margin-bottom: 3.5px;
            font-size: 8.5px;
          }

          .badge-back-sec-hdr {
            background: #e2e8f0;
            font-weight: 900;
            color: #0f172a;
            padding: 2px 6px;
            font-size: 8.5px;
          }

          .badge-back-sec-body {
            padding: 3px 6px;
            background: #ffffff;
            line-height: 1.3;
          }

          .badge-back-briefing {
            background: #f0f9ff;
            border: 1.2px solid #bae6fd;
            border-radius: 5px;
            padding: 3px 6px;
            margin-bottom: 3.5px;
            font-size: 8px;
            line-height: 1.25;
          }

          .badge-back-note {
            background: #fffbeb;
            border: 1.2px solid #fde68a;
            border-radius: 5px;
            padding: 3px 6px;
            margin-bottom: 3.5px;
            font-size: 8px;
            line-height: 1.25;
          }

          .badge-back-cug {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 3px 5px;
            font-size: 7.5px;
            line-height: 1.2;
          }

          /* ✂️ Cut markers */
          .cut-line-v {
            position: absolute;
            left: 50%;
            top: 0;
            bottom: 0;
            border-left: 1.5px dashed #94a3b8;
            pointer-events: none;
            z-index: 10;
          }
          .cut-line-h-center {
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            border-top: 1.5px dashed #94a3b8;
            pointer-events: none;
            z-index: 10;
          }
          .cut-line-badge-h {
            position: absolute;
            left: 50%;
            top: 0;
            transform: translate(-50%, -50%);
            background: #ffffff;
            padding: 1.5px 8px;
            border: 1px dashed #64748b;
            border-radius: 4px;
            font-size: 7.5px;
            font-weight: 800;
            color: #475569;
            white-space: nowrap;
          }
          .cut-line-badge-v-top {
            position: absolute;
            top: 25%;
            left: 0;
            transform: translate(-50%, -50%);
            background: #ffffff;
            padding: 1.5px 6px;
            border: 1px dashed #64748b;
            border-radius: 4px;
            font-size: 7px;
            font-weight: 800;
            color: #475569;
            white-space: nowrap;
          }
          .cut-line-badge-v-bottom {
            position: absolute;
            top: 75%;
            left: 0;
            transform: translate(-50%, -50%);
            background: #ffffff;
            padding: 1.5px 6px;
            border: 1px dashed #64748b;
            border-radius: 4px;
            font-size: 7px;
            font-weight: 800;
            color: #475569;
            white-space: nowrap;
          }
          .cut-line-h1 {
            position: absolute;
            top: 33.33%;
            left: 0;
            right: 0;
            border-top: 1px dashed #cbd5e1;
            pointer-events: none;
            z-index: 10;
          }
          .cut-line-h2 {
            position: absolute;
            top: 66.66%;
            left: 0;
            right: 0;
            border-top: 1px dashed #cbd5e1;
            pointer-events: none;
            z-index: 10;
          }

          /* Individual Police Duty Card with VIP Dual Security Frame */
          .duty-card {
            border: 2px solid #0b132b;
            box-shadow: inset 0 0 0 1.5px #d97706;
            border-radius: 8px;
            padding: ${is2In1 ? '12px 16px' : (is4In1 ? '9px 12px' : '5px 7px')};
            display: flex;
            flex-direction: column;
            background: #ffffff;
            box-sizing: border-box;
            height: 100%;
            overflow: hidden;
            position: relative;
          }

          /* Option B: When Co-force is absent, expand Assignment Table smoothly to fill the card */
          .duty-card.no-co-force {
            justify-content: flex-start;
          }
          .duty-card.no-co-force .officer-card {
            margin-top: ${is2In1 ? '10px' : (is4In1 ? '6px' : '3px')};
            padding: ${is2In1 ? '8px 12px' : (is4In1 ? '5px 8px' : '3px 5px')};
          }
          .duty-card.no-co-force .photo-frame {
            width: ${is2In1 ? '56px' : (is4In1 ? '46px' : '34px')};
            height: ${is2In1 ? '72px' : (is4In1 ? '58px' : '42px')};
          }
          .duty-card.no-co-force .officer-name {
            font-size: ${is2In1 ? '18px' : (is4In1 ? '14px' : '10.5px')};
          }
          .duty-card.no-co-force .officer-mobile {
            font-size: ${is2In1 ? '15px' : (is4In1 ? '12px' : '9px')};
          }
          .duty-card.no-co-force .table-container {
            flex: 1;
            margin-top: ${is2In1 ? '10px' : (is4In1 ? '6px' : '3px')};
            margin-bottom: ${is2In1 ? '10px' : (is4In1 ? '6px' : '3px')};
            display: flex;
            flex-direction: column;
            border: 2px solid #0f172a;
          }
          .duty-card.no-co-force .card-table {
            height: 100%;
            font-size: ${is2In1 ? '15px' : (is4In1 ? '12.5px' : '9.5px')};
          }
          .duty-card.no-co-force .card-table tbody {
            display: flex;
            flex-direction: column;
            height: 100%;
            justify-content: space-between;
          }
          .duty-card.no-co-force .card-table tr {
            display: flex;
            align-items: stretch;
            flex: 1;
          }
          .duty-card.no-co-force .td-lbl {
            width: 28%;
            display: flex;
            align-items: center;
            font-size: ${is2In1 ? '15px' : (is4In1 ? '12.5px' : '9.5px')};
            padding: ${is2In1 ? '8px 12px' : (is4In1 ? '5px 8px' : '3px 5px')};
            font-weight: 900;
          }
          .duty-card.no-co-force .td-val {
            flex: 1;
            display: flex;
            align-items: center;
            font-size: ${is2In1 ? '16px' : (is4In1 ? '13px' : '10px')};
            padding: ${is2In1 ? '8px 12px' : (is4In1 ? '5px 8px' : '3px 5px')};
            line-height: 1.4;
            font-weight: 700;
          }
          .duty-card.no-co-force .td-duty-val {
            font-size: ${is2In1 ? '20px' : (is4In1 ? '16px' : '12px')};
            font-weight: 900;
          }
          .duty-card.no-co-force .note-val {
            font-size: ${is2In1 ? '14px' : (is4In1 ? '11.5px' : '9px')};
            font-weight: 700;
            line-height: 1.4;
          }
          .duty-card.no-co-force .card-footer {
            margin-top: auto;
            padding-top: ${is2In1 ? '8px' : (is4In1 ? '4px' : '2px')};
          }

          /* Optimized spacing when Co-force table is included (Guarantees all 5 jawans fit with zero cut-off and fills the card) */
          .duty-card.has-co-force {
            padding: ${is2In1 ? '7px 10px' : (is4In1 ? '5px 8px' : '3.5px 5px')};
            justify-content: space-between;
          }
          .duty-card.has-co-force .card-header {
            flex-shrink: 0;
            padding-bottom: ${is4In1 ? '2.5px' : '2px'};
          }
          .duty-card.has-co-force .badge-icon {
            width: ${is2In1 ? '32px' : (is4In1 ? '30px' : '26px')};
            height: ${is2In1 ? '32px' : (is4In1 ? '30px' : '26px')};
          }
          .duty-card.has-co-force .title-main {
            font-size: ${is2In1 ? '16px' : (is4In1 ? '15px' : '10.5px')};
            line-height: 1.15;
          }
          .duty-card.has-co-force .title-sub {
            font-size: ${is2In1 ? '10.5px' : (is4In1 ? '10.5px' : '7.5px')};
          }
          .duty-card.has-co-force .officer-card {
            flex-shrink: 0;
            padding: ${is2In1 ? '6px 12px' : (is4In1 ? '3.5px 7px' : '2.5px 5px')};
            margin-top: ${is2In1 ? '5px' : (is4In1 ? '3px' : '2px')};
            gap: ${is2In1 ? '12px' : (is4In1 ? '6px' : '5px')};
          }
          .duty-card.has-co-force .photo-frame {
            width: ${is2In1 ? '54px' : (is4In1 ? '40px' : '34px')};
            height: ${is2In1 ? '68px' : (is4In1 ? '50px' : '42px')};
            flex-shrink: 0;
          }
          .duty-card.has-co-force .officer-name {
            font-size: ${is2In1 ? '22px' : (is4In1 ? '15px' : '9.5px')};
            line-height: 1.22;
            font-weight: 900;
          }
          .duty-card.has-co-force .officer-mobile {
            font-size: ${is2In1 ? '16px' : (is4In1 ? '12px' : '9px')};
          }
          .duty-card.has-co-force .officer-sub-bar {
            font-size: ${is2In1 ? '13px' : (is4In1 ? '10px' : '7.5px')};
            padding-top: 1.5px;
            margin-top: 1.5px;
          }
          .co-force-dual-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: ${is2In1 ? '4px' : '2px'};
            margin-bottom: 2px;
            flex-shrink: 0;
          }
          .duty-card.has-co-force .table-container {
            flex: ${is4In1 ? '1' : 'none'};
            display: flex;
            flex-direction: column;
            min-height: 0;
            margin-top: ${is2In1 ? '3px' : (is4In1 ? '3px' : '2px')};
            margin-bottom: ${is2In1 ? '3px' : (is4In1 ? '3px' : '2px')};
          }
          .duty-card.has-co-force .card-table {
            height: ${is4In1 ? '100%' : 'auto'};
            font-size: ${is2In1 ? '11.5px' : (is4In1 ? '11.5px' : '8px')};
            line-height: 1.25;
          }
          ${is4In1 ? `
          .duty-card.has-co-force .card-table tbody {
            display: flex;
            flex-direction: column;
            height: 100%;
            justify-content: space-between;
          }
          .duty-card.has-co-force .card-table tr {
            display: flex;
            align-items: stretch;
            flex: 1;
            min-height: 0;
          }
          .duty-card.has-co-force .card-table td {
            display: flex;
            align-items: center;
          }
          ` : ''}
          .duty-card.has-co-force .td-lbl {
            width: ${is4In1 ? '28%' : 'auto'};
            padding: ${is2In1 ? '2.5px 6px' : (is4In1 ? '2.5px 6px' : '2px 4px')};
            font-size: ${is2In1 ? '11.5px' : (is4In1 ? '11px' : '8px')};
          }
          .duty-card.has-co-force .td-val {
            flex: ${is4In1 ? '1' : 'none'};
            padding: ${is2In1 ? '2.5px 6px' : (is4In1 ? '2.5px 6px' : '2px 4px')};
            font-size: ${is2In1 ? '11.5px' : (is4In1 ? '11.5px' : '8px')};
            line-height: 1.25;
          }
          .duty-card.has-co-force .td-duty-val {
            font-size: ${is2In1 ? '14px' : (is4In1 ? '14.5px' : '9.5px')};
            font-weight: 900;
          }
          .duty-card.has-co-force .note-val {
            font-size: ${is2In1 ? '10.5px' : (is4In1 ? '10px' : '7.5px')};
            line-height: 1.25;
          }
          .duty-card.has-co-force .co-force-container {
            flex-shrink: 0;
            margin-top: ${is2In1 ? '3px' : (is4In1 ? '3px' : '2px')};
            margin-bottom: ${is2In1 ? '2px' : (is4In1 ? '2px' : '1.5px')};
          }
          .duty-card.has-co-force .co-force-header {
            padding: ${is2In1 ? '2.5px 6px' : (is4In1 ? '2px 6px' : '2px 5px')};
          }
          .duty-card.has-co-force .co-hdr-title {
            font-size: ${is2In1 ? '11px' : (is4In1 ? '10.5px' : '7.5px')};
          }
          .duty-card.has-co-force .co-count {
            font-size: ${is2In1 ? '10.5px' : (is4In1 ? '10px' : '7px')};
          }
          .duty-card.has-co-force .co-force-table {
            font-size: ${is2In1 ? '11px' : (is4In1 ? '10.5px' : '7.5px')};
            line-height: 1.22;
          }
          .duty-card.has-co-force .co-force-table th {
            padding: ${is2In1 ? '2.5px 5px' : (is4In1 ? '2px 4px' : '2px 4px')};
            font-size: ${is2In1 ? '10.5px' : (is4In1 ? '10px' : '7px')};
          }
          .duty-card.has-co-force .co-force-table td {
            padding: ${is2In1 ? '2.5px 5px' : (is4In1 ? '2px 4px' : '2px 4px')};
          }
          .duty-card.has-co-force .co-more-note {
            background: #fffbeb;
            border-top: 1px solid #fde68a;
            padding: ${is4In1 ? '2px 4px' : '1.5px 4px'};
            text-align: center;
            font-size: ${is2In1 ? '9.5px' : (is4In1 ? '9.5px' : '7px')};
            font-weight: 900;
            color: #92400e;
          }
          .duty-card.has-co-force .card-footer {
            flex-shrink: 0;
            padding-top: ${is2In1 ? '4px' : (is4In1 ? '3px' : '2.5px')};
          }

          .empty-slot {
            border: 1.5px dashed #cbd5e1;
            box-shadow: none;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
          }
          .empty-text {
            font-size: 11px;
            font-weight: bold;
            color: #94a3b8;
          }

          /* 1. Header Section */
          .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #0b132b;
            padding-bottom: ${is2In1 ? '6px' : (is4In1 ? '4px' : '2.5px')};
            gap: 4px;
            flex-shrink: 0;
          }
          .badge-icon {
            width: ${is2In1 ? '44px' : (is4In1 ? '40px' : '28px')};
            height: ${is2In1 ? '44px' : (is4In1 ? '40px' : '28px')};
            object-fit: contain;
          }
          .header-titles {
            text-align: center;
            flex: 1;
            min-width: 0;
          }
          .title-main {
            font-size: ${is2In1 ? '19px' : (is4In1 ? '15px' : '11px')};
            font-weight: 900;
            color: #000000;
            line-height: 1.15;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .title-sub {
            font-size: ${is2In1 ? '13px' : (is4In1 ? '11px' : '8.5px')};
            font-weight: 700;
            color: #1e293b;
            margin-top: 1px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* 2. Officer Profile Section (Photo Left | Details Center | Auth QR Right) */
          .officer-card {
            display: flex;
            align-items: center;
            gap: ${is2In1 ? '10px' : (is4In1 ? '8px' : '5px')};
            border: 1px solid #000000;
            border-radius: 6px;
            padding: ${is2In1 ? '5px 8px' : (is4In1 ? '4px 6px' : '3px 4px')};
            background: #f8fafc;
            margin-top: ${is2In1 ? '6px' : (is4In1 ? '4px' : '2px')};
            flex-shrink: 0;
          }
          .photo-frame {
            width: ${is2In1 ? '48px' : (is4In1 ? '42px' : '32px')};
            height: ${is2In1 ? '60px' : (is4In1 ? '50px' : '38px')};
            border: 1px solid #000000;
            border-radius: 4px;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
          }
          .officer-photo {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .photo-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            color: #94a3b8;
          }
          .photo-svg {
            width: ${is4In1 ? '16px' : '12px'};
            height: ${is4In1 ? '16px' : '12px'};
          }
          .photo-placeholder span {
            font-size: ${is4In1 ? '6px' : '5px'};
            font-weight: bold;
            line-height: 1;
            margin-top: 1px;
          }
          .officer-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-width: 0;
          }
          .officer-tag {
            font-size: ${is2In1 ? '9px' : (is4In1 ? '7.5px' : '6.5px')};
            color: #475569;
            font-weight: bold;
          }
          .officer-name {
            font-size: ${is2In1 ? '22px' : (is4In1 ? '14px' : '10px')};
            font-weight: 900;
            color: #000000;
            line-height: 1.25;
            white-space: normal;
            word-break: break-word;
            overflow-wrap: break-word;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 4px;
          }
          .rank-tag {
            font-size: ${is2In1 ? '11px' : (is4In1 ? '9px' : '7.5px')};
            background: #fef3c7;
            color: #78350f;
            border: 1px solid #fde68a;
            padding: 0.5px 4px;
            border-radius: 3px;
            font-weight: 900;
            display: inline-block;
          }
          .officer-mobile {
            font-size: ${is2In1 ? '16px' : (is4In1 ? '12px' : '9px')};
            font-family: monospace;
            font-weight: bold;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 4px;
            margin-top: 1px;
          }
          .officer-sub-bar {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            gap: 4px;
            border-top: 1px solid #e2e8f0;
            padding-top: 2px;
            margin-top: 2px;
            font-size: ${is2In1 ? '12px' : (is4In1 ? '10px' : '8px')};
            color: #334155;
            word-break: break-word;
          }

          /* Modern Vector SVG Icons */
          .icon-phone {
            width: ${is2In1 ? '12px' : '10px'};
            height: ${is2In1 ? '12px' : '10px'};
            color: #0284c7;
            display: inline-block;
            vertical-align: middle;
            flex-shrink: 0;
            margin-right: 3px;
          }
          .icon-users {
            width: ${is2In1 ? '13px' : '11px'};
            height: ${is2In1 ? '13px' : '11px'};
            color: #0369a1;
            display: inline-block;
            vertical-align: middle;
            flex-shrink: 0;
            margin-right: 4px;
          }

          /* 3. Assignment Table (Clean, Large, Highly Professional) */
          .table-container {
            margin-top: ${is2In1 ? '7px' : (is4In1 ? '4px' : '2.5px')};
            margin-bottom: ${is2In1 ? '5px' : (is4In1 ? '3px' : '2px')};
            border: 1.5px solid #0f172a;
            border-radius: 6px;
            overflow: hidden;
            flex-shrink: 0;
            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          }
          .card-table {
            width: 100%;
            border-collapse: collapse;
            font-size: ${is2In1 ? '15px' : (is4In1 ? '12.5px' : '9.5px')};
            line-height: 1.4;
          }
          .card-table tr {
            border-bottom: 1px solid #cbd5e1;
          }
          .card-table tr:last-child {
            border-bottom: none;
          }
          .td-lbl {
            width: 28%;
            background: #f1f5f9;
            font-weight: 900;
            color: #0f172a;
            padding: ${is2In1 ? '7px 10px' : (is4In1 ? '4.5px 7px' : '3px 5px')};
            border-right: 1.5px solid #cbd5e1;
            white-space: nowrap;
            font-size: ${is2In1 ? '15px' : (is4In1 ? '12.5px' : '9.5px')};
          }
          .td-val {
            padding: ${is2In1 ? '7px 10px' : (is4In1 ? '4.5px 7px' : '3px 5px')};
            color: #020617;
            font-weight: 700;
            font-size: ${is2In1 ? '16px' : (is4In1 ? '13px' : '10px')};
            word-break: break-word;
            line-height: 1.4;
          }
          .td-duty-val {
            font-weight: 900;
            color: #78350f;
            background: #fef3c7;
            font-size: ${is2In1 ? '20px' : (is4In1 ? '16px' : '12px')};
            letter-spacing: 0.2px;
          }
          .row-incharge .td-lbl {
            background: #f8fafc;
            color: #0369a1;
            font-weight: 900;
          }
          .row-incharge .incharge-val {
            color: #0369a1;
            font-weight: 800;
          }
          .row-briefing td {
            background: #f0f9ff;
            color: #0369a1;
          }
          .row-briefing .td-lbl {
            background: #e0f2fe;
            color: #075985;
            font-weight: 900;
          }
          .row-note td {
            background: #fffbeb;
            color: #92400e;
          }
          .row-note .td-lbl {
            background: #fef3c7;
            color: #92400e;
            font-weight: 900;
          }
          .note-val {
            font-size: ${is2In1 ? '14px' : (is4In1 ? '11.5px' : '9px')};
            font-weight: 700;
            line-height: 1.4;
          }

          /* 4. Co-deployed Force Section (सहयोगार्थ पुलिस बल - 2 Column Grid, Zero Scrollbars) */
          .co-force-container {
            margin-top: ${is2In1 ? '6px' : (is4In1 ? '4px' : '2.5px')};
            border: 1.5px solid #0b132b;
            border-radius: 6px;
            overflow: hidden !important;
            background: #ffffff;
            font-size: ${is2In1 ? '9px' : '7.5px'};
            display: flex;
            flex-direction: column;
            min-height: 0;
          }
          .co-force-header {
            background: #f1f5f9;
            padding: ${is2In1 ? '3.5px 8px' : '2px 6px'};
            font-weight: 900;
            color: #0f172a;
            border-bottom: 1.5px solid #cbd5e1;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .co-hdr-title {
            display: flex;
            align-items: center;
            font-size: ${is2In1 ? '12px' : (is4In1 ? '10px' : '8px')};
            font-weight: 900;
          }
          .co-count {
            color: #0369a1;
            font-weight: bold;
            font-family: monospace;
            font-size: ${is2In1 ? '11px' : (is4In1 ? '9.5px' : '7.5px')};
          }
          .co-force-table {
            width: 100%;
            border-collapse: collapse;
            font-size: ${is2In1 ? '12px' : (is4In1 ? '10px' : '7.5px')};
            background: #ffffff;
            line-height: 1.35;
          }
          .co-force-table th {
            background: #f1f5f9;
            color: #0f172a;
            font-weight: 900;
            padding: ${is2In1 ? '4px 6px' : (is4In1 ? '2.5px 5px' : '1.5px 3px')};
            border: 1px solid #cbd5e1;
            text-align: left;
            font-size: ${is2In1 ? '11.5px' : (is4In1 ? '9.5px' : '7px')};
          }
          .co-force-table td {
            padding: ${is2In1 ? '3.5px 6px' : (is4In1 ? '2.5px 5px' : '1.5px 3px')};
            border: 1px solid #e2e8f0;
          }
          .co-force-table tr:nth-child(even) {
            background: #f8fafc;
          }
          .co-td-idx {
            text-align: center;
            font-weight: bold;
            color: #64748b;
            font-family: monospace;
          }
          .co-td-name {
            font-weight: 800;
            color: #0f172a;
          }
          .co-td-mob {
            font-weight: bold;
            color: #0369a1;
            white-space: nowrap;
          }
          .co-td-post {
            color: #334155;
            font-weight: 600;
          }
          .co-more-note {
            background: #f1f5f9;
            border-top: 1px solid #e2e8f0;
            padding: 2px 4px;
            text-align: center;
            font-size: ${is2In1 ? '8px' : '7px'};
            font-weight: bold;
            color: #475569;
          }

          /* 5. Authorization Footer */
          .card-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-top: 1.5px solid #0b132b;
            padding-top: ${is2In1 ? '6px' : (is4In1 ? '3px' : '2px')};
            margin-top: auto;
            flex-shrink: 0;
            gap: 6px;
          }
          .footer-left {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .footer-qr-frame {
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 1px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .footer-auth-details {
            display: flex;
            flex-direction: column;
            gap: 1px;
          }
          .verified-pill {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            padding: 1.5px 5px;
            background: #dcfce7;
            border: 1px solid #86efac;
            border-radius: 4px;
            font-size: ${is2In1 ? '10.5px' : (is4In1 ? '9px' : '7px')};
            font-weight: 900;
            color: #14532d;
            white-space: nowrap;
          }
          .dot {
            color: #16a34a;
            font-size: 6px;
          }
          .auth-code {
            font-size: ${is2In1 ? '10px' : (is4In1 ? '8.5px' : '7px')};
            font-family: monospace;
            font-weight: bold;
            color: #475569;
            white-space: nowrap;
          }
          .footer-right {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }
          .sign-img {
            height: ${is2In1 ? '28px' : (is4In1 ? '20px' : '14px')};
            max-width: 90px;
            object-fit: contain;
          }
          .sign-text {
            font-style: italic;
            font-size: ${is2In1 ? '11px' : (is4In1 ? '9px' : '7px')};
            color: #475569;
          }
          .signatory-title {
            font-size: ${is2In1 ? '13px' : (is4In1 ? '11px' : '8px')};
            font-weight: 900;
            color: #020617;
            margin-top: 1px;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
        <script>
          window.onload = function() {
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(function() {
                setTimeout(function() { window.print(); }, 250);
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
 * Dedicated Single Officer "सहयोगार्थ पुलिस बल" Duty Pass Print Engine
 * Renders the exact official UP Police layout with Co-deployed colleagues, dual badges, photo frame, QR code and signature.
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
  isBriefingEnabled = true,
  includeBackSide = true
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
      isBriefingEnabled,
      includeBackSide
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
 * Helper to clean raw name string by stripping duplicate mobile numbers,
 * trailing noise, and separating clean name from posting/thana/district.
 */
export function cleanOfficerNameAndTitle(rawName = '', posting = '', district = '', mobile = '') {
  if (!rawName) return '';
  let s = String(rawName).trim();

  // 1. Remove 10-digit mobile numbers from name text
  s = s.replace(/\b[6-9]\d{9}\b/g, '');
  if (mobile) {
    const cleanMob = String(mobile).trim();
    if (cleanMob.length >= 5) {
      s = s.replace(new RegExp(`\\b${cleanMob}\\b`, 'g'), '');
    }
  }

  // 2. Remove trailing noise
  s = s.replace(/[,।]?\s*नं0?[-:]?\s*$/g, '').replace(/[,।]?\s*नं\s*\(?.*$/g, '');

  // 3. Remove posting / thana if passed
  if (posting && String(posting).trim().length >= 2) {
    const p = String(posting).trim();
    s = s.replace(new RegExp(`(?:थाना\\s*)?${p}`, 'gi'), ' ');
  }

  // 4. Remove district if passed
  if (district && String(district).trim().length >= 2) {
    const d = String(district).trim();
    s = s.replace(new RegExp(`(?:जनपद\\s*)?${d}`, 'gi'), ' ');
  }

  // 5. Remove common station/line unit tags accidentally appended to officer names
  s = s.replace(/(?:थाना|कोतवाली|चौकी|पुलिस\s*लाइन|महिला\s*थाना|वाहिनी|पीएसी)\s*[^,\n]*/gi, ' ');

  // 6. Clean punctuation & whitespace
  s = s.replace(/,\s*,/g, ',').replace(/\s*,\s*$/, '').replace(/^[\s,]+/, '').replace(/\s+/g, ' ').trim();

  return s || rawName;
}

/**
 * Helper to format clean posting & district without duplicate repetition
 */
export function formatCleanPosting(posting = '', district = '') {
  let p = (posting || '').trim();
  let d = (district || '').trim();
  if (p === '-' || p === 'null' || p === 'undefined') p = '';
  if (d === '-' || d === 'null' || d === 'undefined') d = '';

  if (p && d) {
    if (p.toLowerCase().includes(d.toLowerCase())) {
      return p;
    }
    return `${p} (${d})`;
  }
  if (p) return p;
  if (d) return `जनपद ${d}`;
  return '-';
}

/**
 * HTML Generator for Individual "सहयोगार्थ पुलिस बल" Duty Pass
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
  isBriefingEnabled = true,
  includeBackSide = false,
  autoPrint = true
}) {
  if (!duty) return '';

  const phoneSvg = `
    <svg style="width:12px;height:12px;stroke:#0f172a;display:inline-block;vertical-align:middle;margin-right:4px;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
  `;

  const usersSvg = `
    <svg style="width:14px;height:14px;stroke:#ffffff;display:inline-block;vertical-align:middle;margin-right:5px;flex-shrink:0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  `;

  const activeNote = (isNoteEnabled !== false && customNote) ? customNote : (isNoteEnabled ? (duty.note || '') : '');
  const activeBriefing = (isBriefingEnabled !== false && customBriefing) ? customBriefing : (isBriefingEnabled ? (duty.briefing_place || '') : '');

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
  if (cleanZonalIncharge && cleanZone.includes(cleanZonalIncharge)) {
    cleanZone = cleanZone.replace(cleanZonalIncharge, '').replace(/\/+\s*$/, '').trim();
  }

  // Cross-lookup in allRecords for zonal incharge if missing
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
  if (cleanSectorIncharge && cleanSector.includes(cleanSectorIncharge)) {
    cleanSector = cleanSector.replace(cleanSectorIncharge, '').replace(/\/+\s*$/, '').trim();
  }

  // Cross-lookup in allRecords for sector incharge if missing
  if (!cleanSectorIncharge && cleanSector && Array.isArray(allRecords)) {
    const matchedSectorRec = allRecords.find(r => {
      if (!r) return false;
      const rSec = (r.sector || '').trim().toLowerCase();
      const currSec = cleanSector.toLowerCase();
      const isSameSector = rSec === currSec || rSec.startsWith(currSec) || currSec.startsWith(rSec);
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
      return isSameSector && inc && inc !== '-';
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

  cleanZone = cleanZone.replace(/\/+\s*$/, '').trim();
  cleanSector = cleanSector.replace(/\/+\s*$/, '').trim();
  if (cleanZonalIncharge && cleanZone.includes(cleanZonalIncharge)) {
    cleanZone = cleanZone.replace(cleanZonalIncharge, '').replace(/\/+\s*$/, '').trim();
  }
  if (cleanSectorIncharge && cleanSector.includes(cleanSectorIncharge)) {
    cleanSector = cleanSector.replace(cleanSectorIncharge, '').replace(/\/+\s*$/, '').trim();
  }

  // Find co-deployed force at the exact same duty place
  const coForceList = (allRecords || []).filter(r => 
    r && 
    r.id !== duty.id && 
    (r.duty_place || '').trim() && 
    (r.duty_place || '').trim().toLowerCase() === (duty.duty_place || '').trim().toLowerCase()
  );

  const photoHtml = duty.photo
    ? `<img src="${duty.photo}" style="width:100%;height:100%;object-fit:cover;" />`
    : `
      <div style="text-align:center;color:#64748b;font-size:9px;font-weight:bold;line-height:1.2;">
        📷<br />पासपोर्ट फोटो<br />चस्पा करें
      </div>
    `;

  const signHtml = signatureImg
    ? `<img src="${signatureImg}" style="height:36px;max-width:130px;object-fit:contain;margin-bottom:2px;" />`
    : `<div style="font-style:italic;font-size:10px;color:#475569;margin-bottom:4px;">(हस्ताक्षरित)</div>`;

  let qrSvgHtml = '';
  try {
    const authCode = (duty.id && !String(duty.id).toUpperCase().startsWith('DUTY-') ? String(duty.id) : '') || `AUTH-${Math.abs(hashCode(duty.name + (duty.mobile || '') + (duty.duty_place || ''))).toString(36).toUpperCase()}`;

    const qrPayload = [
      `नाम: ${(duty.name || '').trim()}`,
      `मोबाइल: ${(duty.mobile || '').trim()}`,
      `मूल तैनाती: ${(duty.posting || '').trim()}`,
      `जिला: ${(duty.district || '').trim()}`,
      `ड्यूटी पॉइंट: ${(duty.duty_place || '').trim()}`,
      `सत्यापन कोड: ${authCode}`
    ].join('\n');

    qrSvgHtml = renderToString(
      React.createElement(QRCodeSVG, {
        value: qrPayload,
        size: 65,
        level: 'L',
        includeMargin: false
      })
    );
  } catch (e) {
    qrSvgHtml = '';
  }

  const cleanMainOfficerName = cleanOfficerNameAndTitle(duty.name || duty.composite_details, duty.posting, duty.district, duty.mobile);
  const cleanMainPosting = formatCleanPosting(duty.posting || duty.posting_place || duty.thana, duty.district);
  const cleanPnoText = (duty.pno && !String(duty.pno).toUpperCase().startsWith('DUTY-'))
    ? String(duty.pno)
    : (duty.id && !String(duty.id).toUpperCase().startsWith('DUTY-') && String(duty.id).length <= 12)
      ? String(duty.id)
      : '';

  let coForceHtml = '';
  if (coForceList.length > 0) {
    const maxVisible = 5;
    const displayedCoForce = coForceList.slice(0, maxVisible);
    const remainingCount = coForceList.length - displayedCoForce.length;

    const coRows = displayedCoForce.map((colleague, cIdx) => {
      const cleanColleagueName = cleanOfficerNameAndTitle(colleague.name, colleague.posting, colleague.district, colleague.mobile);
      const cleanColleaguePosting = formatCleanPosting(colleague.posting, colleague.district);

      return `
        <tr style="background:${cIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:bold;color:#64748b;font-family:monospace;">${cIdx + 1}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:800;color:#0f172a;">${escapeHtml(cleanColleagueName)}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-family:monospace;font-weight:700;color:#0f172a;white-space:nowrap;">${phoneSvg}${escapeHtml(colleague.mobile || '-')}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;color:#334155;font-weight:600;">${escapeHtml(cleanColleaguePosting)}</td>
        </tr>
      `;
    }).join('');

    coForceHtml = `
      <div style="border:1.5px solid #0f172a;border-radius:8px;overflow:hidden;margin-top:12px;background:#ffffff;">
        <div style="background:#1e293b;padding:6px 12px;display:flex;align-items:center;justify-content:space-between;">
          <div style="font-weight:800;color:#ffffff;font-size:12px;display:flex;align-items:center;">
            ${usersSvg}
            <span>सहयोगार्थ पुलिस बल (उसी स्थल पर तैनात अन्य पुलिसकर्मी):</span>
          </div>
          <span style="font-size:10.5px;font-weight:bold;color:#f8fafc;background:#334155;padding:2px 8px;border-radius:12px;font-family:monospace;">कुल: ${coForceList.length} जवान</span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:left;">
          <thead>
            <tr style="background:#f1f5f9;color:#334155;font-weight:800;font-size:12px;">
              <th style="padding:6px 8px;border:1px solid #cbd5e1;width:35px;text-align:center;">क्र०</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;">पद व नाम</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;width:125px;">मोबाइल नंबर</th>
              <th style="padding:6px 8px;border:1px solid #cbd5e1;width:160px;">मूल तैनाती (जनपद)</th>
            </tr>
          </thead>
          <tbody>
            ${coRows}
          </tbody>
        </table>
        ${remainingCount > 0 ? `
          <div style="background:#fffbeb;border-top:1px solid #fde68a;padding:4px;text-align:center;font-size:11px;font-weight:900;color:#92400e;">
            और भी सहयोगार्थ हैं......
          </div>
        ` : ''}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(cleanMainOfficerName || 'ड्यूटी पास')} - ${escapeHtml(eventTitle || 'उत्तर प्रदेश पुलिस')}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @font-face {
          font-family: 'Kokila';
          src: url('/fonts/kokila.ttf') format('truetype'),
               local('Kokila'), local('Kokila-Regular'), local('kokila');
          font-weight: 400;
          font-style: normal;
        }
        @font-face {
          font-family: 'Kokila';
          src: url('/fonts/kokilab.ttf') format('truetype'),
               local('Kokila Bold'), local('Kokila-Bold'), local('kokilab');
          font-weight: 700 900;
          font-style: normal;
        }
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Kokila', 'Mangal', 'Mukta', 'Noto Sans Devanagari', sans-serif !important;
        }
        body {
          font-family: 'Kokila', 'Mangal', 'Mukta', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          background: #ffffff;
          color: #0f172a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          padding: 10px;
          letter-spacing: 0.15px;
        }
        .pass-container {
          max-width: 680px;
          margin: 0 auto;
          border: 2px solid #0f172a;
          border-radius: 10px;
          padding: 16px 20px;
          background: #ffffff;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .header-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .badge-img {
          width: 52px;
          height: 52px;
          object-fit: contain;
        }
        .title-box {
          text-align: center;
        }
        .main-title {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.2;
        }
        .sub-title {
          font-size: 13px;
          font-weight: 800;
          color: #475569;
          margin-top: 3px;
        }
        .officer-box {
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 14px;
          background: #f8fafc;
          margin-bottom: 12px;
        }
        .photo-slot {
          width: 68px;
          height: 84px;
          border: 1.5px solid #94a3b8;
          border-radius: 6px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .officer-details {
          flex: 1;
        }
        .officer-name {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .officer-meta {
          font-size: 12px;
          color: #475569;
          margin-top: 4px;
          font-weight: 600;
        }
        .officer-mob {
          font-family: monospace;
          font-size: 13.5px;
          font-weight: 800;
          color: #1e3a8a;
          margin-top: 3px;
          display: flex;
          align-items: center;
        }
        .duty-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.5px solid #0f172a;
          border-radius: 6px;
          overflow: hidden;
          font-size: 14px;
          background: #ffffff;
        }
        .duty-table td {
          padding: 7px 12px;
          border-bottom: 1px solid #cbd5e1;
          border-right: 1px solid #cbd5e1;
        }
        .duty-table tr:last-child td {
          border-bottom: none;
        }
        .duty-table .lbl-td {
          width: 28%;
          background: #f1f5f9;
          font-weight: 900;
          color: #0f172a;
          font-size: 14px;
          border-right: 1.5px solid #cbd5e1;
        }
        .duty-table .val-td {
          font-weight: 700;
          color: #0f172a;
          font-size: 14px;
        }
        .duty-place-val {
          font-size: 17px;
          font-weight: 900;
          color: #78350f;
          background: #fef3c7;
        }
        .footer-bar {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          border-top: 1.5px solid #0f172a;
          padding-top: 10px;
          margin-top: 12px;
        }
        .verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
          padding: 3px 9px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
        }
        .sign-title {
          font-size: 12px;
          font-weight: 900;
          color: #0f172a;
          text-align: right;
          margin-top: 3px;
        }
      </style>
    </head>
    <body>
      <div class="pass-container" style="max-width:680px; margin:0 auto; border:2px solid #0f172a; border-radius:10px; padding:14px 18px; background:#ffffff; box-sizing:border-box;">
        <!-- 1. Header -->
        <div class="header-bar" style="display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #0f172a; padding-bottom:8px; margin-bottom:10px; width:100%;">
          <img src="/badge.png" class="badge-img" style="width:48px; height:48px; max-width:48px; max-height:48px; object-fit:contain; flex-shrink:0;" alt="UP Police" />
          <div class="title-box" style="text-align:center; flex:1; padding:0 8px;">
            <h1 class="main-title" style="font-size:18px; font-weight:900; color:#0f172a; line-height:1.2; margin:0;">${escapeHtml(eventTitle || 'उत्तर प्रदेश पुलिस')}</h1>
            <p class="sub-title" style="font-size:12px; font-weight:800; color:#475569; margin:2px 0 0 0;">${escapeHtml(eventSubtitle || 'डिजिटल ड्यूटी पास')}</p>
          </div>
          <img src="/badge.png" class="badge-img" style="width:48px; height:48px; max-width:48px; max-height:48px; object-fit:contain; flex-shrink:0;" alt="UP Police" />
        </div>

        <!-- 2. Officer Bar -->
        <div class="officer-box" style="display:flex; align-items:center; gap:12px; border:1.5px solid #cbd5e1; border-radius:8px; padding:8px 12px; background:#f8fafc; margin-bottom:10px; width:100%; box-sizing:border-box;">
          <div class="photo-slot" style="width:68px; height:84px; border:1.5px solid #94a3b8; border-radius:6px; background:#ffffff; display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0;">
            ${photoHtml}
          </div>
          <div class="officer-details" style="flex:1; min-width:0;">
            <div class="officer-name" style="font-size:17px; font-weight:900; color:#0f172a; line-height:1.2;">
              <span>${escapeHtml(cleanMainOfficerName || '-')}</span>
            </div>
            <div class="officer-mob" style="font-family:monospace; font-size:13px; font-weight:800; color:#1e3a8a; margin-top:3px; display:flex; align-items:center; gap:4px;">
              ${phoneSvg}<span style="letter-spacing:0.5px;">${escapeHtml(duty.mobile || '-')}</span>
            </div>
            <div class="officer-meta" style="font-size:11.5px; color:#475569; margin-top:4px; font-weight:600;">
              ${cleanPnoText ? `PNO: <strong style="font-family:monospace; color:#0f172a;">${escapeHtml(cleanPnoText)}</strong> | ` : ''}मूल तैनाती: <strong style="color:#0f172a;">${escapeHtml(cleanMainPosting)}</strong>
            </div>
          </div>
          <div style="text-align:center; padding:4px 6px; background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; flex-shrink:0;">
            ${qrSvgHtml}
            <div style="font-size:8px; font-weight:800; color:#475569; margin-top:2px;">स्कैन सत्यापन</div>
          </div>
        </div>

        <!-- 3. Duty Table -->
        <table class="duty-table" style="width:100%; border-collapse:collapse; border:1.5px solid #0f172a; border-radius:6px; overflow:hidden; font-size:13px; background:#ffffff; margin-bottom:10px;">
          <tbody>
            <tr>
              <td class="lbl-td" style="width:25%; background:#f1f5f9; font-weight:900; color:#0f172a; padding:6px 10px; border-bottom:1px solid #cbd5e1; border-right:1.5px solid #cbd5e1;">
                ड्यूटी का स्थान
              </td>
              <td class="val-td duty-place-val" style="font-size:15.5px; font-weight:900; color:#78350f; background:#fef3c7; padding:6px 10px; border-bottom:1px solid #cbd5e1;">
                🚩 ${escapeHtml(duty.duty_place || '-')}
              </td>
            </tr>
            ${duty.booth_no ? `
            <tr>
              <td class="lbl-td" style="width:25%; background:#f1f5f9; font-weight:900; color:#0f172a; padding:5px 10px; border-bottom:1px solid #cbd5e1; border-right:1.5px solid #cbd5e1;">
                बूथ सं० / श्रेणी
              </td>
              <td class="val-td" style="padding:5px 10px; border-bottom:1px solid #cbd5e1; color:#0f172a; font-weight:800;">
                बूथ सं० <strong>${escapeHtml(duty.booth_no)}</strong> ${duty.category ? `(${escapeHtml(duty.category)})` : ''}
              </td>
            </tr>` : ''}
            ${(duty.vehicle_no || duty.bus_no) ? `
            <tr>
              <td class="lbl-td" style="width:25%; background:#f1f5f9; font-weight:900; color:#0f172a; padding:5px 10px; border-bottom:1px solid #cbd5e1; border-right:1.5px solid #cbd5e1;">
                वाहन संख्या
              </td>
              <td class="val-td" style="padding:5px 10px; border-bottom:1px solid #cbd5e1; color:#0f172a; font-weight:800; font-family:monospace;">
                🚌 वाहन सं० <strong>${escapeHtml(duty.vehicle_no || duty.bus_no)}</strong>
              </td>
            </tr>` : ''}
            ${(duty.weapon || duty.duty_type || duty.weapon_type) ? `
            <tr>
              <td class="lbl-td" style="width:25%; background:#f1f5f9; font-weight:900; color:#0f172a; padding:5px 10px; border-bottom:1px solid #cbd5e1; border-right:1.5px solid #cbd5e1;">
                शस्त्र स्थिति
              </td>
              <td class="val-td" style="padding:5px 10px; border-bottom:1px solid #cbd5e1; color:#0f172a; font-weight:800;">
                🛡️ ${escapeHtml(duty.weapon || duty.duty_type || duty.weapon_type)}
              </td>
            </tr>` : ''}
            ${(duty.capf || duty.pac) ? `
            <tr>
              <td class="lbl-td" style="width:25%; background:#f1f5f9; font-weight:900; color:#0f172a; padding:5px 10px; border-bottom:1px solid #cbd5e1; border-right:1.5px solid #cbd5e1;">
                सीएपीएफ/पीएसी
              </td>
              <td class="val-td" style="padding:5px 10px; border-bottom:1px solid #cbd5e1; color:#0f172a; font-weight:800;">
                🎖️ ${escapeHtml(duty.capf || duty.pac)}
              </td>
            </tr>` : ''}
            <tr>
              <td class="lbl-td" style="width:25%; background:#f1f5f9; font-weight:900; color:#0f172a; padding:5px 10px; border-bottom:1px solid #cbd5e1; border-right:1.5px solid #cbd5e1;">
                दिनाँक व समय
              </td>
              <td class="val-td" style="padding:5px 10px; border-bottom:1px solid #cbd5e1; font-weight:700; color:#0f172a;">
                ⏰ ${escapeHtml(duty.shift || '-')}
              </td>
            </tr>
            <tr>
              <td class="lbl-td" style="width:25%; background:#f1f5f9; font-weight:900; color:#0f172a; padding:5px 10px; border-bottom:1px solid #cbd5e1; border-right:1.5px solid #cbd5e1;">
                जोन / जोनल प्रभारी
              </td>
              <td class="val-td" style="padding:5px 10px; border-bottom:1px solid #cbd5e1;">
                <div style="display:flex; flex-direction:column; gap:2px;">
                  <div style="font-weight:800; color:#0f172a; ${cleanZonalIncharge ? 'padding-bottom:2px; border-bottom:1px dotted #94a3b8;' : ''}">
                    <span style="color:#64748b; font-weight:700;">जोन:</span> ${escapeHtml(cleanZone || '-')}
                  </div>
                  ${cleanZonalIncharge ? `
                    <div style="padding-top:2px; font-weight:800; color:#1e3a8a;">
                      <span style="color:#64748b; font-weight:700;">जोनल प्रभारी:</span> ${escapeHtml(cleanZonalIncharge)}
                    </div>
                  ` : ''}
                </div>
              </td>
            </tr>
            <tr>
              <td class="lbl-td" style="width:25%; background:#f1f5f9; font-weight:900; color:#0f172a; padding:5px 10px; border-bottom:1px solid #cbd5e1; border-right:1.5px solid #cbd5e1;">
                सेक्टर / सेक्टर प्रभारी
              </td>
              <td class="val-td" style="padding:5px 10px; border-bottom:1px solid #cbd5e1;">
                <div style="display:flex; flex-direction:column; gap:2px;">
                  <div style="font-weight:800; color:#0f172a; ${cleanSectorIncharge ? 'padding-bottom:2px; border-bottom:1px dotted #94a3b8;' : ''}">
                    <span style="color:#64748b; font-weight:700;">सेक्टर:</span> ${escapeHtml(cleanSector || '-')}
                  </div>
                  ${cleanSectorIncharge ? `
                    <div style="padding-top:2px; font-weight:800; color:#1e3a8a;">
                      <span style="color:#64748b; font-weight:700;">सेक्टर प्रभारी:</span> ${escapeHtml(cleanSectorIncharge)}
                    </div>
                  ` : ''}
                </div>
              </td>
            </tr>
            ${activeBriefing ? `
            <tr>
              <td class="lbl-td" style="width:25%; background:#f1f5f9; font-weight:900; color:#0f172a; padding:5px 10px; border-bottom:1px solid #cbd5e1; border-right:1.5px solid #cbd5e1;">
                ब्रीफिंग स्थान
              </td>
              <td class="val-td" style="padding:5px 10px; border-bottom:1px solid #cbd5e1; font-weight:800; color:#0f172a;">
                📍 ${escapeHtml(activeBriefing)}
              </td>
            </tr>` : ''}
            ${activeNote ? `
            <tr>
              <td class="lbl-td" style="width:25%; background:#f1f5f9; font-weight:900; color:#0f172a; padding:5px 10px; border-bottom:1px solid #cbd5e1; border-right:1.5px solid #cbd5e1;">
                विशेष निर्देश
              </td>
              <td class="val-td" style="padding:5px 10px; border-bottom:1px solid #cbd5e1; color:#334155; font-size:11px; line-height:1.35;">
                📌 ${escapeHtml(activeNote)}
              </td>
            </tr>` : ''}
          </tbody>
        </table>

        <!-- 4. Sahyogarth Co-deployed Force Table -->
        ${coForceHtml}

        <!-- 5. Footer -->
        <div class="footer-bar" style="display:flex; align-items:flex-end; justify-content:space-between; border-top:1.5px solid #0f172a; padding-top:8px; margin-top:10px; width:100%;">
          <div>
            <div class="verified-badge" style="display:inline-flex; align-items:center; gap:5px; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; padding:2px 8px; border-radius:20px; font-size:9.5px; font-weight:800;">
              <span style="color:#16a34a; font-size:11px;">●</span>
              <span>डिजिटल सत्यापित पास (UP POLICE)</span>
            </div>
            <div style="font-size:9.5px; color:#475569; font-weight:700; margin-top:3px;">
              कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या
            </div>
          </div>

          <div style="text-align:right;">
            ${signHtml}
            <div class="sign-title" style="font-size:11.5px; font-weight:900; color:#0f172a; text-align:right; margin-top:2px;">${escapeHtml(signatoryText)}</div>
          </div>
        </div>

        <!-- Smart Cell Ayodhya Footer -->
        <div style="background:#0b132b; color:#ffffff; font-size:8.5px; font-weight:900; letter-spacing:1px; text-align:center; padding:3.5px 0; border-radius:4px; margin-top:8px; text-transform:uppercase;">
          DESIGN AND DEVELOPED BY SMART CELL AYODHYA
        </div>
      </div>

      ${includeBackSide ? `
      <!-- ================= PAGE 2: OFFICIAL BACK SIDE ================= -->
      <div class="pass-container" style="page-break-before:always; break-before:page; margin-top:20px;">
        <div style="border-bottom:2px solid #0f172a; padding-bottom:6px; margin-bottom:10px; text-align:center;">
          <div style="font-size:18px; font-weight:900; color:#0f172a;">
            ⚖️ पुलिस कर्मियों हेतु 16 महत्वपूर्ण निर्देश (आदर्श आचार संहिता व कर्तव्य)
          </div>
          <div style="font-size:12px; color:#475569; font-weight:bold; margin-top:2px;">
            कार्यालय वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या — निष्पक्ष, निर्भीक व पारदर्शी निर्वाचन 2024
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1.15fr 1fr; gap:14px; font-size:11.5px; line-height:1.35;">
          <!-- Left: 16 Instructions -->
          <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:10px;">
            <div style="font-size:13px; font-weight:900; color:#1e293b; border-bottom:1.5px solid #cbd5e1; padding-bottom:4px; margin-bottom:6px;">
              📋 अनिवार्य आचार संहिता हिदायतें:
            </div>
            <div style="space-y:4px;">
              ${ELECTION_DUTY_CARD_INSTRUCTIONS.map(inst => `
                <div style="margin-bottom:5px; text-align:justify; color:#0f172a;">
                  ${escapeHtml(inst)}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Right: CUG Directory -->
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="font-size:13px; font-weight:900; color:#0f172a; text-align:center; background:#e2e8f0; padding:4px; border-radius:4px; margin-bottom:8px;">
                📞 महत्वपूर्ण सीयूजी दूरभाष निर्देशिका
              </div>

              <div style="margin-bottom:8px;">
                <div style="font-weight:900; color:#b45309; font-size:12px; margin-bottom:2px;">उच्चाधिकारीगण:</div>
                <div style="font-size:11px; line-height:1.3;">
                  ${ELECTION_CUG_DIRECTORY.higher_officers.map(h => `<div>${escapeHtml(h.designation)}: <strong>${escapeHtml(h.mobile)}</strong></div>`).join('')}
                </div>
              </div>

              <div style="margin-bottom:8px;">
                <div style="font-weight:900; color:#047857; font-size:12px; margin-bottom:2px;">कंट्रोल रूम:</div>
                <div style="font-size:11px; line-height:1.3;">
                  <div>पुलिस नियंत्रण कक्ष: <strong>9454402648</strong> / 112</div>
                  <div>जनपद चुनाव कंट्रोल रूम: <strong>9454417465</strong> / 05278-224218</div>
                </div>
              </div>

              <div style="margin-bottom:8px;">
                <div style="font-weight:900; color:#1d4ed8; font-size:12px; margin-bottom:2px;">उपजिलाधिकारी / क्षेत्राधिकारी:</div>
                <div style="font-size:10.5px; line-height:1.3; max-height:110px; overflow-y:auto;">
                  ${ELECTION_CUG_DIRECTORY.sub_divisions.map(s => `<div>${escapeHtml(s.sdm)}: <strong>${escapeHtml(s.sdm_mobile)}</strong> | ${escapeHtml(s.co)}: <strong>${escapeHtml(s.co_mobile)}</strong></div>`).join('')}
                </div>
              </div>

              <div>
                <div style="font-weight:900; color:#be123c; font-size:12px; margin-bottom:2px;">थाना प्रभारी (SHOs):</div>
                <div style="font-size:10px; line-height:1.25; max-height:120px; overflow-y:auto;">
                  ${ELECTION_CUG_DIRECTORY.police_stations.map(t => `<span style="display:inline-block; margin-right:6px;">${escapeHtml(t.thana)}: <strong>${escapeHtml(t.mobile)}</strong></span>`).join(' | ')}
                </div>
              </div>
            </div>

            <div style="border-top:1.5px solid #0f172a; padding-top:6px; margin-top:10px; text-align:center; font-weight:900; font-size:13px; color:#0f172a;">
              ( वरिष्ठ पुलिस अधीक्षक, जनपद अयोध्या )
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      ${autoPrint ? `
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
      ` : ''}
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
