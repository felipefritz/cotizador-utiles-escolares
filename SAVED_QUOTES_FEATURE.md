# Feature: Gestión Avanzada de Cotizaciones Guardadas

## ¿Qué cambió?

Se ha implementado un sistema completo para gestionar cotizaciones guardadas con capacidad de rastrear items comprados.

## Funcionalidades Nuevas

### 1. **Nombres Personalizados para Cotizaciones**
- Cada cotización guardada ahora tiene un nombre editable (ej: "Cotización Colegio 1", "Útiles Marzo 2026")
- Los nombres aparecen en el dashboard y facilitan identificar cotizaciones rápidamente

### 2. **Rastreo de Items Comprados**
- Marcar items individuales como "comprados" con información de:
  - Proveedor donde se compró
  - Precio pagado
  - Cantidad
  - Fecha de compra
- Ver historial de items comprados en cada cotización
- Desmarcar items si es necesario

### 3. **Estados de Cotización**
Las cotizaciones ahora pueden tener estados:
- **Borrador**: Cotización en proceso
- **Pendiente**: Esperando decisión de compra
- **Completada**: Todos los items fueron comprados
- **Archivada**: Cotización antigua que no necesitas

### 4. **Nueva Pestaña: "Cotizaciones Guardadas"**
En el Dashboard del usuario, hay una nueva pestaña con:
- Vista de tarjetas de todas tus cotizaciones guardadas
- **Editar**: Cambiar nombre, notas y estado
- **Ver**: Ver detalles completos (items, precios, resultados)
- **Compras**: Ver y gestionar items comprados
- **Favoritos**: Marcar cotizaciones importantes con ⭐
- **Eliminar**: Borrar cotizaciones que no necesites

## Cambios Técnicos

### Base de Datos
Se agregaron campos a la tabla `saved_quotes`:
- `purchased_items` (JSON): Diccionario con items comprados
- `selected_provider` (String): Proveedor elegido
- `status` (String): Estado actual de la cotización (default: "draft")

### Nuevos Endpoints API

#### Actualizar Cotización
```
PUT /api/user/quotes/{quote_id}
Body: {
  "title": "Nuevo nombre",
  "notes": "Notas adicionales",
  "status": "pending",
  "purchased_items": { ... },
  "selected_provider": "dimeiggs"
}
```

#### Marcar Item como Comprado
```
POST /api/user/quotes/{quote_id}/mark-purchased
Body: {
  "item_name": "Lápices de color",
  "provider": "dimeiggs",
  "price": 5990,
  "quantity": 1
}
```

#### Desmarcar Item
```
POST /api/user/quotes/{quote_id}/unmark-purchased
Body: {
  "item_name": "Lápices de color"
}
```

### Frontend
- Nuevo componente: `SavedQuotesManager.tsx`
- UI mejorada con Material-UI Cards, Tables y Dialogs
- Integración en `UserDashboard.tsx`

## Cómo Usar

### En el Dashboard
1. Ve a "Mi Cuenta" → Pestaña "Cotizaciones Guardadas"
2. Verás todas tus cotizaciones con:
   - Nombre personalizado
   - Estado actual
   - Cantidad de items
   - Items comprados (si los hay)

### Editar una Cotización
1. Haz clic en el ícono ✏️ en la tarjeta
2. Cambia el nombre, notas o estado
3. Guarda los cambios

### Rastrear Compras
1. Haz clic en el ícono 🛒 (Carrito) en la tarjeta
2. Verás los items que ya marcaste como comprados
3. Puedes marcar más items como comprados desde la cotización
4. Cada item registra: proveedor, precio, cantidad y fecha

### Ver Detalles Completos
1. Haz clic en el ícono 👁️ (Ojo) en la tarjeta
2. Verás:
   - Lista completa de items
   - Cotizaciones por proveedor
   - Notas
   - Historial de cambios

## Ejemplo de Uso

**Escenario**: Cotizando útiles para el colegio

1. Haces una cotización con múltiples proveedores
2. Guardas la cotización con nombre: "Útiles Colegio ABC - 2026"
3. Decidiste comprar en Dimeiggs algunos items:
   - Haz clic en 🛒
   - Marca "Lápices de color" en Dimeiggs ($5990)
   - Marca "Cuadernos" en Dimeiggs ($3990)
4. Después compras en Librería Nacional:
   - Marca "Mochilas" en Librería Nacional ($25000)
5. Cambia el estado a "Completada"
6. En futuro, cuando lo necesites, puedes ver exactamente qué compraste, dónde y cuánto gastaste

## Notas Importantes

- Los items comprados se guardan en el servidor (en Railway)
- Puedes desmarcar un item si fue un error
- Los estados no tienen restricciones: puedes cambiarlos en cualquier momento
- Las cotizaciones guardadas son privadas para cada usuario
- Cuando eliminas una cotización, se pierden todos sus datos

## Próximas Mejoras (Futuro)

- [ ] Exportar historial de compras a Excel/PDF
- [ ] Presupuesto total gastado por mes
- [ ] Recordatorios para cotizaciones pendientes
- [ ] Comparativa de precios en el tiempo
- [ ] Compartir cotizaciones con otros usuarios
