import json
import unicodedata
import re

COURSE_ID = "f4c23a01-062e-47db-83a3-186d7f24bbab"

with open('uploaded-pdfs.json', 'r') as f:
    pdfs = json.load(f)

sql_updates = []

for pdf in pdfs:
    original = unicodedata.normalize('NFC', pdf['originalFilename'])
    url = pdf['url']
    
    # Keyword extraction (remove spaces as well for matching)
    clean_name = re.sub(r'^\d_\d_\d_\s*', '', original).replace('.pdf', '')
    # Remove all spaces from our keyword for the LIKE comparison
    keyword_no_space = re.sub(r'\s+', '', clean_name)
    
    # We'll take a chunk of the name as the keyword to be safe
    # e.g., "거듭제곱과거듭제곱근"
    if len(keyword_no_space) > 10:
        match_str = keyword_no_space[:10]
    else:
        match_str = keyword_no_space
        
    extra_filter = ""
    # These also need to be checked against the stripped title
    # But since these are standard keywords, we can just append them to the LIKE or use AND
    if "(1)" in original: extra_filter = " AND title LIKE '%(1)%'"
    elif "(2)" in original: extra_filter = " AND title LIKE '%(2)%'"
    elif "(3)" in original: extra_filter = " AND title LIKE '%(3)%'"
    elif "합" in original: extra_filter = " AND title LIKE '%합%'"

    # The magic: regexp_replace(title, '\s+', '', 'g') removes all whitespace from the DB title before matching
    sql = f"UPDATE public.lessons SET pdf_level_1_url = '{url}' WHERE course_id = '{COURSE_ID}' AND regexp_replace(title, '\\s+', '', 'g') LIKE '%{match_str}%'{extra_filter};"
    sql_updates.append(sql)

with open('update_pdf_urls_v3.sql', 'w') as f:
    f.write("-- PDF URL Updates V3 (Robust against newlines/spaces)\n")
    f.write("\n".join(sql_updates))
    f.write("\n")

print("Generated update_pdf_urls_v3.sql")
