/**
 * Kruti Dev 010 to Unicode Hindi Converter Engine (JavaScript / Client-side)
 * Converts legacy Kruti Dev Hindi font encoding, Remington typewriter codes,
 * and UP Police rank shorthands to standard Devanagari Unicode.
 */

// Multi-character ligatures & pre-combined characters
const LIGATURE_MAP = [
  // Complex ligatures
  ['ñ', 'ह्न'], ['ò', 'हृ'], ['ó', 'ह्न'], ['ô', 'द्ब'], ['õ', 'द्घ'], ['ö', 'ड्ड'],
  ['÷', 'द्ध'], ['ø', 'द्व'], ['ù', 'द्व'], ['ú', 'ट्र'], ['û', 'ड्र'], ['ü', 'ढ्र'],
  ['ý', 'दृ'], ['þ', 'द्व'], ['ÿ', 'ष्ठ'],
  ['ï', 'श्च'], ['î', 'द्व'], ['í', 'प्त'], ['ì', 'क्त'], ['ë', 'द्द'], ['ê', 'ट्ट'],
  ['é', 'ठ्ठ'], ['è', 'ध्'], ['ç', 'द्व'], ['æ', 'फ'], ['å', 'द्व'], ['ä', 'न्न'],
  ['ã', 'स्म'], ['â', 'प्त'], ['á', 'त्म'], ['à', 'त्व'],
  ['Ã', 'आ'], ['Â', 'अ'], ['À', 'अ'], ['¿', 'इ'],
  ['¾', 'झ'], ['½', 'ज्ञ'], ['¼', 'द्य'], ['»', 'द्द'], ['º', 'ठ'], ['¹', 'न'],
  ['¸', 'भ'], ['·', 'त'], ['¶', 'म'], ['µ', 'म'], ['´', 'ध'], ['³', 'स'],
  ['²', 'र'], ['±', 'रू'], ['°', 'रु'],
  ['|', 'द्य'],

  // UP Police Specific Legacy Shorthand & Rank Mappings
  ['m0fu0', 'उ0नि0'], ['m.fu.', 'उ0नि0'], ['m0fu', 'उ0नि0'],
  ['gs0dk0', 'हे0का0'], ['gs.dk.', 'हे0का0'], ['gs0dk', 'हे0का0'],
  ['e0m0fu0', 'म0उ0नि0'], ['e.m.fu.', 'म0उ0नि0'],
  ['e0dk0', 'म0का0'], ['e.dk.', 'म0का0'],
  ['e0fu0', 'म0नि0'], ['e.fu.', 'म0नि0'],
  ['fu0', 'नि0'], ['fu.', 'नि0'],
  ['dk0', 'का0'], ['dk.', 'का0'],
  ['dks0', 'को0'], ['dks.', 'को0'],
  ['e0u0', 'म0ना0'], ['e.u.', 'म0ना0'],
  ['Fkkuk', 'थाना'], ['dksrokyh', 'कोतवाली'], ['n\'kk\'oes?k', 'दशाश्वमेध'],
  ['uEcj', 'नंबर'], ['u0', 'नं.'],

  // Armed / Unarmed status in Kruti
  ["l'kL=", 'सशस्त्र'], ["l'kL", 'सशस्त्र'], ["fu%'kL=", 'निःशस्त्र'], ["fu%'kL", 'निःशस्त्र'],

  // Vowels
  ['vks', 'ओ'], ['vkS', 'औ'], ['vk', 'आ'], ['v', 'अ'],
  ['bZ', 'ई'], ['b', 'इ'],
  ['mQ', 'ऊ'], ['m', 'उ'],
  ['sS', 'ऐ'],

  // Conjuncts
  ['izk', 'प्रा'], ['iz', 'प्र'], ['dz', 'क्र'], ['xz', 'ग्र'], ['nz', 'द्र'],
  ['sz', 'स्र'], ['cz', 'ब्र'], ['oz', 'व्र'], ['Hkz', 'भ्र'], ['e z', 'म्र']
];

// Single Character & Matra Mapping (Kruti Dev 010 layout)
const CHAR_MAP = [
  // Double 'k' (aa matra) on half consonants
  ['Fkk', 'था'], ['Dkk', 'का'], ['Xkk', 'गा'], ['Hkk', 'भा'], ['Pkk', 'चा'],
  ['Tkk', 'जा'], ['Rkk', 'ता'], ['Lkk', 'ला'], ['?kk', 'घा'],
  ['/kk', 'धा'], ['Ckk', 'बा'], ['Ekk', 'मा'], ['Ukk', 'ना'], ['Qkk', 'फा'],
  ['Wkk', 'ठा'], ['Ykk', 'डा'], ['Vkk', 'टा'], ['Ikk', 'पा'], ['Kkk', 'ज्ञा'],
  ['{kk', 'क्षा'], ["'kk", 'शा'], ['[kk', 'खा'],

  // Single 'k' (khadi pai -> full consonant)
  ['Fk', 'थ'], ['Dk', 'क'], ['Xk', 'ग'], ['Hk', 'भ'], ['Pk', 'च'],
  ['Tk', 'ज'], ['Rk', 'त'], ['Lk', 'ल'], ['?k', 'घ'],
  ['/k', 'ध'], ['Ck', 'ब'], ['Ek', 'म'], ['Uk', 'न'], ['Qk', 'फ'],
  ['Wk', 'ठ'], ['Yk', 'ड'], ['Vk', 'ट'], ['Ik', 'प'], ['Kk', 'ज्ञ'],
  ['{k', 'क्ष'], ["'k", 'श'], ['[k', 'ख'],

  // Special conjuncts with 'y' (;)
  ['[;', 'ख्य'], ['D;', 'क्य'], ['X;', 'ग्य'], ['T;', 'ज्य'], ['F;', 'थ्य'],
  ['P;', 'च्य'], ['H;', 'भ्य'], ['E;', 'म्य'], ['L;', 'ल्य'], ['C;', 'ब्य'],

  // Half consonants (without 'k')
  ['F', 'थ्'], ['D', 'क्'], ['X', 'ग्'], ['H', 'भ्'], ['P', 'च्'],
  ['T', 'ज्'], ['R', 'त्'], ['L', 'ल्'], ['?', 'घ्'],
  ['/', 'ध्'], ['C', 'ब्'], ['E', 'म्'], ['U', 'न्'], ['Q', 'फ्'],
  ['W', 'ठ्'], ['Y', 'ड्'], ['I', 'प्'], ['K', 'ज्ञ्'], ['{', 'क्ष्'],
  ["'", 'श्'], ['[', 'ख'],

  // Matras
  ['kS', 'ौ'], ['ks', 'ो'], ['k', 'ा'],
  ['S', 'ै'], ['s', 'े'], ['h', 'ी'], ['f', 'ि'], ['q', 'ु'], ['w', 'ू'], ['`', 'ृ'],
  ['a', 'ं'], ['%', 'ः'], ['+', '़'], ['~', '्'],

  // Remaining Single Characters
  ['b', 'इ'], ['c', 'ब'], ['d', 'क'], ['e', 'म'],
  ['g', 'ह'], ['i', 'प'], ['j', 'र'],
  ['l', 'स'], ['m', 'उ'], ['n', 'द'], ['o', 'व'],
  ['p', 'च'], ['r', 'त'], ['t', 'ज'],
  ['u', 'न'], ['v', 'अ'], ['x', 'ग'], ['y', 'ल'],
  ['z', '्र'],
  [';', 'य'],
  [']', 'ा'], ['}', 'द्व'],
  [':', 'छ'], ['"', 'ष्'], ['=', 'त्र'],
  ['&', '-'],
  ['M', 'ड'], ['V', 'ट'], ['N', 'छ']
].sort((a, b) => b[0].length - a[0].length);

export function convertKrutiToUnicode(text) {
  if (!text || typeof text !== 'string') return "";
  let str = text.trim();
  if (!str) return "";

  // 1. Check if text is already Unicode Devanagari (U+0900 to U+097F)
  const devanagariMatches = str.match(/[\u0900-\u097F]/g);
  if (devanagariMatches && devanagariMatches.length > str.length * 0.3) {
    return str;
  }

  // 2. Pure alphanumeric identifiers, codes, phones, or system tags (without blocking short Kruti Dev Hindi words)
  if (/^[A-Z0-9_\-\.\s\/]+$/i.test(str)) {
    // Specifically preserve pure digits, booth/point numbers, system tags (CS1, HG1, DUTY-0001, 141, 1/1), and standard uppercase acronyms
    if (/^\d+$/.test(str) || /^CS\d+$/i.test(str) || /^HG\d+$/i.test(str) || /^DUTY/i.test(str) || /^\d+[\/\-]\d+$/.test(str) || /^(?:SBI|GIC|NSS|UPP|VIP|VVIP|ECI|PNO|CUG)$/i.test(str)) {
      return str;
    }
  }

  // Bracket numbers: 1]2 -> 1, 2
  let s = str.replace(/(\d+)\](\d+)/g, '$1, $2');

  // Pre-process ligatures and police shorthands
  for (const [k, v] of LIGATURE_MAP) {
    s = s.split(k).join(v);
  }

  // Handle 'f' matra (ि): in Kruti Dev it is typed before the consonant cluster
  let pos = s.indexOf('f');
  while (pos !== -1) {
    if (pos < s.length - 1) {
      let clusterLen = 1;
      // Check if following character is half consonant
      if (pos + 2 < s.length && 'DFXPTCHEURLOSKQWMYV?/'.includes(s[pos + 1])) {
        clusterLen = 2;
        if (pos + 3 < s.length && s[pos + 2] === 'k') {
          clusterLen = 3;
        }
      } else if (pos + 2 < s.length && s[pos + 2] === 'k') {
        clusterLen = 2;
      }
      const cluster = s.substring(pos + 1, pos + 1 + clusterLen);
      s = s.substring(0, pos) + cluster + 'f' + s.substring(pos + 1 + clusterLen);
      pos = s.indexOf('f', pos + clusterLen + 1);
    } else {
      break;
    }
  }

  // Single character and matra mapping
  for (const [k, v] of CHAR_MAP) {
    s = s.split(k).join(v);
  }

  // Handle reph 'Z' (र्)
  s = s.replace(/([क-ह]्?[क-ह]?)Z/g, 'र्$1');

  // Polish: remove redundant halant directly preceding vowel matras (e.g. फ्ै -> फै)
  s = s.replace(/्([ािीुूृेैोौ])/g, '$1');

  // Polish duplicate matras
  return s
    .replace(/िि/g, 'ि')
    .replace(/ाा/g, 'ा')
    .replace(/ीी/g, 'ी')
    .replace(/ेे/g, 'े')
    .replace(/ोो/g, 'ो')
    .replace(/्ा/g, '')
    .trim();
}
