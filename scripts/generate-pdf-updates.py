import json
import re
import unicodedata

with open('uploaded-pdfs.json', 'r') as f:
    pdfs = json.load(f)

sql_updates = []

for pdf in pdfs:
    original = unicodedata.normalize('NFC', pdf['originalFilename'])
    url = pdf['url']
    
    # Try to extract prefix
    prefix_match = re.match(r'^(\d)_(\d)_(\d)_', original)
    
    # Keyword extraction (remove prefix and .pdf)
    clean_name = re.sub(r'^\d_\d_\d_\s*', '', original).replace('.pdf', '')
    # Extract important keywords (longer than 2 chars)
    keywords = [k for k in re.split(r'[\s_()]+', clean_name) if len(k) >= 2]
    
    extra_filter = ""
    title_match = ""
    
    if prefix_match:
        c, s, l = prefix_match.groups()
        # Instead of strict prefix match, use keywords first if they exist
        if keywords:
            # Match by any keyword in the title
            title_match = f"%{keywords[0]}%"
        else:
            title_match = f"{c}.{s}.{l}.%"
            
        # Refine for multi-part
        if "(1)" in original: extra_filter = " AND title LIKE '%(1)%'"
        elif "(2)" in original: extra_filter = " AND title LIKE '%(2)%'"
        elif "(3)" in original: extra_filter = " AND title LIKE '%(3)%'"
        elif "합" in original: extra_filter = " AND title LIKE '%합%'"
    else:
        # No prefix, try keywords
        if keywords:
            title_match = f"%{keywords[0]}%"
        else:
            continue

    sql = f"UPDATE public.lessons SET pdf_level_1_url = '{url}' WHERE title LIKE '{title_match}'{extra_filter} AND course_id = (SELECT id FROM public.courses WHERE title = '대수 Δ0 실전 개념 완성' LIMIT 1);"
    sql_updates.append(sql)

with open('update_pdf_urls.sql', 'w') as f:
    f.write("-- PDF URL Updates (Keyword Matched)\n")
    f.write("\n".join(sql_updates))
    f.write("\n")

print("Generated keyword-matched update_pdf_urls.sql")
