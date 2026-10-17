# Plan de reorganización por etapas

## Corrección documental y permisos
- [x] Unificar la consulta de firmas entre Cumplimiento y Gestión documental y enlazar alertas a su módulo responsable.
- [x] Restringir consultas y acciones documentales por rol y categoría; preparar reglas de Firebase.
- [x] Ocho pruebas de permisos y navegación autenticada del mismo código de firma entre ambas pantallas; no se borraron datos.
- [ ] Publicar firestore.rules y storage.rules en Firebase y comprobar restricciones con cuentas SST y empleado: pendiente de publicación y cuentas de prueba por rol.

## Etapa 1 — Documentación y código común (hecha)
- [x] Comentario de propósito al inicio de cada archivo.
- [x] Documento de arquitectura (`docs/ARQUITECTURA.md`).
- [x] Utilidades únicas de fechas (`lib/fechas.ts`) y formato (`lib/formato.ts`).

## Etapa 2 — Dividir pantallas grandes (en curso)
- [x] SST: cada pestaña en `components/sst/*Tab.tsx` (pantalla de 817 a 170 líneas).
- [x] Nómina: Conceptos fijos, Liquidaciones, Desprendibles y `useUsuarioActual` en `components/nomina/` (750 a 420 líneas).
- [x] Piezas pequeñas: `EstadoUsuarioBadge`, `ResumenMini`, `Campo`.
- [ ] Usuarios, Portal, Evaluaciones, Disciplinario, Ausencias y Ficha del empleado: hoy son una sola función gigante; dividir por pestaña pasando el estado necesario.
- [ ] Separar `EmpleadoDialog` en una sección por archivo.

## Etapa 3 — Formularios y validación (pendiente)
- [ ] Validación compartida con esquemas por dominio.
- [ ] Guardado con auditoría centralizada en un solo servicio.

## Etapa 4 — Pruebas (pendiente)
- [ ] Pruebas de reglas de negocio (`lib/`) y de reglas de seguridad.
