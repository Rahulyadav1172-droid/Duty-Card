"""
DOCX Table Parser for Police Duty Card Management System
Ingests Word (.docx) files, scans preceding headings/paragraphs to track Zone and Sector,
extracts deployment tables, converts legacy Kruti Dev Hindi text to Unicode, and generates structured JSON database.
"""

import sys
import os
import json
import re
from pathlib import Path
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from kruti2unicode import convert_kruti_to_unicode

COLUMN_ALIASES = {
    "name": ["name", "नाम", "Uke", "vfer", "पुलिसकर्मी", "अधिकारी", "नाम/पदनाम"],
    "mobile": ["mobile", "मोबाईल", "मोबाइल", "फोन", "म०नं०", "म.नं.", "mob", "phone", "contact", "संख्या", "नंबर", "मोबाइल नंबर"],
    "posting": ["posting", "मूल तैनाती", "तैनाती", "Fkkuk", "थाना", "इकाई", "यूनिट", "unit", "नियुक्ति"],
    "district": ["district", "जनपद", "जिला", "dist"],
    "duty_place": ["duty place", "duty_place", "ड्यूटी स्थल", "स्थान", "ड्यूटी पॉइंट", "point", "place", "location", "ड्यूटी स्थान"],
    "zone": ["zone", "जोन", "अंचल"],
    "sector": ["sector", "सेक्टर"],
    "rank": ["rank", "पदनाम", "पद", "designation", "रैंक"],
    "shift": ["shift", "समय", "शिफ्ट", "ड्यूटी समय", "timing"]
}

def clean_mobile_number(text: str) -> str:
    if not text:
        return ""
    digits = re.sub(r'\D', '', text)
    if len(digits) >= 10:
        return digits[-10:]
    return digits

def match_column_indices(header_cells):
    mapping = {}
    for idx, cell in enumerate(header_cells):
        raw_text = cell.text.strip()
        unicode_text = convert_kruti_to_unicode(raw_text).lower()
        raw_lower = raw_text.lower()

        for field, keywords in COLUMN_ALIASES.items():
            if field in mapping:
                continue
            for kw in keywords:
                if kw.lower() in unicode_text or kw.lower() in raw_lower:
                    mapping[field] = idx
                    break
    return mapping

def extract_zone_sector_from_text(text: str, current_zone: str, current_sector: str, current_duty_place: str):
    if not text:
        return current_zone, current_sector, current_duty_place

    converted = convert_kruti_to_unicode(text).strip()

    # Search for Zone (e.g. "जोन-01", "Zone-A")
    zone_match = re.search(r'(जोन[\s\-\:\.\w\(\)]+|Zone[\s\-\:\.\w\(\)]+)', converted, re.IGNORECASE)
    if zone_match:
        z_str = zone_match.group(1).split('|')[0].strip()
        if len(z_str) > 3:
            current_zone = z_str

    # Search for Sector (e.g. "सेक्टर-01", "Sector-1")
    sector_match = re.search(r'(सेक्टर[\s\-\:\.\w\(\)]+|Sector[\s\-\:\.\w\(\)]+)', converted, re.IGNORECASE)
    if sector_match:
        s_str = sector_match.group(1).split('|')[0].strip()
        if len(s_str) > 3:
            current_sector = s_str

    # Search for Duty Place heading
    duty_match = re.search(r'(ड्यूटी स्थल|ड्यूटी पॉइंट|स्थान)[\s\-\:]+([^\|\n]+)', converted, re.IGNORECASE)
    if duty_match:
        current_duty_place = duty_match.group(2).strip()

    return current_zone, current_sector, current_duty_place

def parse_docx_duty_tables(file_path: str):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    doc = Document(file_path)
    records = []

    current_zone = "Zone-A"
    current_sector = "Sector-1"
    current_duty_place = ""

    print(f"Reading document: {file_path}")

    # Process elements in sequential document order
    for child in doc.element.body:
        if child.tag.endswith('p'):
            p_text = Paragraph(child, doc).text.strip()
            if p_text:
                current_zone, current_sector, current_duty_place = extract_zone_sector_from_text(
                    p_text, current_zone, current_sector, current_duty_place
                )
        elif child.tag.endswith('tbl'):
            table = Table(child, doc)
            if not table.rows:
                continue

            # First check if table has a single cell section title row
            first_row_cells = table.rows[0].cells
            col_map = match_column_indices(first_row_cells)

            # If row 0 was a title row, check row 1
            start_row = 1
            if len(col_map) < 2 and len(table.rows) > 1:
                title_text = " ".join([c.text for c.text in first_row_cells])
                current_zone, current_sector, current_duty_place = extract_zone_sector_from_text(
                    title_text, current_zone, current_sector, current_duty_place
                )
                col_map = match_column_indices(table.rows[1].cells)
                start_row = 2

            if len(col_map) < 2:
                col_map = {
                    "name": 1,
                    "rank": 2,
                    "mobile": 3,
                    "posting": 4,
                    "district": 5,
                    "duty_place": 6,
                    "zone": 7,
                    "sector": 8
                }

            for r_idx in range(start_row, len(table.rows)):
                row = table.rows[r_idx]
                cells = row.cells
                if len(cells) < 2:
                    # Could be a section header row inside table
                    row_text = " ".join([c.text for c.text in cells])
                    current_zone, current_sector, current_duty_place = extract_zone_sector_from_text(
                        row_text, current_zone, current_sector, current_duty_place
                    )
                    continue

                def get_cell_val(field):
                    if field in col_map and col_map[field] < len(cells):
                        raw = cells[col_map[field]].text.strip()
                        return convert_kruti_to_unicode(raw)
                    return ""

                name = get_cell_val("name")
                mobile = clean_mobile_number(get_cell_val("mobile"))

                if not mobile or len(mobile) < 10:
                    for c in cells:
                        candidate = clean_mobile_number(c.text)
                        if len(candidate) == 10:
                            mobile = candidate
                            break

                if not name and not mobile:
                    continue
                if name and ("नाम" in name or "Name" in name or "क्र.सं." in name):
                    continue

                if not name and mobile:
                    name = f"पुलिसकर्मी ({mobile})"

                # Duty place priority: cell duty place > paragraph duty place > default
                cell_duty_place = get_cell_val("duty_place")
                cell_zone = get_cell_val("zone")
                cell_sector = get_cell_val("sector")

                final_duty_place = cell_duty_place or current_duty_place or "मुख्य द्वार / गेट नंबर 1"
                final_zone = cell_zone or current_zone
                final_sector = cell_sector or current_sector

                record = {
                    "id": f"DUTY-{len(records) + 1:04d}",
                    "name": name,
                    "rank": get_cell_val("rank") or "Constable / आरक्षी",
                    "mobile": mobile,
                    "posting": get_cell_val("posting") or "Police Station / थाना",
                    "district": get_cell_val("district") or "Varanasi / वाराणसी",
                    "duty_place": final_duty_place,
                    "zone": final_zone,
                    "sector": final_sector,
                    "shift": get_cell_val("shift") or "06:00 AM - 02:00 PM",
                    "event_name": "काशी विश्वनाथ मंदिर सुरक्षा व्यवस्था / VIP Security Duty 2026",
                    "status": "Active"
                }

                records.append(record)

    print(f"Total duty records extracted: {len(records)}")
    return records

def save_duty_data(records, output_filename="duty_data.json"):
    curr_dir = Path(__file__).parent.parent
    target_paths = [
        curr_dir / output_filename,
        curr_dir / "src" / "data" / output_filename,
        curr_dir / "public" / output_filename
    ]

    json_content = json.dumps(records, ensure_ascii=False, indent=2)
    for path in target_paths:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(json_content)
        print(f"Saved duty data JSON to: {path}")

if __name__ == "__main__":
    file_to_parse = sys.argv[1] if len(sys.argv) > 1 else "sample_duty_list.docx"
    if file_to_parse == "sample_duty_list.docx" and not os.path.exists(file_to_parse):
        from generate_sample_docx import create_sample_docx
        create_sample_docx(file_to_parse)

    try:
        parsed_records = parse_docx_duty_tables(file_to_parse)
        save_duty_data(parsed_records)
        print("Parsing and conversion completed successfully!")
    except Exception as e:
        print(f"Error parsing docx file: {e}")
