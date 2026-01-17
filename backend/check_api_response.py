import requests
import json
import sys

PROPERTY_ID = "52b64086-2efa-4fac-aff7-73373d308605"
URL = f"http://localhost:8000/properties/{PROPERTY_ID}/public"

try:
    print(f"Fetching {URL}...")
    response = requests.get(URL)
    response.raise_for_status()
    
    data = response.json()
    print("✅ Response 200 OK")
    
    if "highlights" in data:
        print(f"✅ 'highlights' key found: {json.dumps(data['highlights'], indent=2)}")
    else:
        print("❌ 'highlights' key MISSING")

    if "price_history" in data:
        print(f"✅ 'price_history' key found: {json.dumps(data['price_history'], indent=2)}")
    else:
        print("❌ 'price_history' key MISSING")

except Exception as e:
    print(f"❌ Error: {e}")
