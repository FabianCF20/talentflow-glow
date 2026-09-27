# Mapa del codigo fuente

Esta carpeta contiene la aplicacion. Para aprender a modificarla paso a paso,
consulta la [guia de edicion manual](../docs/GUIA-DE-EDICION.md).

## Donde buscar

| Necesitas cambiar... | Empieza por... | Responsabilidad |
| --- | --- | --- |
| Una pantalla o URL | `routes/` | Entrada de cada pagina y composicion de la vista. Los nombres determinan las rutas. |
| La estructura global, navegacion o inicio de sesion | `routes/__root.tsx`, `components/layout/`, `config/navigation.ts` | Marco de la aplicacion y navegacion compartida. |
| Un componente de un modulo | `components/rrhh/`, `components/nomina/`, `components/sst/`, `components/operaciones/`, `components/portal/`, `components/maestros/` o `components/disciplinario/` | UI especifica de cada area. |
| Un componente compartido | `components/common/` o `components/layout/` | Elementos reutilizados entre pantallas. |
| Un control visual base | `components/ui/` | Primitivas visuales reutilizables. |
| Datos iniciales o de demostracion | `data/` | Colecciones y datos compartidos; los archivos suelen agruparse por dominio. |
| Reglas de negocio o acceso a servicios | `lib/` | Firebase, autenticacion, permisos, validaciones, exportaciones y operaciones de dominio. |
| Estado compartido | `store/` | Estado React agrupado por dominio. |
| Tipos y modelos | `types/` | Entidades y contratos de datos agrupados por dominio. |
| Roles y menus | `config/roles.ts`, `config/navigation.ts` | Catalogos y configuracion de acceso/navegacion. |
| Estilos globales | `styles.css` | Tokens y estilos globales. |
| Arranque y renderizado del servidor | `start.ts`, `server.ts`, `router.tsx` | Inicializacion de TanStack Start y del router. |

## Modulos por dominio

La UI ya agrupa sus componentes funcionales por dominio. La logica relacionada
se mantiene en las capas comunes `data/`, `lib/`, `store/` y `types/`, usando el
mismo nombre de dominio. Por ejemplo, para RRHH consulta:

- `routes/empleados.tsx` y `routes/empleados.$id.tsx` para las pantallas.
- `components/rrhh/` para componentes de RRHH.
- `data/rrhh.ts`, `lib/rrhh.ts`, `store/rrhh.tsx` y `types/rrhh.ts` para datos,
  reglas, estado y modelos.

Mantener estas capas separadas permite localizar cada responsabilidad sin
convertir las rutas en la fuente de datos o en el lugar de las reglas del
negocio. Para modulos compartidos, utiliza `components/common/` y `lib/`.

## Reglas de estructura

- No renombres ni muevas archivos de `routes/` sin revisar el cambio de URL y el
  arbol generado por TanStack Router.
- No edites `routeTree.gen.ts`: se genera automaticamente.
- Usa el alias `@/` para imports desde `src/` y conserva imports explicitos.
- Al crear logica de dominio, ponla en la capa correspondiente y evita duplicar
  reglas dentro de componentes de pantalla.
- Antes de agregar una carpeta transversal nueva, comprueba si encaja en una de
  las capas existentes o en un dominio de `components/`.