import requests
import json

URL = "https://fvjzzntvfafyfejjaofx.supabase.co/rest/v1/rpc/storage_list_files"
API_KEY = "sb_publishable_s_W_sci_pC9CjtG_Gtkw8A_wQB6SQ8C"

headers = {
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# The bucket is likely "course-materials", but let's just query the storage.objects table securely via REST or use curl
