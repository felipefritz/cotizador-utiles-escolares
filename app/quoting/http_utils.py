from __future__ import annotations

import os
from typing import Any, Dict

import certifi


def request_kwargs() -> Dict[str, Any]:
    cert_path = certifi.where()
    if os.path.exists(cert_path):
        return {"verify": cert_path}

    for fallback in (
        os.getenv("REQUESTS_CA_BUNDLE", ""),
        "/etc/ssl/cert.pem",
        "/etc/ssl/certs/ca-certificates.crt",
        "/opt/homebrew/etc/openssl@3/cert.pem",
    ):
        if fallback and os.path.exists(fallback):
            return {"verify": fallback}

    return {}

