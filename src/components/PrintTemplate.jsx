import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MapPin, Phone, Clock, User, CheckCircle2 } from 'lucide-react';
import UpPoliceLogo from './UpPoliceLogo';
import { resolvePoliceRank, stripRankFromName, parseIncharge } from '../utils/rankResolver';

export default function PrintTemplate({
  duty,
  allRecords = [],
  customNote = '',
  isNoteEnabled = true,
  customBriefing = '',
  isBriefingEnabled = true,
  eventTitle = '',
  eventSubtitle = '',
  signatureImg = '',
  signatoryText = 'वरिष्ठ पुलिस अधीक्षक, अयोध्या',
  isCoForceEnabled = true,
  includeBackSide = true
}) {
  if (!duty) return null;

  const activeBriefingPlace = (isBriefingEnabled !== false && customBriefing)
    ? customBriefing
    : (isBriefingEnabled ? (duty.briefing_place || '') : '');

  const effectiveRank = duty?.rank ? resolvePoliceRank(duty.rank) : '';
  const cleanOfficerName = stripRankFromName(duty?.name) || '-';

  const cleanPno = (duty.pno && !String(duty.pno).startsWith('DUTY-'))
    ? String(duty.pno)
    : (duty.id && !String(duty.id).startsWith('DUTY-') && String(duty.id).length <= 12)
      ? String(duty.id)
      : null;

  // Incharge & Mobile extraction
  let rawZonal = duty.zonal_incharge || duty.zonal || duty.zonal_officer || duty['जोनाल प्रभारी'] || duty['जोनल प्रभारी'] || '';
  let rawSector = duty.sector_incharge || duty.sector_officer || duty['सेक्टर प्रभारी'] || duty['सेक्टर अधिकारी'] || '';

  const effectiveZone = duty.zone ? String(duty.zone).replace(/\/+$/, '').trim() : '';
  const effectiveSector = duty.sector ? String(duty.sector).replace(/\/+$/, '').trim() : '';

  if (!rawZonal && effectiveZone && Array.isArray(allRecords)) {
    const matched = allRecords.find(r => r && (r.zone || '').trim().toLowerCase() === effectiveZone.toLowerCase() && (r.zonal_incharge || r.zonal || r.zonal_officer));
    if (matched) rawZonal = matched.zonal_incharge || matched.zonal || matched.zonal_officer || '';
  }

  if (!rawSector && effectiveSector && Array.isArray(allRecords)) {
    const matched = allRecords.find(r => r && (r.sector || '').trim().toLowerCase() === effectiveSector.toLowerCase() && (r.sector_incharge || r.sector_officer));
    if (matched) rawSector = matched.sector_incharge || matched.sector_officer || '';
  }

  const zonalInfo = parseIncharge(rawZonal);
  const sectorInfo = parseIncharge(rawSector);
  const zonalMobile = zonalInfo.mobile || duty.zonal_mobile || duty.zone_mobile || '';
  const sectorMobile = sectorInfo.mobile || duty.sector_mobile || '';

  const searchParam = (duty.mobile || duty.pno || duty.id || '').trim();
  const qrDirectUrl = typeof window !== 'undefined' && window.location?.origin
    ? `${window.location.origin}/?search=${encodeURIComponent(searchParam)}`
    : '';

  const qrPayload = qrDirectUrl || JSON.stringify({
    id: duty.id,
    name: duty.name,
    mobile: duty.mobile,
    duty_place: duty.duty_place,
    auth: "UP_POLICE_SECURE_VERIFIED"
  });

  return (
    <div className="w-full flex flex-col items-center justify-center p-2">
      {/* ================= 2-SIDED FOLDABLE LANYARD PASS UNIT (180mm x 112mm) ================= */}
      <div
        className="foldable-pass-unit bg-white text-slate-950 border-[1.5px] border-[#0f172a] rounded-lg shadow-sm overflow-hidden select-none font-devanagari relative flex flex-row"
        style={{
          width: '180mm',
          height: '112mm',
          maxHeight: '112mm',
          boxSizing: 'border-box'
        }}
      >
        {/* ================= LEFT PANEL = FRONT SIDE (90mm x 112mm) ================= */}
        <div
          className="pass-panel-front bg-white p-2 flex flex-col justify-between relative border-r-[1.5px] border-dashed border-slate-300 overflow-hidden"
          style={{
            width: '90mm',
            height: '112mm',
            maxHeight: '112mm',
            boxSizing: 'border-box'
          }}
        >
          {/* 1. Lanyard Punch Slot Indicator */}
          <div className="pt-0.5 pb-0.5 text-center shrink-0">
            <div
              className="w-10 h-1.5 rounded-full border border-slate-300 bg-slate-100 mx-auto flex items-center justify-center shadow-inner"
              title="लैनयार्ड पंच स्लॉट"
            >
              <span className="w-1 h-0.5 bg-slate-400 rounded-full" />
            </div>
          </div>

          {/* 2. Official UP Police Header Banner (Dark Navy #0f172a with 2.5px Crimson Red #dc2626 border) */}
          <div className="bg-[#0f172a] text-white px-2 py-1.5 border-b-[2.5px] border-[#dc2626] flex items-center justify-between gap-1.5 shrink-0 rounded-t-md">
            <UpPoliceLogo size={30} />

            <div className="flex-1 text-center min-w-0 px-1">
              <div className="text-amber-400 font-bold text-[9.5px] tracking-wider uppercase whitespace-nowrap leading-normal">
                उत्तर प्रदेश पुलिस • अयोध्या
              </div>
              <h1 className="text-white font-extrabold text-[12.5px] leading-snug break-words my-0.5">
                {eventTitle || duty?.event_name || 'मा० मुख्यमंत्री उ०प्र० अयोध्या आगमन'}
              </h1>
              <div className="flex items-center justify-center gap-1.5">
                <span className="bg-[#dc2626] text-white text-[8px] px-2 py-0.2 rounded-full font-bold">
                  {eventSubtitle || 'ड्यूटी पास - 2026'}
                </span>
              </div>
            </div>

            <UpPoliceLogo size={30} />
          </div>

          {/* 3. Officer Identity Row */}
          <div className="px-1.5 pt-1.5 pb-1 flex items-center gap-2.5 shrink-0 bg-white">
            {/* Passport Photo Box */}
            <div
              className="w-[62px] min-w-[62px] h-[78px] border-2 border-slate-300 rounded-lg bg-slate-50 flex flex-col items-center justify-center text-center shrink-0 overflow-hidden shadow-2xs"
              style={{ width: '62px', minWidth: '62px', height: '78px' }}
            >
              {duty.photo ? (
                <img src={duty.photo} alt={cleanOfficerName} className="w-full h-full object-cover" />
              ) : (
                <div className="p-1 space-y-0.5 text-slate-400 flex flex-col items-center justify-center">
                  <User className="w-6 h-6 mx-auto text-slate-400 mb-0.5" />
                  <div className="text-[8.5px] font-bold text-slate-700 leading-tight">पासपोर्ट फोटो</div>
                  <div className="text-[7.5px] font-semibold text-slate-400 leading-none">चस्पा करें</div>
                </div>
              )}
            </div>

            {/* Officer Details Info (18px Name, 15.5px Mobile) */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[17px] font-extrabold text-slate-950 leading-tight break-words">
                  {cleanOfficerName}
                </span>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <span className="text-[15px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded tabular-nums inline-flex items-center gap-1 shadow-2xs">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{duty.mobile || 'अनुपलब्ध'}</span>
                </span>
              </div>

              <div className="text-[12px] font-medium text-slate-700 mt-1 whitespace-normal break-words leading-tight">
                मूल तैनाती: <strong className="text-slate-900 font-bold">{duty.posting || '-'}</strong> {duty.district ? `(${duty.district})` : ''}
                {cleanPno && <span className="ml-1.5 font-mono text-slate-900">| P.No: <strong>{cleanPno}</strong></span>}
              </div>
            </div>
          </div>

          {/* 4. Primary Duty Point Spotlight (High-contrast Amber Box) */}
          <div className="px-1 py-1 shrink-0">
            <div className="bg-amber-50 border-2 border-amber-500 border-l-4 border-l-amber-600 rounded-lg p-2 shadow-2xs">
              <div className="text-[10.5px] font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>ड्यूटी स्थल</span>
              </div>
              <div className="text-[15px] font-extrabold text-slate-950 leading-snug break-words whitespace-normal mt-0.5">
                {duty.duty_place || '-'}
              </div>
            </div>
          </div>

          {/* 5. Duty Date & Time Bar */}
          <div className="px-1 py-0.5 shrink-0">
            <div className="bg-slate-100 border border-slate-300 px-2 py-1.5 rounded-lg flex items-center justify-between gap-1">
              <div className="text-[12.5px] font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="text-slate-600 font-medium">दिनाँक व समय:</span>
                <span className="font-mono">{duty.shift || 'प्रातः 08:00 बजे से कार्यक्रम समाप्ति तक'}</span>
              </div>
              {(duty.booth_no || duty.vehicle_no || duty.weapon || duty.capf) && (
                <div className="flex items-center gap-1 shrink-0 text-[9px]">
                  {duty.booth_no && <span className="bg-blue-100 text-blue-900 px-1 py-0.2 rounded font-bold">बूथ: {duty.booth_no}</span>}
                  {duty.vehicle_no && <span className="bg-amber-100 text-amber-900 px-1 py-0.2 rounded font-bold">वाहन: {duty.vehicle_no}</span>}
                  {duty.weapon && <span className="bg-red-100 text-red-900 px-1 py-0.2 rounded font-bold">🛡️ {duty.weapon}</span>}
                </div>
              )}
            </div>
          </div>

          {/* 6. Bottom Security Footer */}
          <div className="px-2 py-1.5 border-t-2 border-slate-900 bg-slate-50 flex justify-between items-end w-full mt-auto rounded-b-md">
            {/* Left: QR Code + Digital Verification */}
            <div className="flex gap-2 items-center text-left">
              <div className="p-0.5 bg-white border border-slate-300 rounded shadow-2xs shrink-0">
                <QRCodeSVG value={qrPayload} size={48} level="M" />
              </div>
              <div className="text-left space-y-0.5">
                <div className="text-[9.5px] font-extrabold text-emerald-800 uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>डिजिटल सत्यापित पास</span>
                </div>
                <div className="text-[13px] font-extrabold font-mono text-slate-800">
                  ID: {cleanPno || duty.id || 'DUTY-0001'}
                </div>
              </div>
            </div>

            {/* Right: Signature & Authority */}
            <div className="text-right flex flex-col items-end">
              {signatureImg ? (
                <img
                  src={signatureImg}
                  alt="Official Signature"
                  className="h-6 max-w-[85px] object-contain mb-0.5"
                />
              ) : (
                <div className="font-serif italic text-[11px] text-slate-600 leading-none mb-0.5">
                  (हस्ताक्षरित)
                </div>
              )}
              <div className="text-[12.5px] font-extrabold text-slate-950 leading-tight">
                {signatoryText ? (signatoryText.includes(',') ? signatoryText.split(',')[0] + ',' : signatoryText) : 'वरिष्ठ पुलिस अधीक्षक,'}
              </div>
              <div className="text-[12.5px] font-extrabold text-slate-950 leading-tight">
                {signatoryText && signatoryText.includes(',') ? signatoryText.split(',').slice(1).join(',').trim() : 'अयोध्या'}
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANEL = BACK SIDE ================= */}
        <div
          className="pass-panel-back bg-white p-2 flex flex-col justify-between relative overflow-hidden"
          style={{
            width: '90mm',
            height: '112mm',
            maxHeight: '112mm',
            boxSizing: 'border-box'
          }}
        >
          {/* 1. Matching Lanyard Punch Slot Indicator */}
          <div className="pt-0.5 pb-0.5 text-center shrink-0">
            <div
              className="w-10 h-1.5 rounded-full border border-slate-300 bg-slate-100 mx-auto flex items-center justify-center shadow-inner"
              title="लैनयार्ड पंच स्लॉट"
            >
              <span className="w-1 h-0.5 bg-slate-400 rounded-full" />
            </div>
          </div>

          {/* 2. Slate Header (Clean UP Police Navy, no neon blue strip) */}
          <div className="bg-[#0f172a] text-white py-1.5 px-3 text-center font-extrabold text-[12.5px] rounded-t-md shrink-0 leading-normal">
            जोन, सेक्टर एवं ब्रीफिंग विवरण
          </div>

          {/* 3. Zone Card (NO Ellipsis, Full Text Wrap, NO floating watermark badge) */}
          <div className="bg-blue-50/70 border-2 border-blue-200 p-2.5 rounded-lg mb-1.5 shadow-2xs flex-1 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-blue-900 uppercase">
                <span>जोन विवरण</span>
              </div>
              <div className="text-[14px] font-black text-blue-950 leading-snug break-words whitespace-normal mt-0.5">
                {effectiveZone || 'जोन-01'}
              </div>
            </div>
            <div className="border-b border-blue-200 my-1" />
            <div className="text-[12.5px] font-medium text-slate-800 leading-snug break-words whitespace-normal">
              जोनल प्रभारी: <strong className="font-extrabold text-slate-950">{zonalInfo.name || 'नियुक्त अधिकारी'}</strong>
            </div>
            {duty.zonal_sahyogarth && (
              <div className="text-[11.5px] font-medium text-blue-900 mt-0.5 leading-snug break-words">
                सहयोगार्थ: <strong className="font-bold">{duty.zonal_sahyogarth}</strong>
              </div>
            )}
            {zonalMobile && (
              <div className="mt-1">
                <span className="text-[14.5px] font-extrabold text-blue-900 bg-white border border-blue-300 px-2 py-0.2 rounded tabular-nums inline-flex items-center gap-1 shadow-2xs">
                  <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{zonalMobile}</span>
                </span>
              </div>
            )}
          </div>

          {/* 4. Sector Card (NO Ellipsis, Full Text Wrap, NO floating watermark badge) */}
          <div className="bg-indigo-50/70 border-2 border-indigo-200 p-2.5 rounded-lg mb-1.5 shadow-2xs flex-1 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-indigo-900 uppercase">
                <span>सेक्टर विवरण</span>
              </div>
              <div className="text-[14px] font-black text-indigo-950 leading-snug break-words whitespace-normal mt-0.5">
                {effectiveSector || 'सेक्टर-01'}
              </div>
            </div>
            <div className="border-b border-indigo-200 my-1" />
            <div className="text-[12.5px] font-medium text-slate-800 leading-snug break-words whitespace-normal">
              सेक्टर प्रभारी: <strong className="font-extrabold text-slate-950">{sectorInfo.name || 'नियुक्त अधिकारी'}</strong>
            </div>
            {duty.sector_sahyogarth && (
              <div className="text-[11.5px] font-medium text-indigo-900 mt-0.5 leading-snug break-words">
                सहयोगार्थ: <strong className="font-bold">{duty.sector_sahyogarth}</strong>
              </div>
            )}
            {sectorMobile && (
              <div className="mt-1">
                <span className="text-[14.5px] font-extrabold text-indigo-900 bg-white border border-indigo-300 px-2 py-0.2 rounded tabular-nums inline-flex items-center gap-1 shadow-2xs">
                  <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{sectorMobile}</span>
                </span>
              </div>
            )}
          </div>

          {/* 5. Briefing Box */}
          <div className="bg-emerald-50 border-2 border-emerald-300 p-2 rounded-lg shadow-2xs shrink-0 mt-auto">
            <div className="text-[10px] font-bold text-emerald-900 uppercase flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>ब्रीफिंग स्थल व समय</span>
            </div>
            <div className="text-[12.5px] font-bold text-emerald-950 leading-snug break-words whitespace-normal mt-0.5">
              {activeBriefingPlace || 'दिनाँक- 01.11.2026 को पूर्वान्ह 13.00 बजे श्रीराम कथा पार्क नया घाट, अयोध्या'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
