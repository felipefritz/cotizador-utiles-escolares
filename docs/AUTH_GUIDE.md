# Sistema de Autenticación - Guía de Uso

## Descripción General

El Cotizador de Útiles ahora soporta dos sistemas de autenticación:

1. **OAuth** (Google, GitHub, Twitter/X)
2. **Usuario/Contraseña** (Autenticación local)

## Creación del Usuario Admin

El usuario admin ya ha sido creado automáticamente con las siguientes credenciales:

```
Usuario: admin
Contraseña: admin12345
Email: admin@cotizador.local
```

### Para crear el usuario admin manualmente (si es necesario):

```bash
python create_admin.py
```

## Endpoints de Autenticación

### Registro Local
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "string",  # 3-20 caracteres
  "email": "string",     # Email válido
  "password": "string"   # Mínimo 8 caracteres
}

Response:
{
  "token": "JWT_TOKEN",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "name": null
  }
}
```

### Login Local
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}

Response:
{
  "token": "JWT_TOKEN",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "name": "Full Name",
    "is_admin": false
  }
}
```

### Obtener Usuario Actual
```
GET /api/auth/me
Authorization: Bearer JWT_TOKEN

Response:
{
  "id": 1,
  "email": "user@example.com",
  "name": "Full Name",
  "avatar_url": null,
  "provider": "local",
  "is_admin": false
}
```

### OAuth (Google, GitHub, Twitter)
```
GET /api/auth/google
GET /api/auth/github
GET /api/auth/twitter

Redirect to OAuth provider...
```

## Frontend - LoginPage

La página de login ahora tiene tres secciones:

### 1. OAuth (Predeterminado)
- Botones para Google, GitHub y Twitter
- Opción para cambiar a login con usuario/contraseña

### 2. Login Local
- Campo para usuario
- Campo para contraseña
- Botón para cambiar a registro

### 3. Registro Local
- Campo para usuario (3-20 caracteres)
- Campo para email
- Campo para contraseña (mínimo 8 caracteres)
- Campo para confirmar contraseña
- Botón para cambiar a login

## Flujo de Autenticación

### Para nuevos usuarios (no OAuth):
1. Ir a `/login`
2. Presionar "¿No tienes cuenta? Regístrate"
3. Completar formulario de registro
4. Se crea la sesión automáticamente

### Para usuarios existentes:
1. Ir a `/login`
2. Ingresar usuario y contraseña
3. Presionar "Iniciar sesión"
4. Se crea la sesión automáticamente

### Para usuarios OAuth:
1. Ir a `/login`
2. Presionar botón del proveedor (Google/GitHub/Twitter)
3. Completar flujo de OAuth
4. Se crea la sesión automáticamente

## Base de Datos

Tabla `users`:
```sql
- id (INTEGER, PRIMARY KEY)
- email (VARCHAR, UNIQUE, NULLABLE)
- username (VARCHAR, UNIQUE, NULLABLE)
- name (VARCHAR, NULLABLE)
- avatar_url (VARCHAR, NULLABLE)
- password_hash (VARCHAR, NULLABLE)
- provider (VARCHAR, NULLABLE) -- 'local', 'google', 'github', 'twitter'
- provider_id (VARCHAR, UNIQUE, NULLABLE)
- is_active (BOOLEAN, DEFAULT: 1)
- is_admin (BOOLEAN, DEFAULT: 0)
- created_at (DATETIME)
- last_login (DATETIME)
```

## Cambio de Contraseña

Actualmente no hay endpoint para cambiar contraseña. Se recomienda:

1. Crear un nuevo usuario
2. O contactar al administrador

En futuras versiones se agregará un endpoint `/api/auth/change-password`.

## Seguridad

### Consideraciones Importantes:

1. **SECRET_KEY**: Cambiar en producción
   ```python
   # En auth.py
   SECRET_KEY = "tu-clave-secreta-super-segura-cambiar-en-produccion"
   ```

2. **HTTPS**: Usar HTTPS en producción para proteger tokens

3. **JWT Expiry**: Los tokens expiran en 7 días

4. **Contraseñas**: Se hashean con bcrypt (o fallback a argon2)

## Troubleshooting

### Error: "El usuario ya existe"
- El username o email ya está registrado
- Usar un nombre de usuario diferente

### Error: "Usuario o contraseña inválidos"
- Verificar que el username sea correcto
- Verificar que la contraseña sea correcta
- Nota: El username es case-sensitive

### Error: "La contraseña debe tener al menos 8 caracteres"
- Ingresar una contraseña con mínimo 8 caracteres

### Error: "Las contraseñas no coinciden"
- En el registro, las dos contraseñas deben ser idénticas

## Próximas Mejoras Sugeridas

1. Endpoint para cambiar contraseña
2. Endpoint para resetear contraseña por email
3. Verificación de email
4. Autenticación de dos factores (2FA)
5. Dashboard de administración
6. Roles de usuario (admin, user, etc.)
