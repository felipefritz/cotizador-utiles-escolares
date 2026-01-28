# Sistema de Autenticación - Configuración OAuth

Este documento explica cómo configurar la autenticación con proveedores OAuth (Google, GitHub, Twitter/X).

## Base de Datos

El sistema usa SQLite para almacenar usuarios. La base de datos se crea automáticamente al iniciar el servidor en `cotizador.db`.

## Configuración de Proveedores OAuth

### 1. Google OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+
4. Ve a "Credenciales" → "Crear credenciales" → "ID de cliente de OAuth 2.0"
5. Configura la pantalla de consentimiento
6. En "URIs de redireccionamiento autorizados", agrega:
   - `http://localhost:8000/api/auth/google/callback` (desarrollo)
   - Tu URL de producción cuando despliegues
7. Copia el `Client ID` y `Client Secret`
8. Actualiza `oauth_providers.py` con tus credenciales:
   ```python
   GOOGLE_CLIENT_ID = "tu-client-id-aqui"
   GOOGLE_CLIENT_SECRET = "tu-client-secret-aqui"
   ```

### 2. GitHub OAuth

1. Ve a [GitHub Developer Settings](https://github.com/settings/developers)
2. Click en "New OAuth App"
3. Completa el formulario:
   - **Application name**: Cotizador de Útiles
   - **Homepage URL**: `http://localhost:8000`
   - **Authorization callback URL**: `http://localhost:8000/api/auth/github/callback`
4. Click en "Register application"
5. Copia el `Client ID` y genera un `Client Secret`
6. Actualiza `oauth_providers.py`:
   ```python
   GITHUB_CLIENT_ID = "tu-client-id-aqui"
   GITHUB_CLIENT_SECRET = "tu-client-secret-aqui"
   ```

### 3. Twitter/X OAuth 2.0

1. Ve a [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Crea un nuevo proyecto y app
3. En la configuración de tu app, ve a "User authentication settings"
4. Habilita OAuth 2.0
5. Configura:
   - **Type of App**: Web App
   - **Callback URI**: `http://localhost:8000/api/auth/twitter/callback`
   - **Website URL**: `http://localhost:8000`
6. Copia el `Client ID` y `Client Secret`
7. Actualiza `oauth_providers.py`:
   ```python
   TWITTER_CLIENT_ID = "tu-client-id-aqui"
   TWITTER_CLIENT_SECRET = "tu-client-secret-aqui"
   ```

**Nota**: Twitter OAuth 2.0 requiere implementar PKCE (Proof Key for Code Exchange). El código actual es una estructura básica que necesita completarse.

## Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

Luego edita `.env` con tus credenciales reales.

## Clave Secreta JWT

Para producción, genera una clave secreta segura:

```python
import secrets
print(secrets.token_urlsafe(32))
```

Actualiza `auth.py` con esta clave:
```python
SECRET_KEY = "tu-clave-generada-aqui"
```

## Instalación de Dependencias

```bash
pip install -r requirements.txt
```

## Iniciar el Servidor

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## Frontend

El frontend se conecta automáticamente usando el token JWT almacenado en localStorage.

### Desarrollo

```bash
cd frontend
npm install
npm run dev
```

## Estructura de la Base de Datos

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR,
    avatar_url VARCHAR,
    provider VARCHAR NOT NULL,  -- 'google', 'github', 'twitter'
    provider_id VARCHAR UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Endpoints de Autenticación

- `GET /api/auth/google` - Inicia login con Google
- `GET /api/auth/google/callback` - Callback de Google
- `GET /api/auth/github` - Inicia login con GitHub
- `GET /api/auth/github/callback` - Callback de GitHub
- `GET /api/auth/twitter` - Inicia login con Twitter
- `GET /api/auth/twitter/callback` - Callback de Twitter
- `GET /api/auth/me` - Obtiene información del usuario actual (requiere token)

## Endpoints Protegidos

Los siguientes endpoints ahora requieren autenticación:

- `POST /api/parse-ai-items-only`
- `POST /api/parse-ai-full`
- `POST /api/quote/multi-providers`

Incluye el token en el header:
```
Authorization: Bearer tu-token-aqui
```

## Notas de Seguridad

1. **NUNCA** comitees las credenciales reales al repositorio
2. Usa variables de entorno en producción
3. Cambia el `SECRET_KEY` en producción por uno seguro generado aleatoriamente
4. Habilita HTTPS en producción
5. Configura CORS apropiadamente para tu dominio de producción
