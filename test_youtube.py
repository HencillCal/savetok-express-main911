import urllib.request, json

body = json.dumps({ 'url': 'https://youtu.be/Fw3H8R5hHEY?si=Pjop-_dr-dxsD21F', 'mode': 'video' }).encode('utf-8')
req = urllib.request.Request('https://mdeaizzwijbnarzqrlbh.supabase.co/functions/v1/youtube-download', data=body, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        print(f'Status: {response.status}')
        data = json.loads(response.read().decode('utf-8'))
        if 'error' in data:
            print(f'Error: {data["error"]}')
        else:
            print(f'Title: {data.get("title", "N/A")}')
            print(f'Items: {len(data.get("items", []))}')
            if data.get('items'):
                item = data['items'][0]
                print(f'Downloads: {len(item.get("downloads", []))}')
                if item.get('downloads'):
                    print('First few downloads:')
                    for i, dl in enumerate(item['downloads'][:3]):
                        print(f'  {i+1}. {dl.get("quality", "N/A")} - {dl.get("format", "N/A")}')
except urllib.error.HTTPError as e:
    print(f'HTTP Error {e.code}: {e.reason}')
    if e.code == 404:
        try:
            error_data = json.loads(e.read().decode('utf-8'))
            print(f'Error message: {error_data.get("error", "Unknown error")}')
        except:
            print('Could not parse error response')
except Exception as e:
    print(f'Exception: {e}')