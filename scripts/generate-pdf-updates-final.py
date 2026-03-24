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
    
    # Keyword extraction
    clean_name = re.sub(r'^\d_\d_\d_\s*', '', original).replace('.pdf', '')
    keywords = [k for k in re.split(r'[\s_()]+', clean_name) if len(k) >= 2]
    
    if not keywords:
        continue
        
    keyword = keywords[0]
    
    # Handle multi-part refinements
    extra_filter = ""
    if "(1)" in original: extra_filter = " AND title LIKE '%(1)%'"
    elif "(2)" in original: extra_filter = " AND title LIKE '%(2)%'"
    elif "(3)" in original: extra_filter = " AND title LIKE '%(3)%'"
    elif "합" in original: extra_filter = " AND title LIKE '%합%'"

    sql = f"UPDATE public.lessons SET pdf_level_1_url = '{url}' WHERE course_id = '{COURSE_ID}' AND title LIKE '%{keyword}%'{extra_filter};"
    sql_updates.append(sql)

with open('update_pdf_urls_final.sql', 'w') as f:
    f.write("-- Final Corrected PDF URL Updates\n")
    f.write("\n".join(sql_updates))
    f.write("\n")

print("Generated update_pdf_urls_final.sql")
