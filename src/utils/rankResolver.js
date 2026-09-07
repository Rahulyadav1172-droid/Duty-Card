/**
 * Police Rank Resolver & Cleaner Utility
 * Normalizes all variations of UP Police ranks into official standard abbreviations:
 * - Inspector: निरी0, निरी०, नि0, नि०, निरीक्षक, Inspector -> नि०
 * - Sub-Inspector: उ0नि0, उ०नि०, उ0निरी0, उ०निरी०, उप निरीक्षक, SI -> उ०नि०
 * - Head Constable: मु0आ0, मु०आ०, मुख्य आरक्षी, हे0का0, हे०का०, हेकां, HC -> हे०का०
 * - Constable: कां0, कां०, का0, का०, आरक्षी, कांस्टेबल, Constable -> का०
 * - Lady Constable: म0का0, म०का०, म0कां0, म०कां०, महिला आरक्षी -> म०का०
 * - Lady SI: म0उ0नि0, म०उ०नि०, महिला उप निरीक्षक, WSI -> म०उ०नि०
 * - CO / DSP: सीओ, सी०ओ०, क्षेत्राधिकारी, DSP -> सी०ओ०
 */

export function resolvePoliceRank(rawRank = '', rawName = '') {
  const combined = `${rawRank || ''} ${rawName || ''}`.trim();
  if (!combined) return 'का०';

  // 1. Superior Officers (CO / DySP / क्षेत्राधिकारी)
  if (/(?:क्षेत्राधिकारी|सी[0०.]?ओ[0०.]?|डीएसपी|DSP|\bCO\b|पुलिस\s*उपाधीक्षक)/i.test(combined)) {
    return 'सी०ओ०';
  }

  // 2. Female Sub-Inspector (must precede general SI & Female Constable)
  if (/(?:म[0०.]?उ[0०.]?नि[0०.]?|महिला\s*उप\s*निरीक्षक|Lady\s*SI|\bWSI\b)/i.test(combined)) {
    return 'म०उ०नि०';
  }

  // 3. Sub-Inspector / SI (must precede Inspector because उ०नि० contains नि०)
  if (/(?:उ[0०.]?निरी[0०.]?|उ[0०.]?नि[0०.]?|उप\s*निरीक्षक|उप-निरीक्षक|\bउनि\b|Sub\s*Inspector|\bSI\b)/i.test(combined)) {
    return 'उ०नि०';
  }

  // 4. Inspector (निरी0, निरी०, नि0, नि०, निरीक्षक, Inspector)
  if (/(?:निरी[0०.]?|नि[0०.]?|निरीक्षक|इंस्पेक्टर|Inspector|थाना\s*प्रभारी|प्रभारी\s*निरीक्षक)/i.test(combined)) {
    return 'नि०';
  }

  // 5. Head Constable (मु०आ०, मुख्य आरक्षी, हे०का०, हेकां) (must precede generic Constable)
  if (/(?:मु[0०.]?आ[0०.]?|मुख्य\s*आरक्षी|हे[0०.]?कां[0०.]?|हे[0०.]?का[0०.]?|हेकां|Head\s*Constable|\bHC\b)/i.test(combined)) {
    return 'हे०का०';
  }

  // 6. Female Constable (म०का०, म०कां०, महिला आरक्षी) (must precede generic Constable)
  if (/(?:म[0०.]?कां[0०.]?|म[0०.]?का[0०.]?|महिला\s*आरक्षी|महिला\s*कांस्टेबल|Lady\s*Constable|W\.?\s*Const)/i.test(combined)) {
    return 'म०का०';
  }

  // 7. Traffic & Home Guard Special Wings
  if (/यातायात|ट्रैफिक|Traffic/i.test(combined)) return 'यातायात';
  if (/होमगार्ड|Home\s*Guard|पीआरडी|PRD/i.test(combined)) return 'होमगार्ड';

  // 8. Constable (का०, कां०, आरक्षी, कांस्टेबल)
  if (/(?:कां[0०.]?|का[0०.]?|आरक्षी|कांस्टेबल|कांस|Constable|\bConst\b)/i.test(combined)) {
    return 'का०';
  }

  // Fallback if specific rank passed
  if (rawRank && String(rawRank).trim()) {
    const cleanR = String(rawRank).trim();
    if (cleanR.length <= 15) return cleanR;
  }

  return 'का०';
}

/**
 * Removes duplicate rank prefix from officer name for clean presentation
 * Example: "निरी0 श्री नागेन्द्र पाल सिंह" -> "श्री नागेन्द्र पाल सिंह"
 * Example: "उ0नि0 शुभम सिंह" -> "शुभम सिंह"
 */
export function stripRankFromName(rawName = '') {
  if (!rawName) return '';
  let s = String(rawName).trim();

  // Strip leading rank prefixes with optional punctuation/separators
  s = s.replace(
    /^(?:निरी[0०.]?|नि[0०.]?|निरीक्षक|इंस्पेक्टर|उ[0०.]?निरी[0०.]?|उ[0०.]?नि[0०.]?|उप\s*निरीक्षक|उप-निरीक्षक|हे[0०.]?कां[0०.]?|हे[0०.]?का[0०.]?|हेकां|मु[0०.]?आ[0०.]?|मुख्य\s*आरक्षी|म[0०.]?उ[0०.]?नि[0०.]?|म[0०.]?कां[0०.]?|म[0०.]?का[0०.]?|महिला\s*आरक्षी|कां[0०.]?|का[0०.]?|आरक्षी|कांस्टेबल|क्षेत्राधिकारी|सी[0०.]?ओ[0०.]?)\s*[:\-\/.,]?\s*/i,
    ''
  );

  return s.trim() || rawName;
}
