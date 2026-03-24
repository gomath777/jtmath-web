import json
import re

# 대수 Δ0 실전 개념 완성 코스의 아이디
COURSE_ID = "f4c23a01-062e-47db-83a3-186d7f24bbab"

with open('uploaded-pdfs.json', 'r') as f:
    pdfs = json.load(f)

sql_updates = []

for pdf in pdfs:
    original = pdf['originalFilename']
    url = pdf['url']
    
    # Extract numbering like "1_1_1" -> "1.1.1."
    match = re.search(r'^(\d)_(\d)_(\d)_', original)
    if not match:
        continue
        
    c, s, l = match.groups()
    prefix = f"{c}.{s}.{l}."
    
    # 다중 파트 강의 (1), (2), (3) 및 '합' 분리
    extra_filter = ""
    if "(1)" in original: extra_filter = " AND title LIKE '%(1)%'"
    elif "(2)" in original: extra_filter = " AND title LIKE '%(2)%'"
    elif "(3)" in original: extra_filter = " AND title LIKE '%(3)%'"
    elif "합" in original: extra_filter = " AND title LIKE '%합%'"
    
    # 1. 코스 아이디 지정 (다른 과목 침범 방지)
    # 2. 번호 앞자리로 매칭 (1.1.1.% 등)
    sql = f"UPDATE public.lessons SET pdf_level_1_url = '{url}' WHERE course_id = '{COURSE_ID}' AND title LIKE '{prefix}%'{extra_filter};"
    sql_updates.append(sql)

with open('update_pdf_urls_final_simple.sql', 'w') as f:
    f.write("-- PDF URL Updates - BY COURSE ID & NUMBER SERIES\n")
    f.write("\n".join(sql_updates))
    f.write("\n")

print("Generated update_pdf_urls_final_simple.sql")
