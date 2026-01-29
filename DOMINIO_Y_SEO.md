# Configuración de Dominio y SEO

## 1. Sugerencias de Dominio

### Dominios Recomendados (en orden de preferencia):

#### Opción 1: Dominio .cl (Chile) - MEJOR PARA SEO LOCAL
- `cotizadorutiles.cl` ⭐ (corto, memorable, local)
- `utilesescolares.cl` (descriptivo)
- `comparautiles.cl` (indica la funcionalidad)
- `cotizafacil.cl` (amigable)

#### Opción 2: Dominio .com (Internacional)
- `cotizadorutiles.com`
- `utileschile.com`
- `comparautileschile.com`

#### Opción 3: Dominio .app o .online
- `cotizadorutiles.app` (moderno, para aplicaciones)
- `utilesescolares.online`

### 🏆 MI RECOMENDACIÓN: `cotizadorutiles.cl`
- Corto y fácil de recordar
- .cl genera confianza en usuarios chilenos
- Mejor posicionamiento SEO local
- Disponible y asequible (~$8.000-15.000 CLP/año)

---

## 2. Dónde Comprar el Dominio .cl

### Registradores Recomendados:
1. **NIC Chile** (oficial) - https://www.nic.cl
2. **Hostinger Chile** - https://www.hostinger.cl
3. **GoDaddy Chile** - https://www.godaddy.com/es-cl
4. **Webempresa Chile** - https://www.webempresa.com

---

## 3. Configurar Dominio en Vercel

### Paso 1: Acceder a Settings
1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto `cotizador-utiles-escolares`
3. Click en **Settings** (arriba derecha)
4. Click en **Domains** en el menú lateral

### Paso 2: Agregar Dominio
1. Click en **Add Domain**
2. Ingresa tu dominio: `cotizadorutiles.cl` (o el que hayas comprado)
3. Click en **Add**

### Paso 3: Configurar DNS
Vercel te mostrará los registros DNS que debes configurar:

#### Si usas el dominio como principal (cotizadorutiles.cl):
```
Type: A
Name: @
Value: 76.76.19.19
TTL: 3600
```

#### Para www (www.cotizadorutiles.cl):
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

### Paso 4: Configurar en tu Registrador
1. Inicia sesión en tu registrador (NIC Chile, Hostinger, etc.)
2. Ve a **Gestión DNS** o **DNS Management**
3. Agrega los registros que Vercel te indicó
4. Guarda los cambios

⏰ **Propagación DNS**: Puede tardar entre 1-48 horas (usualmente 1-6 horas)

### Paso 5: Verificación
- Vercel verificará automáticamente el dominio
- Una vez verificado, aparecerá un ✓ verde
- Configura el dominio principal si tienes www y sin www

---

## 4. Actualizar URLs en el Código

Una vez que tengas el dominio, actualiza estos archivos:

### archivo: frontend/index.html
Reemplaza todas las URLs de ejemplo:
```html
<!-- De: -->
<link rel="canonical" href="https://cotizador-utiles-escolares.vercel.app" />
<meta property="og:url" content="https://cotizador-utiles-escolares.vercel.app/" />

<!-- A: -->
<link rel="canonical" href="https://cotizadorutiles.cl" />
<meta property="og:url" content="https://cotizadorutiles.cl/" />
```

### archivo: frontend/public/sitemap.xml
```xml
<!-- Actualizar todas las URLs -->
<loc>https://cotizadorutiles.cl/</loc>
```

### archivo: frontend/public/robots.txt
```
Sitemap: https://cotizadorutiles.cl/sitemap.xml
```

---

## 5. SEO - Tareas Completadas ✅

### Meta Tags Agregados:
- ✅ Title optimizado para SEO
- ✅ Meta description (160 caracteres)
- ✅ Keywords relevantes
- ✅ Meta robots (index, follow)
- ✅ Canonical URL
- ✅ Open Graph tags (Facebook, LinkedIn)
- ✅ Twitter Cards
- ✅ Locale específico (es_CL)

### Archivos SEO Creados:
- ✅ `/public/robots.txt` - Permite indexación de Google
- ✅ `/public/sitemap.xml` - Mapa del sitio

---

## 6. Registrar en Google Search Console

### Paso 1: Acceder a Search Console
1. Ve a https://search.google.com/search-console
2. Click en **Agregar propiedad**
3. Selecciona **Dominio** (recomendado) o **Prefijo de URL**
4. Ingresa tu dominio: `cotizadorutiles.cl`

### Paso 2: Verificar Propiedad
**Opción A - Verificación por DNS (recomendada):**
1. Google te dará un registro TXT
2. Agrégalo en tu registrador DNS:
   ```
   Type: TXT
   Name: @
   Value: google-site-verification=XXXXXX
   TTL: 3600
   ```

**Opción B - Verificación por HTML:**
1. Google te dará un archivo HTML
2. Súbelo a `/public/google-verification-file.html`
3. Despliega en Vercel

### Paso 3: Enviar Sitemap
1. Una vez verificado, ve a **Sitemaps** en el menú
2. Agrega: `https://cotizadorutiles.cl/sitemap.xml`
3. Click en **Enviar**

⏰ **Indexación**: Google puede tardar 1-7 días en comenzar a indexar

---

## 7. Mejorar SEO Adicional (Futuro)

### Recomendaciones:
1. **Crear contenido de blog**:
   - "Cómo ahorrar en útiles escolares 2026"
   - "Lista completa de útiles por nivel"
   - "Mejores tiendas para comprar útiles en Chile"

2. **Schema.org markup** (datos estructurados):
   ```json
   {
     "@context": "https://schema.org",
     "@type": "WebApplication",
     "name": "Cotizador de Útiles Escolares",
     "description": "Compara precios de útiles escolares",
     "url": "https://cotizadorutiles.cl"
   }
   ```

3. **Performance**:
   - Asegúrate de que el sitio cargue rápido (<3 segundos)
   - Usa Lighthouse en Chrome DevTools para revisar

4. **Backlinks**:
   - Comparte en redes sociales
   - Contacta blogs de educación/familia en Chile
   - Registra en directorios locales

---

## 8. Certificado SSL

✅ **Automático en Vercel**: Vercel proporciona certificados SSL/HTTPS gratuitos automáticamente para todos los dominios.

No necesitas hacer nada, tu sitio será:
- `https://cotizadorutiles.cl` ✅
- `https://www.cotizadorutiles.cl` ✅

---

## 9. Comandos para Desplegar Cambios

```bash
# Commit cambios SEO
git add -A
git commit -m "feat: add complete SEO meta tags, robots.txt and sitemap"
git push

# Vercel desplegará automáticamente
```

---

## 10. Checklist Final

### Antes del dominio:
- [x] Meta tags agregados
- [x] robots.txt creado
- [x] sitemap.xml creado
- [x] Open Graph tags configurados

### Después de comprar dominio:
- [ ] Comprar dominio (recomendado: cotizadorutiles.cl)
- [ ] Agregar dominio en Vercel
- [ ] Configurar DNS en registrador
- [ ] Actualizar URLs en index.html
- [ ] Actualizar URLs en sitemap.xml
- [ ] Actualizar URLs en robots.txt
- [ ] Verificar en Google Search Console
- [ ] Enviar sitemap a Google
- [ ] Compartir en redes sociales

---

## 11. Monitoreo SEO

### Herramientas gratuitas:
1. **Google Search Console** - Indexación y errores
2. **Google Analytics 4** - Tráfico y comportamiento
3. **Bing Webmaster Tools** - Indexación en Bing
4. **Ubersuggest** - Keywords y competencia

---

## Resumen Ejecutivo

**Dominio recomendado**: `cotizadorutiles.cl` (~$10.000 CLP/año)

**Próximos pasos**:
1. ✅ Commit y push cambios SEO (ahora)
2. Comprar dominio en NIC Chile o Hostinger
3. Configurar DNS apuntando a Vercel
4. Actualizar URLs en el código
5. Registrar en Google Search Console
6. Enviar sitemap

**Tiempo estimado**: 2-3 horas de configuración + 24-48 horas de propagación DNS
