import json
import unicodedata
import re

with open('uploaded-pdfs.json', 'r') as f:
    pdfs = json.load(f)

with open('lessons_dump.json', 'r') as f:
    lessons = json.load(f)

sql_updates = []
matched_ids = set()

def normalize(s):
    # Remove numbering and whitespace for fuzzy matching
    s = unicodedata.normalize('NFC', s)
    s = re.sub(r'^\d[._]\d[._]\d[._]\s*', '', s)
    s = re.sub(r'\s+', '', s)
    return s

for pdf in pdfs:
    pdf_name = pdf['originalFilename'].replace('.pdf', '')
    pdf_norm = normalize(pdf_name)
    url = pdf['url']
    
    # Try to find a match in lessons
    best_match = None
    
    # Matching strategy:
    # 1. Exact normalized title match
    # 2. Keyword match
    
    for lesson in lessons:
        lesson_title = lesson['title']
        lesson_norm = normalize(lesson_title)
        
        # Exact match after normalization
        if pdf_norm == lesson_norm:
            best_match = lesson['id']
            break
            
        # Partial match
        if pdf_norm in lesson_norm or lesson_norm in pdf_norm:
            # Special case for multi-part
            if "(1)" in pdf_name and "(1)" not in lesson_title: continue
            if "(2)" in pdf_name and "(2)" not in lesson_title: continue
            if "합" in pdf_name and "합" not in lesson_title: continue
            
            best_match = lesson['id']
            # Continue to find a better match? 
            # If we found a partial match, let's keep it but keep looking for a better one
    
    if best_match:
        sql = f"UPDATE public.lessons SET pdf_level_1_url = '{url}' WHERE id = '{best_match}';"
        sql_updates.append(sql)
        matched_ids.add(best_match)
        print(f"Matched: {pdf['originalFilename']} -> {best_match}")
    else:
        print(f"Unmatched: {pdf['originalFilename']}")

with open('update_pdf_urls_by_id.sql', 'w') as f:
    f.write("-- PDF URL Updates by ID (Super Robust)\n")
    f.write("\n".join(sql_updates))
    f.write("\n")

print(f"\nDone! Matched {len(sql_updates)} out of {len(pdfs)} PDFs.")
