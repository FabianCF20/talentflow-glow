# Guia para editar TalentFlow Hub

## Objetivo

Esta guia sirve para localizar el codigo responsable de una funcionalidad,
editarlo manualmente y comprobar que el cambio no rompio rutas, tipos o reglas
de acceso. El indice rapido esta en [src/README.md](../src/README.md).

## 1. Recorrido de una pantalla

El flujo habitual es:

1. El archivo de `src/routes/` declara la ruta y conecta la pantalla.
2. La ruta compone componentes de `src/components/`.
3. Los componentes leen/escriben datos mediante `src/lib/` y estado compartido
   en `src/store/` cuando aplique.
4. Los modelos y contratos se definen en `src/types/`; catálogos y datos
   iniciales se ubican en `src/config/` y `src/data/`.
5. Si los datos se persisten, la capa de servicio usa Firebase a traves de
   `src/lib/firebase.ts` y las utilidades de Firestore.

No toda pantalla sigue exactamente el mismo recorrido: revisa primero una
pantalla cercana del mismo dominio y conserva sus patrones.

## 2. Casos comunes

### Cambiar una pantalla existente

- Localiza el archivo en `src/routes/` por su nombre de URL.
- Si solo cambia presentacion, modifica el componente en `src/components/` o
  crea uno bajo la carpeta del dominio.
- Si cambia una regla o una operacion de datos, ubicala en `src/lib/` y haz que
  la pantalla la invoque. Mantener la regla fuera de JSX facilita reutilizarla.
- Si cambia la forma de un registro, actualiza el tipo de `src/types/` y todos
  los lugares que lo construyen o consumen.

### Agregar una ruta

- Crea un archivo `.tsx` en `src/routes/` con el nombre correspondiente a la
  URL. Por ejemplo, `informes.tsx` crea `/informes`.
- Declara la ruta con `createFileRoute` siguiendo una ruta vecina.
- Ejecuta el build para que TanStack Router actualice el arbol generado.
- No edites `src/routeTree.gen.ts` manualmente ni anides rutas solo para ordenar
  archivos: la ubicacion y el nombre definen la URL y la jerarquia.
- Las convenciones adicionales estan en [src/routes/README.md](../src/routes/README.md).

### Cambiar navegacion

Revisa `src/config/navigation.ts` y la visibilidad/permisos relacionados. Una
opcion visible en el menu no reemplaza la proteccion de la ruta o de los datos.
Comprueba las reglas para cada rol afectado.

### Cambiar usuarios, roles o permisos

- `src/routes/usuarios.tsx`: pantalla administrativa y formularios.
- `src/lib/usuarios-admin.ts`: creacion, actualizacion y suscripcion a cuentas.
- `src/config/roles.ts`: catalogo de roles, niveles y matriz base.
- `src/lib/permisos.ts`: sincronizacion y guardado de permisos en Firestore.
- `src/lib/visibilidad.ts`: alcance de datos visibles segun rol/jerarquia.
- `src/types/entities.ts` y `src/types/organizacion.ts`: contratos relevantes.
- `firestore.rules`: autorizacion de acceso en el servidor de Firestore.

Cuando crees un usuario, revisa de forma conjunta la relacion Auth/Firestore,
el rol predeterminado y el empleado asociado. Probar solo que el formulario
guarda no verifica que la cuenta tenga el acceso correcto.

### Cambiar datos o persistencia

- `src/data/`: datos iniciales, catálogos compartidos y datos de demostracion.
- `src/lib/`: acceso a servicios y operaciones de negocio.
- `src/lib/datos-live.tsx`: suscripciones que hidratan datos maestros desde
  Firestore para uso de la aplicacion.
- `src/lib/firebase.ts`: inicializacion de Firebase.
- `firestore.rules` y `storage.rules`: autorizacion de Firestore y Storage.

Antes de cambiar un campo, busca sus usos y revisa si tambien se serializa,
exporta o valida en otro modulo. No supongas que un arreglo en `data/` es la
fuente persistente: comprueba si `datos-live.tsx` lo reemplaza con snapshots.

### Cambiar estilos

Para tokens y estilos globales revisa `src/styles.css`; para clases de una
pantalla, el componente correspondiente. Los componentes reutilizables de UI
estan en `src/components/ui/`. Prefiere modificar una primitiva compartida solo
cuando el cambio deba aplicarse en todo el producto.

## 3. Convenciones al editar

- Usa `@/` para importar desde `src/` (por ejemplo, `@/types/rrhh`).
- Sigue el dominio existente y evita crear variantes duplicadas de modelos o
  reglas.
- Deja los componentes enfocados en presentar y coordinar interacciones; coloca
  las reglas compartidas en `lib/`.
- Mantén tipos explicitos en limites entre UI, servicios y Firestore.
- Si cambias un modelo o permiso, busca sus referencias antes de cerrar el
  cambio y actualiza los consumidores afectados.
- Nunca edites `src/routeTree.gen.ts`, archivos de dependencias ni resultados
  generados para corregir codigo fuente.

## 4. Comprobaciones

Desde la carpeta del proyecto:

```powershell
bun run lint
bun run build
```

Tambien se pueden usar `npm run lint` y `npm run build` si las dependencias se
instalaron con npm. Ejecuta al menos el lint para cambios locales y el build
para cambios de rutas, tipos compartidos, configuracion o integracion. Corrige
los errores nuevos antes de dar el cambio por terminado.

## 5. Lista antes de cerrar un cambio

- ¿Modifique la capa responsable, en vez de duplicar logica en la pantalla?
- ¿Actualice tipos, reglas de acceso y consumidores relacionados?
- ¿La navegacion coincide con la proteccion de la funcionalidad?
- ¿Evite cambios manuales en archivos generados?
- ¿Pasan lint y build?