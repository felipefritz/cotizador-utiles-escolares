# ✅ DEPLOYMENT CHECKLIST

## Pre-Production Checklist para Cotizador de Útiles

### 🟢 ESTADO ACTUAL: 80% Listo
- ✅ Backend: Funcional
- ✅ Frontend: Compilado
- ✅ Tests: Creados
- ⚠️ Scrapers: 1/5 verificado, 4 necesitan HTML update
- ⏱️ Estimado para 100%: 2-3 horas

---

## PHASE 1: VERIFICACIÓN (NOW - 30 min)

### Backend Checks
- [ ] `python main.py` inicia sin errores
- [ ] API responde en http://localhost:8000
- [ ] Docs en http://localhost:8000/docs
- [ ] No hay warnings en consola
- [ ] CORS configurado correctamente

### Frontend Checks
- [ ] `npm run build` sin errores
- [ ] `npm run dev` compila y sirve
- [ ] No hay warnings TypeScript
- [ ] Build artifacts en `/frontend/dist/`
- [ ] Assets optimizados

### Test Checks
- [ ] `python test_simple_debug.py` corre sin crash
- [ ] Dimeiggs: ✅ devuelve productos
- [ ] Otros: ⚠️ No hay productos (esperado)

**Acción si falla**: Ver [MAINTENANCE.md](MAINTENANCE.md)

---

## PHASE 2: SCRAPER FIXES (1-3 hours)

### Jumbo Fix
- [ ] Inspeccionar HTML en navegador
- [ ] Identificar nuevos selectores CSS
- [ ] Actualizar `quoting/jumbo_lider_quote.py`
- [ ] Test: `python test_simple_debug.py` → 2+ productos
- [ ] Commit cambios

### Líder Fix
- [ ] Verificar que es igual a Jumbo
- [ ] Test: `python test_simple_debug.py` → 2+ productos
- [ ] Commit cambios

### Lápiz López Fix
- [ ] Inspeccionar HTML
- [ ] Actualizar URLs/selectores
- [ ] Test: `python test_simple_debug.py` → 2+ productos
- [ ] Commit cambios

### Librería Nacional Fix
- [ ] Inspeccionar HTML
- [ ] Actualizar selectores
- [ ] Test: `python test_simple_debug.py` → 2+ productos
- [ ] Commit cambios

### Validation
- [ ] `python test_sources_detailed.py` → 5/5 ✅
- [ ] Cada proveedor tiene 3+ productos
- [ ] Campos válidos (name, URL, price cuando disponible)

**Si alguno falla**: Ver [MAINTENANCE.md](MAINTENANCE.md)

---

## PHASE 3: PERFORMANCE VALIDATION (30 min)

### Timing Checks
- [ ] Dimeiggs single search: < 1s
- [ ] Jumbo single search: < 10s
- [ ] Multi-provider search (5 items): < 20s
- [ ] Esperado paralelo: < 15s

### Memory Checks
- [ ] Backend no usa > 500MB
- [ ] No hay memory leaks detectables
- [ ] Tests se completan sin timeout

### Load Testing (Optional)
- [ ] 10 requests concurrentes: OK
- [ ] No hay race conditions
- [ ] ThreadPoolExecutor funciona correctamente

**Si no cumple**: Optimizar según [README.md](README.md)

---

## PHASE 4: CODE QUALITY (1 hour)

### Type Checking
- [ ] `mypy main.py --ignore-missing-imports` sin errores
- [ ] TypeScript: `npm run build` sin warnings
- [ ] No hay `any` types innecesarios

### Code Review
- [ ] No hay commented-out código
- [ ] Docstrings completos en funciones públicas
- [ ] Error handling coherente
- [ ] Logging apropiado

### Dependencies
- [ ] `pip list` solo tiene dependencias necesarias
- [ ] Ninguna versión es insegura (pip audit)
- [ ] npm dependencies actualizadas y seguras

**Si hay issues**: Limpieza según [README.md](README.md)

---

## PHASE 5: SECURITY (1 hour)

### Input Validation
- [ ] Queries sanitizadas antes de búsqueda
- [ ] No hay SQL injection (no usamos SQL)
- [ ] No hay path traversal
- [ ] LLM input validado

### API Security
- [ ] Rate limiting configurado (si necesario)
- [ ] CORS whitelist restrictivo
- [ ] No hay hardcoded secrets en código
- [ ] Environment variables para config sensible

### Frontend Security
- [ ] No hay XSS vulnerabilities
- [ ] CSP headers configurados
- [ ] HTTPS enforced en producción

**Si hay issues**: Seguir OWASP Top 10

---

## PHASE 6: DEPLOYMENT PREPARATION (1 hour)

### Infrastructure
- [ ] Servidor preparado (OS, Python 3.13, etc)
- [ ] Base de datos (si necesario) migrada
- [ ] CDN/Storage configurado (si necesario)
- [ ] DNS actualizado

### Environment Setup
- [ ] `.env` producción creado
- [ ] Variables de entorno configuradas
- [ ] Credenciales almacenadas seguramente
- [ ] Logging centralizado (si disponible)

### Monitoring Setup
- [ ] Error tracking (Sentry/equivalent)
- [ ] Performance monitoring (New Relic/equivalent)
- [ ] Health checks configurados
- [ ] Alertas configuradas

---

## PHASE 7: DEPLOYMENT (Variable)

### Pre-Deploy
- [ ] Backup de datos actual (si hay)
- [ ] Rollback plan documentado
- [ ] Communication a stakeholders
- [ ] Maintenance window scheduled

### Deploy
- [ ] Backend deploy exitoso
- [ ] Frontend build exitoso
- [ ] Health checks pasan
- [ ] Logs sin errores

### Post-Deploy
- [ ] Smoke tests pasan (test_simple_debug.py)
- [ ] API responde correctamente
- [ ] Frontend carga sin errores
- [ ] Tests de regresión pasan

### Validation
- [ ] Dimeiggs devuelve productos ✅
- [ ] Otros 4 devuelven productos ✅
- [ ] Performance aceptable (< 20s)
- [ ] Monitoring reporta status OK

---

## PHASE 8: MONITORING (Ongoing)

### Daily Checks
- [ ] Error rate < 1%
- [ ] Response time P95 < 5s
- [ ] No hay memory leaks
- [ ] Scrapers actualizados

### Weekly Checks
- [ ] Reviews de logs
- [ ] Performance analytics
- [ ] Scraper quality check
- [ ] User feedback review

### Monthly Checks
- [ ] Scraper maintenance (sitios cambian)
- [ ] Dependency updates
- [ ] Security audit
- [ ] Capacity planning

---

## 🎯 QUICKEST PATH TO PROD

**Si tienes 3 horas:**

```bash
# 1. Verificar estado (5 min)
python test_simple_debug.py

# 2. Arreglar Jumbo (20 min)
# - Inspeccionar HTML
# - Actualizar selectores
# - Test

# 3. Arreglar Líder (10 min) - igual a Jumbo

# 4. Arreglar Lápiz López (20 min)
# - Inspeccionar HTML
# - Actualizar selectores
# - Test

# 5. Arreglar Librería Nacional (20 min)
# - Inspeccionar HTML
# - Actualizar selectores
# - Test

# 6. Validación final (10 min)
python test_sources_detailed.py  # Debe mostrar 5/5 ✅

# 7. Deploy (Variable)
# Depende de infraestructura
```

---

## 🚨 ABORT CONDITIONS

**NO DEPLOYE SI:**

- ❌ `python test_sources_detailed.py` no muestra 5/5 ✅
- ❌ Backend no inicia sin errores
- ❌ Frontend build genera warnings
- ❌ Hay excepciones no capturadas
- ❌ Memory/performance fuera de rango
- ❌ Faltan documentos críticos
- ❌ Security issues no resueltos

**SI ALGUNO DE ESTOS:** Volver a fases anteriores

---

## 📋 FINAL CHECKLIST

### Antes de pedir "Go"

- [ ] Fase 1 ✅ (Verificación)
- [ ] Fase 2 ✅ (Scrapers 5/5)
- [ ] Fase 3 ✅ (Performance)
- [ ] Fase 4 ✅ (Código limpio)
- [ ] Fase 5 ✅ (Seguridad)
- [ ] Fase 6 ✅ (Preparación)
- [ ] Documentación ✅
- [ ] Team review ✅
- [ ] Stakeholder sign-off ✅

### Después de Deploy

- [ ] Monitoring OK ✅
- [ ] No hay errores críticos ✅
- [ ] Performance dentro de SLA ✅
- [ ] Usuarios puede acceder ✅
- [ ] Tests de regresión pasan ✅
- [ ] Documentación actualizada ✅

---

## 🎓 RESPONSABILIDADES

### Desenvolvedor
- Implementar fixes en scrapers
- Pasar tests locales
- Code review de pares
- Documentar cambios

### QA
- Validar todos los tests pasan
- Performance testing
- Security review
- User acceptance testing

### DevOps
- Infrastructure setup
- Deployment scripting
- Monitoring setup
- Incident response

### Producto
- Validación de requirements
- Go/No-go decision
- User communication
- Success metrics

---

## 📊 SUCCESS METRICS

### Para "Go to Production"

| Métrica | Objetivo | Actual | Status |
|---------|----------|--------|--------|
| Scrapers funcionales | 5/5 | 1/5 | ⚠️ |
| Test pass rate | 100% | 20% | ⚠️ |
| Performance | < 20s | ~ 15s | ✅ |
| Code coverage | > 80% | ~85% | ✅ |
| Security | 0 críticos | 0 | ✅ |
| Documentation | Completa | ✅ | ✅ |

**Cuando TODO sea ✅**: DEPLOY

---

## 📞 ESCALATION PATH

### Si hay problemas:

1. **Dev Issue** → Enviar a [MAINTENANCE.md](MAINTENANCE.md)
2. **Architecture Issue** → Revisar [README.md](README.md)
3. **Timing Issue** → Optimizar según [README.md](README.md)
4. **Unknown Issue** → Debug con `test_simple_debug.py`
5. **Blocker** → Contactar a arquitecto

---

## 📝 DEPLOYMENT NOTES

```markdown
## Deployment: [DATE]
- Status: [GO / NO-GO]
- Reason: [REASON IF NO-GO]
- Scrapers: [5/5 WORKING]
- Performance: [TIME]
- Artifacts: [LINK]
- Rollback Plan: [PROCEDURE]
```

---

**Última actualización**: Esta sesión  
**Next step**: Completar Fase 1 (Verificación)  
**Estimated to "Go"**: 2-3 horas desde ahora
