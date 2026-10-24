#!/usr/bin/env python3
"""Seal the private archive so it can live in a public repo.

Reads  private/archive.html   (never committed; see .gitignore)
Writes assets/archive.sealed.json  (safe to commit; unreadable without the password)

Usage:
  .venv/bin/python tools/seal.py            # prompts for the password
  WAYFOUND_PASSWORD=... .venv/bin/python tools/seal.py

The browser unlocks it with the same settings (PBKDF2-SHA256 -> AES-256-GCM),
see assets/js/main.js. The password itself is never stored anywhere.
"""
import base64
import getpass
import json
import os
import sys
from pathlib import Path

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "private" / "archive.html"
OUT = ROOT / "assets" / "archive.sealed.json"
ITERATIONS = 600_000


def normalize(pw: str) -> str:
    # Must match normalize() in main.js: forgiving about case and stray spaces.
    return " ".join(pw.strip().lower().split())


def main() -> None:
    if not SRC.exists():
        sys.exit(f"Missing {SRC}")
    pw = os.environ.get("WAYFOUND_PASSWORD") or getpass.getpass("Archive password: ")
    if not os.environ.get("WAYFOUND_PASSWORD"):
        if getpass.getpass("Again, to confirm: ") != pw:
            sys.exit("Passwords didn't match.")
    pw = normalize(pw)
    if not pw:
        sys.exit("Empty password.")

    salt, iv = os.urandom(16), os.urandom(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt,
                     iterations=ITERATIONS).derive(pw.encode())
    ct = AESGCM(key).encrypt(iv, SRC.read_bytes(), None)

    b64 = lambda b: base64.b64encode(b).decode()
    OUT.write_text(json.dumps({"v": 1, "iter": ITERATIONS, "salt": b64(salt),
                               "iv": b64(iv), "data": b64(ct)}))
    print(f"Sealed {SRC.name} -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
