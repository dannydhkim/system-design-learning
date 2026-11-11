#!/usr/bin/env python3
"""Serve System Design Quest locally and save progress into the repo.

    python serve.py            # http://localhost:8000
    python serve.py --port 9000

The app POSTs its state to /api/progress; this writes it to progress/progress.json
so you can `git add progress && git commit && git push` to keep it on GitHub.
Binds to localhost only.
"""
import argparse
import json
import os
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROGRESS = ROOT / "progress" / "progress.json"
MAX_BYTES = 5 * 1024 * 1024


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # always serve fresh files while studying/editing
        super().end_headers()

    def do_GET(self):
        # Before the first save there is no progress file; answer with an empty object rather than a 404.
        if self.path.split("?")[0] == "/progress/progress.json" and not PROGRESS.exists():
            body = b"{}"
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        if self.path != "/api/progress":
            return self.send_error(404)
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.send_error(400)
        if not 0 < length <= MAX_BYTES:
            return self.send_error(413)
        try:
            state = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            return self.send_error(400, "Body is not valid JSON")
        if not isinstance(state, dict) or state.get("v") != 1:
            return self.send_error(400, "Not a progress file")

        # Write atomically so a crash mid-save cannot corrupt the file.
        PROGRESS.parent.mkdir(exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=PROGRESS.parent, suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=1, ensure_ascii=False, sort_keys=True)
            f.write("\n")
        os.replace(tmp, PROGRESS)

        self.send_response(204)
        self.end_headers()

    def log_message(self, fmt, *args):
        if "/api/progress" not in str(args[0] if args else ""):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--port", type=int, default=8000)
    port = parser.parse_args().port
    print(f"System Design Quest → http://localhost:{port}   (progress saved to {PROGRESS.relative_to(ROOT)})")
    try:
        ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
    except KeyboardInterrupt:
        print()
