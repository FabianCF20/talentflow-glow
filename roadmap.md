# Plan de reorganización por etapas

## Etapa 1 — Documentación y código común (hecha)
- [x] Comentario de propósito al inicio de cada archivo.
- [x] Documento de arquitectura (`docs/ARQUITECTURA.md`).
- [x] Utilidades únicas de fechas (`lib/fechas.ts`) y formato (`lib/formato.ts`).

## Etapa 2 — Dividir pantallas grandes (pendiente)
- [ ] Separar en componentes las pantallas de más de 500 líneas: usuarios, portal, evaluaciones, sst, nomina, disciplinario, ausencias, empleados.$id.
- [ ] Separar `EmpleadoDialog` en una sección por archivo.

## Etapa 3 — Formularios y validación (pendiente)
- [ ] Validación compartida con esquemas por dominio.
- [ ] Guardado con auditoría centralizada en un solo servicio.

## Etapa 4 — Pruebas (pendiente)
- [ ] Pruebas de reglas de negocio (`lib/`) y de reglas de seguridad.
