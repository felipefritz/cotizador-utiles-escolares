# 🎒 Cotizador de Útiles Escolares

Sistema inteligente para extraer, analizar y cotizar listas de útiles escolares desde archivos PDF, DOCX o Excel.

## ✨ Características

- 📄 **Extracción inteligente** - Lee PDFs, DOCX y Excel con formato complejo
- 🤖 **IA integrada** - Usa Groq (gratis) o OpenAI para mejor precisión
- 👁️ **Visión por computadora** - Lee PDFs con imágenes y tablas
- 💰 **Cotización multi-proveedor** - Busca precios en múltiples tiendas
- 🔐 **Autenticación** - OAuth con Google, GitHub y Twitter
- 🚀 **API REST** - Backend FastAPI moderno y rápido

## 📁 Estructura del Proyecto

```
cotizador-utiles/
├── app/                    # Código principal de la aplicación
│   ├── main.py            # API FastAPI
│   ├── auth.py            # Sistema de autenticación
│   ├── database.py        # Modelos y conexión BD
│   ├── schemas.py         # Esquemas Pydantic
│   ├── extractors.py      # Extracción de texto (PDF, DOCX, Excel)
│   ├── parser.py          # Parser de listas de útiles
│   ├── llm_client.py      # Cliente de IA (Groq/OpenAI)
│   ├── providers/         # Clientes de tiendas
│   └── quoting/           # Módulos de cotización
├── frontend/              # Aplicación React
├── tests/                 # Tests automatizados
├── scripts/               # Scripts de utilidad
│   ├── setup_groq.py      # Configurar Groq (gratis)
│   └── create_admin.py    # Crear usuario admin
├── docs/                  # Documentación
├── uploads/               # Archivos subidos (temporal)
├── .env                   # Variables de entorno
├── requirements.txt       # Dependencias Python
└── run.py                 # Punto de entrada

## 🚀 Instalación Rápida

### 1. Clonar y preparar entorno

```bash
git clone <tu-repo>
cd cotizador-utiles

# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### 2. Configurar IA (Groq - GRATIS)

```bash
# Obtener API key gratis en: https://console.groq.com/keys
python scripts/setup_groq.py
```

O editar `.env` manualmente:
```bash
LLM_PROVIDER=groq
GROQ_API_KEY=tu_api_key_de_groq
```

### 3. Inicializar base de datos

```bash
# Las tablas se crean automáticamente al iniciar el servidor
# Si quieres verificar, ejecuta:
python scripts/init_db.py

# Crear usuario administrador (opcional)
python scripts/create_admin.py
```

📖 **Más información**: [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)

### 4. Iniciar servidor

```bash
# Opción 1: Usando el script
python run.py

# Opción 2: Directamente con uvicorn
uvicorn app.main:app --reload
```

El servidor estará en http://localhost:8000

### 5. Iniciar frontend (opcional)

```bash
cd frontend
npm install
npm run dev
```

## 🔧 Configuración

### Variables de Entorno (.env)

```bash
# IA (Elige uno)
LLM_PROVIDER=groq                    # "groq" (gratis) o "openai"
GROQ_API_KEY=tu_api_key_de_groq                 # API key de Groq (gratis)

# Base de datos
DATABASE_URL=sqlite:///./cotizador.db  # SQLite local (default)
# DATABASE_URL=postgresql://...        # PostgreSQL en Railway/Render

# Autenticación
SECRET_KEY=tu-secreto-muy-seguro

# OAuth (opcional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Modelos de IA Disponibles

#### Groq (Recomendado - 100% GRATIS)
- **Texto**: llama-3.3-70b-versatile
- **Visión**: llama-3.2-90b-vision-preview
- ✅ Sin costos, rápido, perfecto para producción

#### OpenAI (De pago)
- **Texto**: gpt-4o-mini
- **Visión**: gpt-4o
- 💰 ~$0.15-2.50 por 1M tokens

## 📖 Uso

### API Endpoints

#### Parsear archivo con IA
```bash
POST /api/parse-ai-full
Content-Type: multipart/form-data

file: archivo.pdf
use_vision: true
```

#### Cotizar item
```bash
POST /api/quote/dimeiggs
{
  "query": "cuaderno universitario 100 hojas"
}
```

#### Parsear y cotizar en un paso
```bash
POST /api/parse-ai-quote/multi-providers
file: lista_utiles.pdf
providers: ["dimeiggs", "prisa", "jamila"]
```

### Python Client

```python
from app.llm_client import call_llm_full_extraction

# Extraer items de texto
result = call_llm_full_extraction("""
3 Cuadernos universitarios 100 hojas
2 Lápices grafito
1 Goma de borrar
""")

print(f"Items encontrados: {len(result['items'])}")
for item in result['items']:
    print(f"- {item['cantidad']} x {item['detalle']}")
```

## 🧪 Testing

```bash
# Test de extracción con IA
python tests/test_openai_extraction.py

# Test de API (requiere pytest)
pytest tests/
```

## 📚 Documentación

- [Configuración de Groq](docs/GROQ_SETUP.md) - Modelo gratuito (recomendado)
- [Configuración de OpenAI](docs/OPENAI_SETUP.md) - Alternativa de pago
- [Guía de Autenticación](docs/AUTH_GUIDE.md) - OAuth y JWT
- [Deployment](docs/DEPLOYMENT.md) - Desplegar en producción

## 🛠️ Tecnologías

- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **IA**: Groq (gratis) o OpenAI
- **Extracción**: pdfplumber, python-docx, openpyxl
- **Scraping**: Playwright, BeautifulSoup
- **Frontend**: React, TypeScript, Vite
- **Base de datos**: SQLite (dev), PostgreSQL (prod)

## 📦 Dependencias Principales

```
fastapi>=0.128.0
uvicorn>=0.40.0
openai>=1.12.0          # Cliente compatible con Groq
pdfplumber>=0.10.3
pdf2image>=1.17.0
python-docx>=1.2.0
openpyxl>=3.1.2
playwright>=1.57.0
```

## 🚢 Despliegue

### Railway (Backend + PostgreSQL)

1. **Agregar PostgreSQL en Railway**: New → Database → Add PostgreSQL
2. **Variables de entorno** en Railway:
   ```bash
   # Railway inyecta DATABASE_URL automáticamente
   LLM_PROVIDER=groq
   GROQ_API_KEY=tu_api_key_de_groq
   SECRET_KEY=tu-secreto-muy-seguro
   ```
3. **Las tablas se crean automáticamente** al hacer deploy
4. **Verifica logs**: "✅ Database initialized successfully"

📖 **Guía completa**: [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) y [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

### Railway / Render

```bash
# Variables de entorno necesarias:
LLM_PROVIDER=groq
GROQ_API_KEY=tu_api_key_de_groq
DATABASE_URL=postgresql://...
SECRET_KEY=...
```

### Docker

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

## 📝 Licencia

MIT License - Ver archivo LICENSE para detalles

## 🆘 Soporte

- **Issues**: Reporta bugs en GitHub Issues
- **Docs**: Lee la documentación en `/docs`
- **Tests**: Ejecuta `python tests/test_openai_extraction.py`

## 🎯 Roadmap

- [ ] Soporte para más proveedores de útiles escolares
- [ ] App móvil (React Native)
- [ ] Exportar cotizaciones a PDF/Excel
- [ ] Historial de cotizaciones
- [ ] Comparador de precios avanzado
- [ ] Sistema de notificaciones

---

**Hecho con ❤️ para facilitar la compra de útiles escolares**
