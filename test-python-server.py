#!/usr/bin/env python3
import http.server
import socketserver
import json
from datetime import datetime

class TestHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        print(f"[{datetime.now().isoformat()}] GET {self.path} from {self.client_address}")
        
        if self.path == '/test':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                'message': 'Python server is working!',
                'timestamp': datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')

PORT = 6666
print(f"Starting Python test server on port {PORT}...")

try:
    with socketserver.TCPServer(("0.0.0.0", PORT), TestHandler) as httpd:
        print(f"✅ Python server listening on http://0.0.0.0:{PORT}")
        print(f"Server address: {httpd.server_address}")
        httpd.serve_forever()
except Exception as e:
    print(f"❌ Server failed to start: {e}")