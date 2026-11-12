from http.server import BaseHTTPRequestHandler
import json
import urllib.request

TOKEN = "8875290524:AAG07U7qxmQ__3gh6mqFYmFLDs3yAPF9xJg"
TELEGRAM_API = f"https://api.telegram.org/bot{TOKEN}/sendMessage"

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            update = json.loads(post_data.decode('utf-8'))
            if "message" in update:
                chat_id = update["message"]["chat"]["id"]
                text = update["message"].get("text", "")
                
                # الرد التلقائي (تقدر تغير النص على كيفك)
                reply_text = f"أهلاً بك! وصلني ردك: {text}"
                
                # إرسال الرد لتليجرام
                payload = json.dumps({"chat_id": chat_id, "text": reply_text}).encode('utf-8')
                req = urllib.request.Request(TELEGRAM_API, data=payload, headers={'Content-Type': 'application/json'})
                urllib.request.urlopen(req)
        except Exception as e:
            print(e)

        self.send_response(200)
        self.end_headers()
        return
