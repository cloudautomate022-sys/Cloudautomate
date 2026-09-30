import base64
import json
import os
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DATA_FILE = os.path.join(os.path.dirname(__file__), 'team-data.json')
PHOTO_DIR = os.path.join(os.path.dirname(__file__), 'Photo')
os.makedirs(PHOTO_DIR, exist_ok=True)
DEFAULT_STATE = {
    'summary': 'Our team combines security thinking, hands-on technical expertise, and a practical approach to digital growth. We work closely with businesses to design resilient systems, streamline operations, and deliver measurable results.',
    'photo': 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80',
    'members': [
        {
            'id': 1,
            'name': 'Raul Nieves',
            'role': 'Data Analyst',
            'photo': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
        },
        {
            'id': 2,
            'name': 'Mary Mitchell',
            'role': 'Sales Representative',
            'photo': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
        },
        {
            'id': 3,
            'name': 'Juan Pablo Sanchez',
            'role': 'Security Analyst',
            'photo': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
        },
    ],
}


def save_photo_from_data_url(data_url, prefix='member'):
    if not isinstance(data_url, str) or not data_url.startswith('data:image/'):
        return data_url

    header, encoded = data_url.split(',', 1)
    mime_type = header.split(';', 1)[0].split(':', 1)[1]
    is_base64 = ';base64' in header

    if not is_base64:
        return data_url

    try:
        image_bytes = base64.b64decode(encoded)
    except (ValueError, TypeError):
        return data_url

    extension_map = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
    }
    extension = extension_map.get(mime_type, '.png')
    filename = f"{prefix}-{int(time.time() * 1000)}{extension}"
    save_path = os.path.join(PHOTO_DIR, filename)

    with open(save_path, 'wb') as file:
        file.write(image_bytes)

    return f'/Photo/{filename}'


def normalize_photo_values(payload):
    if not isinstance(payload, dict):
        return payload

    if isinstance(payload.get('photo'), str):
        payload['photo'] = save_photo_from_data_url(payload['photo'], 'team')

    members = payload.get('members')
    if isinstance(members, list):
        for index, member in enumerate(members):
            if isinstance(member, dict) and isinstance(member.get('photo'), str):
                member['photo'] = save_photo_from_data_url(member['photo'], f'member-{index + 1}')

    return payload


def load_state():
    if not os.path.exists(DATA_FILE):
        return DEFAULT_STATE

    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, dict) and isinstance(data.get('members'), list):
                normalized = normalize_photo_values(data)
                if normalized != data:
                    with open(DATA_FILE, 'w', encoding='utf-8') as write_file:
                        json.dump(normalized, write_file, ensure_ascii=False, indent=2)
                        write_file.write('\n')
                return normalized
    except (json.JSONDecodeError, OSError):
        pass

    return DEFAULT_STATE


class TeamHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/team':
            payload = load_state()
            body = json.dumps(payload).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        return super().do_GET()

    def do_POST(self):
        if self.path == '/api/team':
            content_length = int(self.headers.get('Content-Length', '0'))
            raw_body = self.rfile.read(content_length)
            try:
                payload = json.loads(raw_body.decode('utf-8') or '{}')
            except json.JSONDecodeError:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'Invalid JSON payload')
                return

            if not isinstance(payload, dict):
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'Invalid team payload')
                return

            if not isinstance(payload.get('members'), list):
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'Members must be an array')
                return

            payload = normalize_photo_values(payload)

            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
                f.write('\n')

            response = {'ok': True, 'team': payload}
            body = json.dumps(response).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        return


if __name__ == '__main__':
    port = 8000
    httpd = ThreadingHTTPServer(('0.0.0.0', port), TeamHandler)
    print(f'Serving on http://localhost:{port}')
    httpd.serve_forever()
