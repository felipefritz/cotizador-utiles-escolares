"""Flujo de inicio y registro con Google OAuth."""
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_google_login_redirects_using_backend_configuration(monkeypatch) -> None:
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "client.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "configured-secret")

    response = client.get("/api/auth/google?intent=register", follow_redirects=False)

    assert response.status_code == 307
    location = response.headers["location"]
    parsed = urlparse(location)
    params = parse_qs(parsed.query)
    assert parsed.netloc == "accounts.google.com"
    assert params["client_id"] == ["client.apps.googleusercontent.com"]
    assert params["redirect_uri"] == ["https://testserver/api/auth/google/callback"]
    assert params["scope"] == ["openid email profile"]
    assert params["state"][0]
    assert "google_oauth_state=" in response.headers["set-cookie"]
    assert "google_oauth_intent=register" in response.headers["set-cookie"]


def test_google_login_reports_missing_server_configuration(monkeypatch) -> None:
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_SECRET", raising=False)
    monkeypatch.setenv("FRONTEND_URL", "https://preciofast.cl")

    response = client.get("/api/auth/google", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == (
        "https://preciofast.cl/login?error=google_not_configured"
    )


def test_google_callback_rejects_missing_state(monkeypatch) -> None:
    monkeypatch.setenv("FRONTEND_URL", "https://preciofast.cl")

    response = client.get(
        "/api/auth/google/callback?code=unused",
        follow_redirects=False,
    )

    assert response.status_code == 307
    assert response.headers["location"] == (
        "https://preciofast.cl/login?error=google_invalid_state"
    )
