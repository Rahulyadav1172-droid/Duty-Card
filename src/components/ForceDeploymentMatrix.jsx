import React, { useMemo } from 'react';
import { Shield, Users, Layers, Award, Printer } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Classify a police record into standard rank category
 */
export function classifyRank(record = {}) {
  const combined = `${record.rank || ''} ${record.name || ''} ${record.designation || ''} ${record.pad || ''}`.toLowerCase();
  
  if (combined.includes('निरीक्षक') || combined.includes('नि०') || combined.includes('insp') || combined.includes('inspector') || combined.includes('प्रभारी निरीक्षक') || combined.includes('sho')) {
    if (combined.includes('उप') || combined.includes('उ०') || combined.includes('sub')) {
      if (combined.includes('महिला') || combined.includes('म०') || combined.includes('wsi') || combined.includes('women')) {
        return 'wsi';
      }
      return 'si';
    }
    return 'insp';
  }
  
  if (combined.includes('उ०नि०') || combined.includes('उ0नि0') || combined.includes('उपनिरीक्षक') || combined.includes('sub inspector') || combined.includes(' s.i') || combined.includes(' si ') || combined.startsWith('si ')) {
    if (combined.includes('महिला') || combined.includes('म०') || combined.includes('wsi')) {
      return 'wsi';
    }
    return 'si';
  }

  if (combined.includes('हे०का०') || combined.includes('हे0का0') || combined.includes('हे०कां०') || combined.includes('मुख्य आरक्षी') || combined.includes('head const') || combined.includes(' hc ') || combined.includes('hc-')) {
    return 'hc';
  }

  if (combined.includes('महिला') || combined.includes('म०का०') || combined.includes('म0का0') || combined.includes('म०कां०') || combined.includes('wcp') || combined.includes('female')) {
    return 'wcp';
  }

  if (combined.includes('यातायात') || combined.includes('traffic') || combined.includes('टीएसआई') || combined.includes('टी०एस०आई०')) {
    return 'traffic';
  }

  if (combined.includes('होमगार्ड') || combined.includes('hg') || combined.includes('पीआरडी') || combined.includes('prd')) {
    return 'hg';
  }

  if (combined.includes('चालक') || combined.includes('driver')) {
    return 'driver';
  }

  // Default to Constable / आरक्षी
  return 'cp';
}

export default function ForceDeploymentMatrix({ records = [], eventTitle = '', compact = false }) {
  const { language } = useLanguage();

  const matrix = useMemo(() => {
    const zoneMap = new Map();
    const grandTotal = {
      insp: 0,
      si: 0,
      wsi: 0,
      hc: 0,
      cp: 0,
      wcp: 0,
      traffic: 0,
      hg: 0,
      driver: 0,
      total: 0
    };

    (records || []).forEach(rec => {
      const z = (rec.zone || (language === 'en' ? 'General Zone' : 'सामान्य जोन')).trim();
      const rankCat = classifyRank(rec);

      if (!zoneMap.has(z)) {
        zoneMap.set(z, {
          zone: z,
          insp: 0,
          si: 0,
          wsi: 0,
          hc: 0,
          cp: 0,
          wcp: 0,
          traffic: 0,
          hg: 0,
          driver: 0,
          total: 0
        });
      }

      const row = zoneMap.get(z);
      if (row[rankCat] !== undefined) {
        row[rankCat] += 1;
      } else {
        row.cp += 1;
      }
      row.total += 1;

      if (grandTotal[rankCat] !== undefined) {
        grandTotal[rankCat] += 1;
      } else {
        grandTotal.cp += 1;
      }
      grandTotal.total += 1;
    });

    return {
      rows: Array.from(zoneMap.values()),
      grandTotal
    };
  }, [records, language]);

  if (!records || records.length === 0) return null;

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-2 border-black dark:border-slate-700 rounded-xl overflow-hidden text-black dark:text-slate-100 shadow-sm print:border-black print:shadow-none font-devanagari my-3">
      {/* Header Banner */}
      <div className="bg-black text-white px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          <span className="font-extrabold text-xs sm:text-sm uppercase tracking-wide">
            {language === 'en' ? 'Zone-wise Police Force Deployment Summary' : 'ज़ोन-वार तैनात पुलिस बल विवरण'}
          </span>
        </div>
        <span className="text-[10px] font-mono bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black">
          {language === 'en' ? `Total Force: ${matrix.grandTotal.total}` : `कुल बल: ${matrix.grandTotal.total}`}
        </span>
      </div>

      {/* Structured Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] sm:text-xs text-center border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-extrabold border-b-2 border-black dark:border-slate-600">
              <th className="py-2 px-2 text-left border-r border-slate-300 dark:border-slate-700">
                {language === 'en' ? 'Zone Name' : 'जोन का नाम'}
              </th>
              <th className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 text-amber-700 dark:text-amber-400 font-black">
                {language === 'en' ? 'Insp' : 'निरीक्षक'}
              </th>
              <th className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 font-black">
                {language === 'en' ? 'S.I.' : 'उ०नि०'}
              </th>
              <th className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 text-purple-700 dark:text-purple-400 font-black">
                {language === 'en' ? 'W.S.I.' : 'म०उ०नि०'}
              </th>
              <th className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 font-black">
                {language === 'en' ? 'H.C.' : 'हे०का०'}
              </th>
              <th className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 font-black">
                {language === 'en' ? 'Const' : 'आरक्षी'}
              </th>
              <th className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 text-rose-700 dark:text-rose-400 font-black">
                {language === 'en' ? 'W.Const' : 'म०का०'}
              </th>
              <th className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 text-blue-700 dark:text-blue-400 font-black">
                {language === 'en' ? 'Traffic' : 'यातायात'}
              </th>
              <th className="py-2 px-1 border-r border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-black">
                {language === 'en' ? 'HG/PRD' : 'होमगार्ड'}
              </th>
              <th className="py-2 px-2 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 font-black">
                {language === 'en' ? 'Total' : 'कुल योग'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 dark:divide-slate-700">
            {matrix.rows.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'}>
                <td className="py-1.5 px-2 text-left font-bold text-slate-900 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700">
                  {row.zone}
                </td>
                <td className="py-1.5 px-1 border-r border-slate-300 dark:border-slate-700 font-mono font-bold text-amber-700 dark:text-amber-400">
                  {row.insp || '—'}
                </td>
                <td className="py-1.5 px-1 border-r border-slate-300 dark:border-slate-700 font-mono font-bold">
                  {row.si || '—'}
                </td>
                <td className="py-1.5 px-1 border-r border-slate-300 dark:border-slate-700 font-mono font-bold text-purple-700 dark:text-purple-400">
                  {row.wsi || '—'}
                </td>
                <td className="py-1.5 px-1 border-r border-slate-300 dark:border-slate-700 font-mono font-bold">
                  {row.hc || '—'}
                </td>
                <td className="py-1.5 px-1 border-r border-slate-300 dark:border-slate-700 font-mono font-bold">
                  {row.cp || '—'}
                </td>
                <td className="py-1.5 px-1 border-r border-slate-300 dark:border-slate-700 font-mono font-bold text-rose-700 dark:text-rose-400">
                  {row.wcp || '—'}
                </td>
                <td className="py-1.5 px-1 border-r border-slate-300 dark:border-slate-700 font-mono font-bold text-blue-700 dark:text-blue-400">
                  {row.traffic || '—'}
                </td>
                <td className="py-1.5 px-1 border-r border-slate-300 dark:border-slate-700 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {row.hg || '—'}
                </td>
                <td className="py-1.5 px-2 bg-amber-50/80 dark:bg-amber-950/30 font-mono font-black text-slate-900 dark:text-amber-300">
                  {row.total}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-200 dark:bg-slate-800 text-slate-950 dark:text-white font-black border-t-2 border-black dark:border-slate-600">
              <td className="py-2 px-2 text-left border-r border-slate-400 dark:border-slate-700 uppercase">
                {language === 'en' ? 'Total Deployed Force' : 'कुल तैनात पुलिस बल:'}
              </td>
              <td className="py-2 px-1 border-r border-slate-400 dark:border-slate-700 font-mono text-amber-800 dark:text-amber-300">
                {matrix.grandTotal.insp}
              </td>
              <td className="py-2 px-1 border-r border-slate-400 dark:border-slate-700 font-mono">
                {matrix.grandTotal.si}
              </td>
              <td className="py-2 px-1 border-r border-slate-400 dark:border-slate-700 font-mono text-purple-800 dark:text-purple-300">
                {matrix.grandTotal.wsi}
              </td>
              <td className="py-2 px-1 border-r border-slate-400 dark:border-slate-700 font-mono">
                {matrix.grandTotal.hc}
              </td>
              <td className="py-2 px-1 border-r border-slate-400 dark:border-slate-700 font-mono">
                {matrix.grandTotal.cp}
              </td>
              <td className="py-2 px-1 border-r border-slate-400 dark:border-slate-700 font-mono text-rose-800 dark:text-rose-300">
                {matrix.grandTotal.wcp}
              </td>
              <td className="py-2 px-1 border-r border-slate-400 dark:border-slate-700 font-mono text-blue-800 dark:text-blue-300">
                {matrix.grandTotal.traffic}
              </td>
              <td className="py-2 px-1 border-r border-slate-400 dark:border-slate-700 font-mono text-emerald-800 dark:text-emerald-300">
                {matrix.grandTotal.hg}
              </td>
              <td className="py-2 px-2 bg-amber-400 text-slate-950 font-mono font-black text-sm">
                {matrix.grandTotal.total}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
