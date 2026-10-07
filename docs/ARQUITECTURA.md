# Arquitectura de SIGTH

Documento de referencia para entender, corregir y hacer crecer el sistema.
Complementa la [guía de edición](GUIA-DE-EDICION.md) y el
[mapa del código](../src/README.md).

## 1. Metodología

El proyecto sigue una **arquitectura por capas organizada por dominio**:

```text
 Pantalla (routes/)  ──usa──▶  Componentes (components/<dominio>/)
        │                              │
        ▼                              ▼
 Estado compartido (store/<dominio>)  ◀──  Reglas de negocio (lib/<dominio>.ts)
        │                              │
        ▼                              ▼
 Datos en memoria (data/<dominio>)  ◀──  Firebase (lib/firebase.ts, lib/firestore.ts)
        │
        ▼
 Modelos (types/<dominio>.ts)
```

Principios aplicados:

| Principio | Cómo se aplica aquí |
| --- | --- |
| Responsabilidad única | Una pantalla compone; una regla vive en `lib/`; un modelo vive en `types/`. |
| No repetirse (DRY) | Utilidades comunes en `lib/fechas.ts`, `lib/formato.ts`, `components/common/`. |
| Una sola fuente de verdad | Roles y permisos en `config/roles.ts`; menú en `config/navigation.ts`; colecciones en `lib/maestros.ts`. |
| Tolerancia a datos incompletos | Las funciones de formato devuelven textos seguros si falta un dato. |
| Nada se borra | Todo registro tiene estado `activo`, `inactivo` o `archivado`. |
| Seguridad en el servidor | La pantalla oculta opciones, pero quien protege los datos es `firestore.rules`. |

## 2. Dominios (módulos)

| Dominio | Pantallas | Reglas | Estado | Modelos |
| --- | --- | --- | --- | --- |
| Organización | `organizacion`, `organigrama`, `maestros` | `lib/maestros.ts`, `lib/visibilidad.ts` | — | `types/organizacion.ts` |
| RRHH | `empleados`, `empleados.$id` | `lib/rrhh.ts` | `store/rrhh.tsx` | `types/rrhh.ts` |
| Portal | `portal`, `solicitudes`, `documentos` | `lib/documentos.ts`, `lib/certificados.ts` | `store/portal.tsx` | `types/portal.ts` |
| Operaciones | `ausencias`, `asistencia`, `horas-extras`, `novedades` | `lib/operaciones.ts` | `store/operaciones.tsx` | `types/operaciones.ts` |
| Nómina | `nomina` | `lib/nomina.ts`, `lib/desprendible.ts` | `store/nomina.tsx` | `types/nomina.ts` |
| SST | `sst`, `dotacion` | `lib/sst.ts` | `store/sst.tsx` | `types/sst.ts` |
| Disciplinario | `disciplinario` | `lib/disciplinario.ts` | `store/disciplinario.tsx` | `types/disciplinario.ts` |
| Evaluaciones | `evaluaciones`, `formularios` | — | — | — |
| Administración | `usuarios`, `auditoria`, `configuracion`, `cumplimiento`, `reportes` | `lib/usuarios-admin.ts`, `lib/permisos.ts`, `lib/alertas.ts`, `lib/habeas-data.ts`, `lib/firma-digital.ts`, `lib/reportes.ts` | — | `types/entities.ts` |

## 3. Utilidades compartidas (reutilizar siempre)

| Necesita… | Use | Archivo |
| --- | --- | --- |
| Fecha de hoy, sumar días/meses, días entre fechas | `hoyISO`, `sumarDias`, `sumarMeses`, `diasEntre` | `lib/fechas.ts` |
| Pesos colombianos | `formatCOP` | `lib/formato.ts` |
| Nombre completo o iniciales | `nombreCompleto`, `iniciales` | `lib/formato.ts` |
| Leer/escribir una colección en tiempo real | `useFirestoreState` | `lib/firestore.ts` |
| Saber quién está conectado y sus roles | `useAuth` | `lib/auth.tsx` |
| ¿Puede este rol hacer X? | `can(roles, modulo, accion)` | `config/roles.ts` |
| Qué empleados puede ver un rol | `empleadosVisibles` | `lib/visibilidad.ts` |
| Exportar a Excel/CSV/PDF | `exportar…` | `lib/excel.ts`, `lib/export.ts`, `lib/pdf.ts` |
| Listado con columnas | `DataTable` | `components/common/DataTable.tsx` |
| Encabezado de página | `PageHeader` | `components/common/PageHeader.tsx` |
| Indicador | `StatCard` | `components/common/StatCard.tsx` |
| Lista vacía | `EmptyState` | `components/common/EmptyState.tsx` |
| CRUD de un catálogo | `CrudMaestro` | `components/maestros/CrudMaestro.tsx` |

## 4. Cómo agregar un módulo nuevo (receta)

1. **Modelo:** cree `src/types/<dominio>.ts` con las interfaces y sus etiquetas.
2. **Reglas:** cree `src/lib/<dominio>.ts` con cálculos y validaciones (sin JSX).
3. **Datos:** si se guarda en Firestore, use `useFirestoreState("<coleccion>")`.
4. **Seguridad:** agregue la colección en `firestore.rules` (por defecto todo está cerrado).
5. **Permisos:** registre el módulo en `config/roles.ts`.
6. **Pantalla:** cree `src/routes/<url>.tsx` con `head()` y use `AppShell` + `PageHeader`.
7. **Menú:** agregue la entrada en `config/navigation.ts`.
8. **Auditoría:** registre las acciones importantes en la colección `auditoria`.
9. **Comprobar:** `bun run lint` y `bun run build`.

## 5. Convenciones de documentación

- Cada archivo empieza con un comentario `/** … */` que explica su propósito.
- Toda función exportada lleva un comentario de una línea con qué hace.
- Los comentarios se escriben en **español**.
- Explique el *porqué* de reglas no obvias (leyes, flujos de aprobación).

## 6. Etapas de mejora

Ver [`roadmap.md`](../roadmap.md) para el plan de reorganización por etapas.
