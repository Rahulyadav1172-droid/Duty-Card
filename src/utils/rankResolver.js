/**
 * Police Rank Resolver & Cleaner Utility
 * When rank is explicitly provided in the Excel sheet, normalizes it into official standard abbreviations.
 * If rank is NOT provided in the Excel sheet, returns empty string '' so NO false badge is rendered,
 * and the officer's name is displayed exactly as uploaded (as police orders already include their designation).
 */

export function resolvePoliceRank(rawRank = '', rawName = '') {
  // If rank is explicitly passed, normalize or return clean rank
  const target = (rawRank || '').trim();
  if (!target) {
    // DO NOT guess from name and DO NOT default to 'का०'
    return '';
  }

  // 1. Apex & Senior IPS / State Police Leadership
  if (/(?:पुलिस\s*महानिदेशक|\bDGP\b|डीजीपी)/i.test(target)) return 'डी०जी०पी०';
  if (/(?:अपर\s*पुलिस\s*महानिदेशक|\bADG\b|एडीजी)/i.test(target)) return 'ए०डी०जी०';
  if (/(?:पुलिस\s*महानिरीक्षक|\bIGP?\b|आईजी)/i.test(target)) return 'आई०जी०';
  if (/(?:पुलिस\s*उपमहानिरीक्षक|\bDIG\b|डीआईजी)/i.test(target)) return 'डी०आई०जी०';
  if (/(?:वरिष्ठ\s*पुलिस\s*अधीक्षक|\bSSP\b|एसएसपी)/i.test(target)) return 'एस०एस०पी०';
  if (/(?:अपर\s*पुलिस\s*अधीक्षक|\bAddl\.?\s*SP\b|\bASP\b|अपर\s*एसपी)/i.test(target)) return 'अपर पुलिस अधीक्षक';
  if (/(?:पुलिस\s*अधीक्षक|\bSP\b|एसपी)/i.test(target)) return 'पुलिस अधीक्षक';

  // 2. Superior Officers (CO / DySP / क्षेत्राधिकारी / पुलिस उपाधीक्षक)
  if (/(?:क्षेत्राधिकारी|सी[0०.]?ओ[0०.]?|डीएसपी|DSP|\bCO\b|पुलिस\s*उपाधीक्षक)/i.test(target)) {
    return 'सी०ओ०';
  }

  // 3. Female Sub-Inspector (must precede general SI & Female Constable)
  if (/(?:म[0०.]?उ[0०.]?नि[0०.]?|महिला\s*उप\s*निरीक्षक|Lady\s*SI|\bWSI\b)/i.test(target)) {
    return 'म०उ०नि०';
  }

  // 4. Sub-Inspector / SI (must precede Inspector because उ०नि० contains नि०)
  if (/(?:उ[0०.]?निरी[0०.]?|उ[0०.]?नि[0०.]?|उप\s*निरीक्षक|उप-निरीक्षक|\bउनि\b|Sub\s*Inspector|\bSI\b)/i.test(target)) {
    return 'उ०नि०';
  }

  // 5. Inspector (निरी0, निरी०, नि0, नि०, निरीक्षक, Inspector)
  if (/(?:निरी[0०.]?|नि[0०.]?|निरीक्षक|इंस्पेक्टर|Inspector|थाना\s*प्रभारी|प्रभारी\s*निरीक्षक)/i.test(target)) {
    return 'नि०';
  }

  // 6. Head Constable (मु०आ०, मुख्य आरक्षी, हे०का०, हेकां) (must precede generic Constable)
  if (/(?:मु[0०.]?आ[0०.]?|मुख्य\s*आरक्षी|हे[0०.]?कां[0०.]?|हे[0०.]?का[0०.]?|हेकां|Head\s*Constable|\bHC\b)/i.test(target)) {
    return 'हे०का०';
  }

  // 7. Female Constable (म०का०, म०कां०, महिला आरक्षी) (must precede generic Constable)
  if (/(?:म[0०.]?कां[0०.]?|म[0०.]?का[0०.]?|महिला\s*आरक्षी|महिला\s*कांस्टेबल|Lady\s*Constable|W\.?\s*Const)/i.test(target)) {
    return 'म०का०';
  }

  // 8. Traffic & Home Guard Special Wings
  if (/यातायात|ट्रैफिक|Traffic/i.test(target)) return 'यातायात';
  if (/होमगार्ड|Home\s*Guard|पीआरडी|PRD/i.test(target)) return 'होमगार्ड';

  // 9. Constable (का०, कां०, आरक्षी, कांस्टेबल)
  if (/(?:कां[0०.]?|का[0०.]?|आरक्षी|कांस्टेबल|कांस|Constable|\bConst\b)/i.test(target)) {
    return 'का०';
  }

  // If specified string is short enough, return as-is
  if (target.length <= 25) return target;

  return '';
}

/**
 * Cleans stray mobile numbers or trailing punctuation from officer name,
 * but preserves the full official title/rank as uploaded in the Excel sheet
 * (e.g. "श्री सुबोध गौतम, अपर पुलिस अधीक्षक पूर्वी" or "का० सुमित राजभर").
 */
export function stripRankFromName(rawName = '') {
  if (!rawName) return '';
  let s = String(rawName).trim();

  // Strip trailing phone numbers and repeated commas
  s = s.replace(/,\s*[6-9]\d{9}\b/g, '')
       .replace(/\b[6-9]\d{9}\b/g, '')
       .replace(/,\s*,/g, ',')
       .replace(/,\s*$/, '')
       .trim();

  return s || rawName;
}

/**
 * Parses incharge string into officer name and clean 10-digit mobile number
 * Example: "श्री नितेश कुमार तिवारी, पुलिस उपाधीक्षक, अम्बेडकरनगर। नं0-7307634138"
 * -> { name: "श्री नितेश कुमार तिवारी, पुलिस उपाधीक्षक, अम्बेडकरनगर", mobile: "7307634138" }
 */
export function parseIncharge(inchargeStr = '') {
  if (!inchargeStr) return { name: '', mobile: '' };
  const raw = String(inchargeStr).trim();
  if (!raw || raw === '-') return { name: '', mobile: '' };

  // Extract 10-digit mobile number if present
  const mobMatch = raw.match(/(?:(?:मो०?|नं०?|नंबर|मो|Phone|Mobile|Tel)[\s:.-]*)?([6-9]\d{9})\b/i);
  let mobile = mobMatch ? mobMatch[1] : '';

  // Remove the mobile number part and trailing punctuation from the name
  let name = raw;
  if (mobile) {
    name = raw
      .replace(new RegExp(`(?:(?:मो०?|नं०?|नंबर|मो|Phone|Mobile|Tel)[\\s:.-]*)?${mobile}\\b`, 'i'), '')
      .replace(/[।,|/\-:\s]+$/, '')
      .trim();
  }

  return { name: name || raw, mobile };
}

