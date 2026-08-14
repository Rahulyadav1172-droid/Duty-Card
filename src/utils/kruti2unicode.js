/**
 * Kruti Dev 010 to Unicode Hindi Converter Engine (JavaScript / Client-side)
 * Converts legacy Kruti Dev Hindi font encoding and UP Police rank shorthands to standard Devanagari Unicode.
 */

const KRUTI_DEV_MAP = [
  // UP Police Specific Legacy Shorthand & Rank Mappings
  ["m0fu0", "उ0नि0"], ["m.fu.", "उ0नि0"], ["m0fu", "उ0नि0"],
  ["gs0dk0", "हे0का0"], ["gs.dk.", "हे0का0"], ["gs0dk", "हे0का0"],
  ["e0m0fu0", "म0उ0नि0"], ["e.m.fu.", "म0उ0नि0"],
  ["e0dk0", "म0का0"], ["e.dk.", "म0का0"],
  ["e0fu0", "म0नि0"], ["e.fu.", "म0नि0"],
  ["fu0", "नि0"], ["fu.", "नि0"],
  ["dk0", "का0"], ["dk.", "का0"],
  ["e0u0", "म0ना0"], ["e.u.", "म0ना0"],

  // Special Vowels & Pre-combined characters
  ["vks", "ओ"], ["vkS", "औ"], ["vk", "आ"], ["v", "अ"],
  ["bZ", "ई"], ["b", "इ"],
  ["mQ", "ऊ"], ["m", "उ"],
  ["_,", "ऋ"],
  ["sS", "ऐ"],

  // Common prefixes & conjuncts
  ["iz", "प्र"], ["dz", "क्र"], ["xz", "ग्र"], ["nz", "द्र"], ["sz", "स्र"],
  ["Fkkuk", "थाना"], ["dksrokyh", "कोतवाली"], ["n'kk'oes?k", "दशाश्वमेध"],
  ["uEcj", "नंबर"], ["u0", "नं."], ["e0u0", "मो0नं0"],

  // Special Conjuncts & Symbols
  ["ñ", "ह्न"], ["ò", "हृ"], ["ó", "ह्न"], ["ô", "द्ब"], ["õ", "द्घ"], ["ö", "ड्ड"],
  ["÷", "द्ध"], ["ø", "द्व"], ["ù", "द्व"], ["ú", "ट्र"], ["û", "ड्र"], ["ü", "ढ्र"],
  ["ý", "दृ"], ["þ", "द्व"], ["ÿ", "ष्ठ"],
  ["ï", "श्च"], ["î", "द्व"], ["í", "प्त"], ["ì", "क्त"], ["ë", "द्द"], ["ê", "ट्ट"],
  ["é", "ठ्ठ"], ["è", "ध्"], ["ç", "द्व"], ["æ", "फ"], ["å", "द्व"], ["ä", "न्न"],
  ["ã", "स्म"], ["â", "प्त"], ["á", "त्म"], ["à", "त्व"],
  ["Ã", "आ"], ["Â", "अ"], ["À", "अ"], ["¿", "इ"],
  ["¾", "झ"], ["½", "ज्ञ"], ["¼", "द्य"], ["»", "द्द"], ["º", "ठ"], ["¹", "न"],
  ["¸", "भ"], ["·", "त"], ["¶", "म"], ["µ", "म"], ["´", "ध"], ["³", "स"],
  ["²", "र"], ["±", "रू"], ["°", "रु"],

  // Multi-character Consonant + Matra pairs
  ["Dkk", "का"], ["Dk", "का"], ["D", "क्"],
  ["Kkk", "ज्ञा"], ["Kk", "ज्ञा"], ["K", "ज्ञ्"],
  ["Fkk", "था"], ["Fk", "था"], ["F", "थ्"],
  ["Xkk", "गा"], ["Xk", "गा"], ["X", "ग्"],
  ["Äkk", "घा"], ["Äk", "घा"], ["Ä", "घ्"],
  ["Pkk", "चा"], ("Pk", "चा"), ["P", "च्"],
  ["Tkk", "जा"], ["Tk", "जा"], ["T", "ज्"],
  ["Ckk", "बा"], ["Ck", "बा"], ["C", "ब्"],
  ["Hkk", "भा"], ["Hk", "भा"], ["H", "भ्"],
  ["Ekk", "मा"], ["Ek", "मा"], ["E", "म्"],
  ["Ukk", "ना"], ["Uk", "ना"], ["U", "न्"],
  ["Rkk", "ता"], ["Rk", "ता"], ["R", "त्"],
  ["Lkk", "ला"], ["Lk", "ला"], ["L", "ल्"],
  ["Okk", "वा"], ["Ok", "वा"], ["O", "व्"],
  ["Skk", "शा"], ["Sk", "शा"], ["S", "श्"],
  ["Qkk", "फा"], ["Qk", "फा"], ["Q", "फ्"],
  ["Wkk", "ठा"], ["Wk", "ठा"], ["W", "ठ"],

  ["ks", "ो"], ["kS", "ौ"], ["k", "ा"],
  ["s", "े"], ["h", "ी"], ["f", "ि"], ["q", "ु"], ["w", "ू"], ["`", "ृ"],
  ["a", "ं"], ["%", "ः"], ["+", "़"], ["~", "्"],

  // Single Characters (Kruti Dev 010 layout)
  ["a", "ं"], ["b", "इ"], ["c", "ब"], ["d", "क"], ["e", "म"],
  ["g", "ह"], ["h", "ी"], ["i", "ा"], ["j", "र"], ["k", "ा"],
  ["l", "स"], ["m", "म"], ["n", "द"], ["o", "व"], ["p", "च"],
  ["q", "ु"], ["r", "त"], ["s", "े"], ["t", "ू"], ["u", "न"],
  ["v", "अ"], ["w", "ू"], ["x", "ग"], ["y", "ल"], ["z", "्र"],

  ["A", "ा"], ["B", "ी"], ["C", "ब्"], ["D", "क्"], ["E", "म्"],
  ["F", "थ्"], ["G", "ग्"], ["H", "भ्"], ["I", "प्"], ["J", "ज्"],
  ["K", "ज्ञ्"], ["L", "ल्"], ["M", "म्"], ["N", "छ"], ["O", "व्"],
  ["P", "च्"], ["Q", "फ्"], ["R", "त्"], ["S", "श्"], ["T", "ज्"],
  ["U", "न्"], ["V", "ट"], ["W", "ठ"], ["X", "ग्"], ["Y", "ड्"],
  ["Z", "र्"],

  ["}", "द्व"], ["{", "क्ष्"], ["[", "ख्"], ["]", "ा"], [":", "छ"], [";", "स"],
  [",", "ाया"], [".", "।"], ["/", "र"], ["'", "श्"], ["?", "ध"]
];

export function convertKrutiToUnicode(text) {
  if (!text || typeof text !== 'string') return "";
  let str = text.trim();
  if (!str) return "";

  // Check if text is already Unicode Devanagari (Hindi range U+0900 to U+097F)
  const devanagariMatches = str.match(/[\u0900-\u097F]/g);
  if (devanagariMatches && devanagariMatches.length > str.length * 0.3) {
    return str;
  }

  if (str.includes('/')) {
    return str.split('/').map(convertKrutiToUnicode).join(' / ');
  }

  let modified = str;

  // Shift 'f' matra after consonant cluster
  let pos = modified.indexOf('f');
  while (pos !== -1) {
    if (pos < modified.length - 1) {
      let clusterLen = 1;
      if (pos + 2 < modified.length && "DFXPTCHEURLOSKQW".includes(modified[pos + 1])) {
        clusterLen = 2;
      }
      const cluster = modified.substring(pos + 1, pos + 1 + clusterLen);
      modified = modified.substring(0, pos) + cluster + "f" + modified.substring(pos + 1 + clusterLen);
      pos = modified.indexOf('f', pos + clusterLen + 1);
    } else {
      break;
    }
  }

  // Sort Kruti Dev map by key length descending
  const sortedMap = [...KRUTI_DEV_MAP].sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of sortedMap) {
    modified = modified.split(k).join(v);
  }

  // Cleanup duplicate matras
  return modified
    .replace(/िि/g, 'ि')
    .replace(/ाा/g, 'ा')
    .replace(/ीी/g, 'ी')
    .replace(/ेे/g, 'े')
    .replace(/ोो/g, 'ो');
}
