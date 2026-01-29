# 📚 Guía de Uso - Nuevas Características

## 1️⃣ Sistema de Sugerencias de Proveedores

### Para Usuarios Normales

#### Sugerir un nuevo proveedor

1. **Logueate** en tu cuenta (o crea una)
2. Ve a la **HomePage** (click en logo)
3. Baja hasta la sección **"Tiendas Participantes"**
4. Verás un botón azul **"Sugerir Tienda"** (solo visible si estás logueado)
5. Se abre un formulario con estos campos:
   - **Nombre del proveedor**: Nombre de la tienda (ej: "Jumbo Lider", "Cencosud")
   - **Descripción**: Cuéntanos por qué debería incluirse, qué productos vende
   - **Sitio web (opcional)**: URL del sitio
   - **Email de contacto (opcional)**: Email para contacto
6. Click en **"Enviar sugerencia"**
7. Verás confirmación de éxito
8. Los admins revisarán tu sugerencia

#### Ver mis sugerencias

1. Aún no hay UI pública para esto, pero usa la API:
   ```
   GET /api/suggestions
   ```

---

## 2️⃣ Admin - Gestionar Sugerencias

### Acceder al Panel

1. Logueate con cuenta **admin**
2. Ve a **Admin Dashboard** (icono 🔐)
3. Verás 4 tabs: Planes, Usuarios, **Sugerencias**, Analítica
4. Click en **"Sugerencias"**

### Ver todas las sugerencias

- Verás una grid con cards de todas las sugerencias
- Cada card muestra:
  - Nombre del proveedor
  - Descripción
  - Sitio web (si lo tiene)
  - Email (si lo tiene)
  - **Estado actual** (chip de color)
  - Notas del admin (si las hay)

### Cambiar el estado de una sugerencia

1. En la card de la sugerencia, click en **"Gestionar"**
2. Se abre un dialog con:
   - Nombre del proveedor (lectura)
   - **Dropdown de Estado**: 
     - 🔄 Procesando (default)
     - ✅ Completado (ya agregamos el proveedor)
     - ❌ No es factible
     - ⛔ Rechazado
   - **Notas (admin)**: Campo de texto para notas internas
3. Selecciona nuevo estado
4. Agrega notas si quieres
5. Click **"Guardar"**

### Estados explicados

- **Procesando**: Se está evaluando la sugerencia
- **Completado**: Ya agregamos este proveedor al sistema
- **No es factible**: La tienda no tiene datos públicos o no es posible integrarla
- **Rechazado**: No cumple requisitos

---

## 3️⃣ Admin - Cambiar Plan de Usuario

### Acceder al Panel

1. Logueate con cuenta **admin**
2. Ve a **Admin Dashboard** (icono 🔐)
3. Verás 4 tabs: Planes, **Usuarios**, Sugerencias, Analítica
4. Click en **"Usuarios"**

### Ver usuarios

- Tabla con columnas:
  - Email
  - Nombre (hidden en móvil)
  - Admin? (hidden en tablet)
  - Activo? (hidden en tablet)
  - Acciones
- En móvil, muestra solo Email + Acciones

### Cambiar el plan de un usuario

1. En la fila del usuario, click en botón **"Plan"**
2. Se abre un dialog que dice:
   - "Usuario: [email]"
   - Dropdown: "Selecciona un plan"
3. Abre el dropdown y verás:
   - free - Gratis
   - basic - $5K/mes (o el precio configurado)
   - pro - $15K/mes (o el precio configurado)
4. Selecciona nuevo plan
5. Click **"Cambiar Plan"**
6. Verás confirmación de éxito
7. La lista se actualiza

### Qué sucede cuando cambio el plan

- La suscripción del usuario se actualiza inmediatamente
- El usuario ahora tiene acceso a los límites del nuevo plan
- Los cambios se guardan en BD
- El usuario puede verificarlo en su dashboard

---

## 4️⃣ HomePage - Diseño Moderno

### Secciones

1. **Hero Section**
   - Gran titular "Cotiza Útiles Escolares"
   - Descripción llamativa
   - Botones para logueados vs no logueados
   - Emoji animado (📊)

2. **¿Por qué Cotizador de Útiles?**
   - 6 cards con features
   - Hover effects modernos
   - Iconos significativos

3. **Tiendas Participantes**
   - 7 tiendas en cards coloridas
   - Botón "Sugerir Tienda" (si estás logueado)
   - Botón "Probar Gratis" (si no estás logueado)

4. **Planes que se adaptan a ti**
   - 3 planes en cards
   - Plan "Pro" tiene badge "⭐ MÁS POPULAR"
   - Cada plan muestra:
     - Precio
     - Features con checkmarks
     - Botón para contratar

5. **Cotiza en 4 Pasos Simples**
   - Números en círculos
   - Descripciones breves

6. **Footer CTA**
   - Llamado a la acción final
   - Botones destacados

### Responsive

- Todos los elementos se adaptan a móvil
- Fonts son más pequeños en móvil
- Buttons tienen padding adaptable
- Grid se ajusta automáticamente

---

## 5️⃣ Admin Dashboard - Responsive

### Desktop (md+)
- Tabs visibles en toolbar
- Tablas con todas las columnas
- Drawer oculto

### Tablet (sm-md)
- Tabs aún visibles (scrollable si es necesario)
- Algunas columnas ocultas en tablas
- Cards más compactos

### Mobile (xs)
- Drawer con tabs (click en hamburger ☰)
- Tablas con solo columnas esenciales
- Cards apilados verticalmente
- Botones más grandes para tocar

### Componentes Mejorados

- **Spacing**: `py: { xs: 2, md: 4 }` (se ajusta)
- **Font Size**: `fontSize: { xs: '1rem', sm: '1.25rem' }`
- **Grid**: `xs={12}, sm={6}, md={4}` (responsivo)
- **Display**: `display: { xs: 'block', md: 'none' }` (ocultar en móvil)

---

## 🔒 Permisos

### Usuario Normal
- ✅ Ver HomePage
- ✅ Sugerir nuevos proveedores
- ✅ Ver sus propias sugerencias (API)
- ❌ Acceder Admin Dashboard
- ❌ Ver sugerencias de otros
- ❌ Cambiar plans de otros

### Usuario Admin
- ✅ Ver HomePage
- ✅ Sugerir nuevos proveedores
- ✅ Ver TODAS las sugerencias
- ✅ Cambiar estado de sugerencias
- ✅ Cambiar plan de cualquier usuario
- ✅ Ver usuarios
- ✅ Editar planes
- ✅ Ver analítica

---

## 🆘 Troubleshooting

### No veo el botón "Sugerir Tienda"
- ✅ Verifica que estés logueado
- ✅ Refresh la página
- ✅ Baja hasta la sección "Tiendas Participantes"

### El formulario de sugerencia no envía
- ✅ Verifica que tengas nombre + descripción
- ✅ Revisa la consola del navegador (F12)
- ✅ Verifica que estés logueado

### No veo el tab "Sugerencias" en Admin
- ✅ Verifica que tu usuario sea admin
- ✅ Refresh el Admin Dashboard
- ✅ Revisa en BD si `is_admin=true`

### El cambio de plan no funciona
- ✅ Verifica que seas admin
- ✅ Verifica que el usuario exista
- ✅ Verifica que el plan exista
- ✅ Revisa los logs del servidor

---

## 📞 Soporte

Si tienes problemas:

1. Revisa la consola (F12)
2. Checkea los logs del servidor
3. Verifica la BD con un cliente SQL
4. Contacta al equipo de desarrollo
