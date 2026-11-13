#!/usr/bin/env python3
"""Serve System Design Quest locally and save progress into the repo.

    python serve.py            # http://localhost:8000
    python serve.py --port 9000

The app POSTs its state to /api/progress; this writes it to progress/progress.json
so you can `git add progress && git commit && git push` to keep it on GitHub.

Binds to localhost only, and only answers a browser that is really on this page:
  · the Host header must be localhost or 127.0.0.1 on our port (stops DNS rebinding, where another
    site points its own name at 127.0.0.1 to read or write through this server);
  · a save must be JSON sent from this page's own origin (stops any other site you have open from
    overwriting your progress with a background request);
  · dotfiles such as .git are never served.
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

    def allowed_host(self):
        port = self.server.server_address[1]
        return self.headers.get("Host", "") in {f"localhost:{port}", f"127.0.0.1:{port}"}

    def same_origin(self):
        # Browsers attach Origin to every cross-site POST, and to same-origin ones too.
        port = self.server.server_address[1]
        return self.headers.get("Origin", "") in {f"http://localhost:{port}", f"http://127.0.0.1:{port}"}

    def hidden(self):
        # Judge the file the request really resolves to, after the server has decoded it, so that
        # an encoded name such as /%2egit/config is caught as well as /.git/config.
        try:
            rel = Path(self.translate_path(self.path)).resolve().relative_to(ROOT)
        except ValueError:
            return True  # resolves outside the repo, for example through a symlink
        return any(part.startswith(".") for part in rel.parts)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")  # always serve fresh files while studying/editing
        super().end_headers()

    def refused(self):
        """Apply the checks every GET and HEAD needs. Returns True when the request has been answered with an error."""
        if not self.allowed_host():
            self.send_error(403, "Open this app at http://localhost")
            return True
        if self.hidden():
            self.send_error(404)
            return True
        return False

    def empty_progress(self):
        """Before the first save there is no progress file: send the headers for an empty object rather than a 404.
        Returns the body for the caller to write (GET) or drop (HEAD), or None when the file exists."""
        if self.path.split("?")[0] != "/progress/progress.json" or PROGRESS.exists():
            return None
        body = b"{}"
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        return body

    def do_GET(self):
        if self.refused():
            return
        body = self.empty_progress()
        if body is not None:
            self.wfile.write(body)
            return
        super().do_GET()

    def do_HEAD(self):
        # Same answers as GET, headers only (send_error already leaves the body out of a HEAD reply).
        if self.refused() or self.empty_progress() is not None:
            return
        super().do_HEAD()

    def do_POST(self):
        if self.path != "/api/progress":
            return self.send_error(404)
        if not self.allowed_host() or not self.same_origin():
            return self.send_error(403, "Progress can only be saved from this page")
        # A cross-site form or no-cors fetch cannot send this content type without a preflight we never approve.
        if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != "application/json":
            return self.send_error(415)
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
