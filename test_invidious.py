import urllib.request
import json
import traceback

url='https://yewtu.be/api/v1/videos/Fw3H8R5hHEY'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        print('status', resp.status)
        data = json.load(resp)
        print('keys', list(data.keys())[:20])
        print('adaptiveFormats', len(data.get('adaptiveFormats', [])))
        print('formatStreams', len(data.get('formatStreams', [])))
        print('title', data.get('title'))
except Exception:
    traceback.print_exc()
