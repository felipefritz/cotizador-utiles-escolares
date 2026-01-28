import httpx
from typing import Optional
from pydantic import BaseModel

# Configuración OAuth (estos valores deben estar en variables de entorno en producción)
GOOGLE_CLIENT_ID = "TU_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET = "TU_GOOGLE_CLIENT_SECRET"
GOOGLE_REDIRECT_URI = "http://localhost:8000/api/auth/google/callback"

TWITTER_CLIENT_ID = "TU_TWITTER_CLIENT_ID"
TWITTER_CLIENT_SECRET = "TU_TWITTER_CLIENT_SECRET"
TWITTER_REDIRECT_URI = "http://localhost:8000/api/auth/twitter/callback"

GITHUB_CLIENT_ID = "TU_GITHUB_CLIENT_ID"
GITHUB_CLIENT_SECRET = "TU_GITHUB_CLIENT_SECRET"
GITHUB_REDIRECT_URI = "http://localhost:8000/api/auth/github/callback"


class OAuthUserInfo(BaseModel):
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    provider_id: str


async def get_google_user_info(code: str) -> OAuthUserInfo:
    """Obtiene información del usuario de Google OAuth"""
    async with httpx.AsyncClient() as client:
        # Intercambiar código por token
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        token_response.raise_for_status()
        token_data = token_response.json()
        access_token = token_data["access_token"]

        # Obtener información del usuario
        user_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_response.raise_for_status()
        user_data = user_response.json()

        return OAuthUserInfo(
            email=user_data["email"],
            name=user_data.get("name"),
            avatar_url=user_data.get("picture"),
            provider_id=user_data["id"],
        )


async def get_twitter_user_info(code: str) -> OAuthUserInfo:
    """Obtiene información del usuario de Twitter/X OAuth"""
    async with httpx.AsyncClient() as client:
        # Intercambiar código por token
        token_response = await client.post(
            "https://api.twitter.com/2/oauth2/token",
            data={
                "code": code,
                "client_id": TWITTER_CLIENT_ID,
                "client_secret": TWITTER_CLIENT_SECRET,
                "redirect_uri": TWITTER_REDIRECT_URI,
                "grant_type": "authorization_code",
                "code_verifier": "challenge",  # Necesitarás implementar PKCE correctamente
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        token_response.raise_for_status()
        token_data = token_response.json()
        access_token = token_data["access_token"]

        # Obtener información del usuario
        user_response = await client.get(
            "https://api.twitter.com/2/users/me?user.fields=profile_image_url",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_response.raise_for_status()
        user_data = user_response.json()["data"]

        return OAuthUserInfo(
            email=f"{user_data['id']}@twitter.placeholder",  # Twitter no siempre provee email
            name=user_data.get("name"),
            avatar_url=user_data.get("profile_image_url"),
            provider_id=user_data["id"],
        )


async def get_github_user_info(code: str) -> OAuthUserInfo:
    """Obtiene información del usuario de GitHub OAuth"""
    async with httpx.AsyncClient() as client:
        # Intercambiar código por token
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "code": code,
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "redirect_uri": GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )
        token_response.raise_for_status()
        token_data = token_response.json()
        access_token = token_data["access_token"]

        # Obtener información del usuario
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )
        user_response.raise_for_status()
        user_data = user_response.json()

        # Obtener email si no está en la respuesta principal
        email = user_data.get("email")
        if not email:
            email_response = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                },
            )
            email_response.raise_for_status()
            emails = email_response.json()
            primary_email = next((e for e in emails if e.get("primary")), None)
            email = primary_email["email"] if primary_email else f"{user_data['id']}@github.placeholder"

        return OAuthUserInfo(
            email=email,
            name=user_data.get("name") or user_data.get("login"),
            avatar_url=user_data.get("avatar_url"),
            provider_id=str(user_data["id"]),
        )
