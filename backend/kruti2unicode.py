"""
Kruti Dev 010 to Unicode Hindi Converter Engine
Converts legacy Kruti Dev Hindi font encoding (ASCII based) and UP Police designation shorthand to standard Devanagari Unicode text.
"""

import sys
import re

# Set stdout encoding for Windows console unicode printing
sys.stdout.reconfigure(encoding='utf-8')

# Kruti Dev 010 replacement dictionary sorted by pattern length
KRUTI_DEV_MAP = [
    # UP Police Specific Legacy Shorthand & Rank Mappings
    ("m0fu0", "उ0नि0"), ("m.fu.", "उ0नि0"), ("m0fu", "उ0नि0"),
    ("gs0dk0", "हे0का0"), ("gs.dk.", "हे0का0"), ("gs0dk", "हे0का0"),
    ("e0m0fu0", "म0उ0नि0"), ("e.m.fu.", "म0उ0नि0"),
    ("e0dk0", "म0का0"), ("e.dk.", "म0का0"),
    ("e0fu0", "म0नि0"), ("e.fu.", "म0नि0"),
    ("fu0", "नि0"), ("fu.", "नि0"),
    ("dk0", "का0"), ("dk.", "का0"),
    ("e0u0", "म0ना0"), ("e.u.", "म0ना0"),

    # Special Vowels & Pre-combined characters
    ("vks", "ओ"), ("vkS", "औ"), ("vk", "आ"), ("v", "अ"),
    ("bZ", "ई"), ("b", "इ"),
    ("mQ", "ऊ"), ("m", "उ"),
    ("_,", "ऋ"),
    ("sS", "ऐ"),

    # Common prefixes & conjuncts
    ("iz", "प्र"), ("dz", "क्र"), ("xz", "ग्र"), ("nz", "द्र"), ("sz", "स्र"),
    ("Fkkuk", "थाना"), ("dksrokyh", "कोतवाली"), ("n'kk'oes?k", "दशाश्वमेध"),
    ("uEcj", "नंबर"), ("u0", "नं."), ("e0u0", "मो0नं0"),

    # Special Conjuncts & Symbols
    ("ñ", "ह्न"), ("ò", "हृ"), ("ó", "ह्न"), ("ô", "द्ब"), ("õ", "द्घ"), ("ö", "ड्ड"),
    ("÷", "द्ध"), ("ø", "द्व"), ("ù", "द्व"), ("ú", "ट्र"), ("û", "ड्र"), ("ü", "ढ्र"),
    ("ý", "दृ"), ("þ", "द्व"), ("ÿ", "ष्ठ"),
    ("ï", "श्च"), ("î", "द्व"), ("í", "प्त"), ("ì", "क्त"), ("ë", "द्द"), ("ê", "ट्ट"),
    ("é", "ठ्ठ"), ("è", "ध्"), ("ç", "द्व"), ("æ", "फ"), ("å", "द्व"), ("ä", "न्न"),
    ("ã", "स्म"), ("â", "प्त"), ("á", "त्म"), ("à", "त्व"),
    ("Ã", "आ"), ("Â", "अ"), ("À", "अ"), ("¿", "इ"),
    ("¾", "झ"), ("½", "ज्ञ"), ("¼", "द्य"), ("»", "द्द"), ("º", "ठ"), ("¹", "न"),
    ("¸", "भ"), ("·", "त"), ("¶", "म"), ("µ", "म"), ("´", "ध"), ("³", "स"),
    ("²", "र"), ("±", "रू"), ("°", "रु"),

    # Multi-character Consonant + Matra pairs
    ("Dkk", "का"), ("Dk", "का"), ("D", "क्"),
    ("Kkk", "ज्ञा"), ("Kk", "ज्ञा"), ("K", "ज्ञ्"),
    ("Fkk", "था"), ("Fk", "था"), ("F", "थ्"),
    ("Xkk", "गा"), ("Xk", "गा"), ("X", "ग्"),
    ("Äkk", "घा"), ("Äk", "घा"), ("Ä", "घ्"),
    ("Pkk", "चा"), ("Pk", "चा"), ("P", "च्"),
    ("Tkk", "जा"), ("Tk", "जा"), ("T", "ज्"),
    ("Ckk", "बा"), ("Ck", "बा"), ("C", "ब्"),
    ("Hkk", "भा"), ("Hk", "भा"), ("H", "भ्"),
    ("Ekk", "मा"), ("Ek", "मा"), ("E", "म्"),
    ("Ukk", "ना"), ("Uk", "ना"), ("U", "न्"),
    ("Rkk", "ता"), ("Rk", "ता"), ("R", "त्"),
    ("Lkk", "ला"), ("Lk", "ला"), ("L", "ल्"),
    ("Okk", "वा"), ("Ok", "वा"), ("O", "व्"),
    ("Skk", "शा"), ("Sk", "शा"), ("S", "श्"),
    ("Qkk", "फा"), ("Qk", "फा"), ("Q", "फ्"),
    ("Wkk", "ठा"), ("Wk", "ठा"), ("W", "ठ"),

    ("ks", "ो"), ("kS", "ौ"), ("k", "ा"),
    ("s", "े"), ("h", "ी"), ("f", "ि"), ("q", "ु"), ("w", "ू"), ("`", "ृ"),
    ("a", "ं"), ("%", "ः"), ("+", "़"), ("~", "्"),

    # Single Characters (Kruti Dev 010 layout)
    ("a", "ं"), ("b", "इ"), ("c", "ब"), ("d", "क"), ("e", "म"),
    ("g", "ह"), ("h", "ी"), ("i", "ा"), ("j", "र"), ("k", "ा"),
    ("l", "स"), ("m", "म"), ("n", "द"), ("o", "व"), ("p", "च"),
    ("q", "ु"), ("r", "त"), ("s", "े"), ("t", "ू"), ("u", "न"),
    ("v", "अ"), ("w", "ू"), ("x", "ग"), ("y", "ल"), ("z", "्र"),

    ("A", "ा"), ("B", "ी"), ("C", "ब्"), ("D", "क्"), ("E", "म्"),
    ("F", "थ्"), ("G", "ग्"), ("H", "भ्"), ("I", "प्"), ("J", "ज्"),
    ("K", "ज्ञ्"), ("L", "ल्"), ("M", "म्"), ("N", "छ"), ("O", "व्"),
    ("P", "च्"), ("Q", "फ्"), ("R", "त्"), ("S", "श्"), ("T", "ज्"),
    ("U", "न्"), ("V", "ट"), ("W", "ठ"), ("X", "ग्"), ("Y", "ड्"),
    ("Z", "र्"),

    ("}", "द्व"), ("{", "क्ष्"), ("[", "ख्"), ("]", "ा"), (":", "छ"), (";", "स"),
    (",", "ाया"), (".", "।"), ("/", "र"), ("'", "श्"), ("?", "ध")
]

def convert_kruti_to_unicode(text: str) -> str:
    """
    Converts Kruti Dev 010 encoded text and UP Police shorthand to standard Hindi Devanagari Unicode.
    """
    if not text or not isinstance(text, str):
        return ""

    text = text.strip()
    if not text:
        return ""

    # Check if text is already Unicode Devanagari (Hindi characters)
    unicode_hindi_count = len(re.findall(r'[\u0900-\u097F]', text))
    if unicode_hindi_count > len(text) * 0.3:
        return text  # Already Unicode Hindi

    # If text contains slash "/", process segments separately
    if '/' in text:
        parts = text.split('/')
        converted_parts = [convert_kruti_to_unicode(p) for p in parts]
        return ' / '.join(converted_parts)

    modified_text = text

    # Step 1: Handle 'f' matra (Chhoti 'i' matra typed BEFORE consonant in Kruti Dev)
    pos = modified_text.find('f')
    while pos != -1:
        if pos < len(modified_text) - 1:
            cluster_len = 1
            if pos + 2 < len(modified_text) and modified_text[pos + 1] in "DFXPTCHEURLOSKQW":
                cluster_len = 2

            cluster = modified_text[pos + 1 : pos + 1 + cluster_len]
            modified_text = (
                modified_text[:pos] + cluster + "f" + modified_text[pos + 1 + cluster_len:]
            )
            pos = modified_text.find('f', pos + cluster_len + 1)
        else:
            break

    # Step 2: Apply Kruti Dev 010 map sorted by key length descending
    sorted_map = sorted(KRUTI_DEV_MAP, key=lambda x: len(x[0]), reverse=True)
    for k, v in sorted_map:
        modified_text = modified_text.replace(k, v)

    # Step 3: Cleanup duplicate matras
    modified_text = (
        modified_text
        .replace('िि', 'ि')
        .replace('ाा', 'ा')
        .replace('ीी', 'ी')
        .replace('ेे', 'े')
        .replace('ोो', 'ो')
    )
    return modified_text

if __name__ == "__main__":
    test_cases = [
        ("m0fu0", "उ0नि0"),
        ("gs0dk0", "हे0का0"),
        ("fu0", "नि0"),
        ("dk0", "का0"),
        ("e0dk0", "म0का0"),
        ("vfer dqekj", "अमित कुमार"),
        ("Fkkuk dksrokyh", "थाना कोतवाली")
    ]
    print("Executing UP Police rank shorthand & Kruti Dev conversion verification:")
    for src, expected in test_cases:
        res = convert_kruti_to_unicode(src)
        print(f"Source: {src:<15} -> Output: {res}")
