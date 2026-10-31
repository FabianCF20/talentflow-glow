# Endurecimiento de seguridad de Firebase

Este documento describe el cambio de seguridad de la rama `security/hardening-firestore-storage-auth`.
No publicar estas reglas en producción sin completar la lista de verificación.

## Cambios aplicados

- Los roles se consideran efectivos únicamente cuando el perfil está activo y no está bloqueado.
- Un usuario autenticado solo puede crear su propio perfil con el rol exacto `empleado`, sin `empleadoId` ni permisos administrativos.
- Ya no existe asignación automática del primer usuario como administrador desde el navegador.
- Solo un administrador existente puede conceder, retirar o cambiar roles.
- Talento Humano puede administrar datos básicos de cuentas, pero no elevar roles.
- Los documentos de usuarios se leen por el titular o por Talento Humano/administración.
- Los datos de `empleados_rrhh`, `org_empleados`, `org_cargos`, centros de costo y nómina se restringen a los roles autorizados o al titular cuando corresponda.
- Los mandos solo acceden a registros de subordinados cuyos IDs estén en `usuarios/{UID}.subordinadosIds`. Esta lista es una proyección de autorización mantenida por Talento Humano; el usuario no puede editarla desde su propia cuenta.
- Gerencia y Dirección pueden consultar nómina, pero solo Administración y Nómina pueden crear o modificar liquidaciones y parámetros de nómina.
- Expedientes personales, familiares, bancarios y de seguridad social quedan limitados a Talento Humano y al empleado titular.
- Las liquidaciones de nómina quedan limitadas a Nómina/Contabilidad/Administración y al empleado titular.
- Las colecciones de auditoría y acceso son de solo anexado desde el cliente; no se permiten modificaciones ni borrados.
- Los registros de auditoría y acceso deben incluir el UID autenticado del actor.
- Storage solo permite leer/cargar archivos ligados a un documento autorizado. Se aceptan PDF/JPG/PNG de hasta 10 MB. No se permite sobrescribir ni borrar desde el cliente.
- Los datos sensibles dejan de descargarse indiscriminadamente en el proveedor global del frontend. El empleado consulta su documento de empleado y su expediente propio.

## Provisionar el primer administrador

El primer administrador debe crearse fuera del flujo público de registro, desde un entorno de confianza:

1. Crear el usuario en Firebase Authentication (correo verificado y contraseña robusta).
2. Copiar su UID.
3. En Firestore, crear manualmente `usuarios/{UID}` con estos campos:

```json
{
  "id": "UID_REAL_DE_FIREBASE",
  "email": "correo-administrador@empresa.com",
  "nombres": "Nombre",
  "apellidos": "Apellido",
  "roles": ["administrador", "talento_humano"],
  "estado": "activo",
  "estadoUsuario": "activo",
  "creadoEn": "2026-10-31T12:00:00.000Z"
}
```

4. Verificar que el UID del documento sea exactamente el UID de Authentication.
5. Iniciar sesión y comprobar que el perfil y los permisos se carguen.
6. Crear las demás cuentas desde la administración de usuarios. El rol de administrador solo debe asignarse a personas autorizadas.

No crear un documento de administrador con un UID inventado ni reutilizar un correo compartido.

## Matriz mínima de pruebas

Ejecutar en un proyecto Firebase de pruebas o con Emulator Suite, usando cuentas separadas:

| Prueba | Resultado esperado |
|---|---|
| Usuario A lee su propio perfil | Permitido |
| Usuario A lee el perfil de Usuario B | Denegado |
| Empleado crea su perfil con rol `empleado` | Permitido |
| Empleado intenta registrarse con rol `administrador` | Denegado |
| Empleado cambia su propio campo `roles` | Denegado |
| Talento Humano cambia el rol de una cuenta | Denegado |
| Administrador concede un rol autorizado | Permitido |
| Usuario inactivo consulta una colección protegida | Denegado |
| Empleado lee el expediente de otro empleado | Denegado |
| Empleado lee su propio expediente | Permitido |
| Empleado consulta liquidaciones de otro empleado | Denegado |
| Supervisor consulta un registro de un subordinado asignado | Permitido |
| Supervisor consulta un registro de un empleado no asignado | Denegado |
| Supervisor intenta modificar su lista de subordinados | Denegado |
| Jefe intenta cerrar una solicitud directamente como aprobada por RRHH | Denegado |
| Jefe intenta liquidar horas extra sin Nómina | Denegado |
| Empleado intenta alterar metadatos de un documento existente | Denegado |
| Empleado consulta su propia liquidación | Permitido |
| Usuario no autorizado lee archivos de otro empleado | Denegado |
| Usuario autorizado carga PDF/JPG/PNG de hasta 10 MB | Permitido |
| Usuario carga archivo de más de 10 MB o tipo no permitido | Denegado |
| Cliente intenta modificar o borrar auditoría | Denegado |
| Usuario intenta crear auditoría atribuyéndola a otro UID | Denegado |

## Publicación controlada

Antes de publicar:
- Exportar/respaldar las reglas actuales y verificar el proyecto Firebase seleccionado.
- Probar las reglas en Emulator Suite con cuentas de cada rol.
- Revisar los errores de permisos en las pantallas de empleado, Talento Humano, Nómina y SST.
- Confirmar que los perfiles existentes tengan `estado` y `estadoUsuario` correctos, y que el UID del documento coincida con Authentication.
- Confirmar que cada documento de empleado use como ID el `empleadoId` vinculado al perfil.
- Revisar y mantener `subordinadosIds` en los perfiles de mandos cuando cambie el organigrama. La lista debe ser actualizada por Talento Humano o por un backend confiable; si está vacía, el acceso jerárquico queda denegado.
- Revisar que las consultas de listas estén filtradas de forma compatible con las reglas.

Publicación desde la raíz del proyecto, después de superar las pruebas:

```bash
firebase use indunilo
firebase deploy --only firestore:rules,storage
```

La publicación de reglas no migra documentos ni cambia permisos IAM de Firebase Console. Los administradores del proyecto deben usar MFA y limitarse a las personas estrictamente necesarias.

## Limitaciones pendientes después de la segunda fase

- El organigrama completo no se entrega a empleados ni mandos que no tengan acceso a los datos salariales, porque `org_empleados` contiene el campo salario. Para recuperar el organigrama sin exponer salarios se debe crear una proyección pública sin datos sensibles, generada por un backend confiable (Cloud Functions/Admin SDK), y adaptar la pantalla a esa colección.
- El alcance jerárquico usa `subordinadosIds` como proyección confiable en el perfil. Si se modifica el organigrama, esa lista debe sincronizarse desde Talento Humano o un backend confiable; no se concede acceso por inferencia ni por campos enviados por el cliente.
- La auditoría del cliente queda autoatribuida por UID y es inmutable para el cliente, pero no es una bitácora forense infalsificable. Para garantizar eventos de cambios críticos, la escritura debe migrarse a Cloud Functions o backend con Admin SDK y controles de integridad.
- Las reglas deben probarse en Emulator Suite antes de producción. Este cambio no se considera certificado hasta que pasen las pruebas de autorización y se valide la aplicación desplegada.


## Compatibilidad de la aplicación con las reglas estrictas

En la segunda fase de hardening:
- Las suscripciones de operaciones, SST y disciplinario se filtran por el empleado titular o por los subordinados directos declarados en usuarios/{UID}.subordinadosIds.
- Los hooks de centros de costo, cargos y empleados del organigrama no consultan colecciones sensibles si el rol no tiene permiso.
- Los supervisores pueden actualizar únicamente campos de marcación de asistencia de sus subordinados directos.
- La aplicación no envía puntaje ni aprobado al guardar respuestas disciplinarias. Esos valores no deben considerarse oficiales hasta que los calcule un backend confiable.
- El sincronizador de colecciones no ejecuta borrados desde el cliente. Los registros deben archivarse mediante un cambio de estado; las reglas siguen denegando delete.

**Límites y pendientes antes de producción:**
- Las consultas por lista de subordinados generan filtros OR. Firestore limita la cantidad de disyunciones de una consulta; si un mando supera ese límite, se debe implementar consulta por lotes o una proyección específica.
- La carga documental actual de la interfaz registra metadatos, pero no utiliza uploadBytes ni guarda el archivo binario en Firebase Storage. Por tanto, no debe anunciarse como carga real ni considerarse validada la integración de Storage.
- La actualización de versiones de documentos existentes está reservada a Talento Humano y SST según categoría. El titular no puede editar los metadatos de un documento existente.
- La emisión de certificados persistidos está restringida a Talento Humano/Nómina; la generación desde el portal del empleado requiere un flujo de solicitud o un backend confiable antes de habilitarla como certificado oficial.
- El build de producción y las pruebas de Firestore Emulator sí se ejecutaron sobre la segunda fase: build correcto y 14 pruebas aprobadas, 0 fallidas. Las pruebas de Storage Emulator siguen pendientes.

## Registro de integración en `main` — 31 de octubre de 2026

Se integraron los dos pull requests de hardening:

| PR | Alcance | Resultado |
|---|---|---|
| [#2 — Security hardening](https://github.com/FabianCF20/talentflow-glow/pull/2) | Reglas iniciales de Firestore/Storage, controles de roles, aislamiento de datos y documentación de bootstrap | Integrado |
| [#3 — Security compatibility](https://github.com/FabianCF20/talentflow-glow/pull/3) | Consultas filtradas, compatibilidad de escrituras del cliente y pruebas ampliadas | Integrado |

Commit de integración final en `main`: `65eacb333f452511b733a9c5495113e3bd8c8502`.

### Resultados de validación registrados

- Build de producción: aprobado en GitHub Actions.
- Firestore Emulator: 14 pruebas aprobadas y 0 fallidas en el último commit de la segunda fase.
- Lint: no aprobado. La ejecución registró 1.078 errores y 54 advertencias de formato. No se aplicó formateo masivo porque habría introducido cambios ajenos al hardening.
- Storage Emulator: no ejecutado; las reglas de Storage todavía requieren pruebas de integración específicas.
- Prueba de flujos completos con cuentas de cada rol: pendiente.

### Cambios de aplicación relacionados

- El sincronizador cliente no elimina documentos de Firestore; los registros omitidos se conservan y el borrado desde cliente permanece denegado.
- Los stores de operaciones, SST y disciplinario aplican alcances por empleado y subordinados.
- Las consultas de colecciones sensibles del organigrama se deshabilitan para roles sin autorización.
- Las respuestas disciplinarias ya no envían puntuación ni aprobación desde el navegador.
- El empleado puede aceptar una sola vez su entrega de dotación, sin editar otros campos.
- Se restringe la edición de versiones de metadatos documentales desde el portal del empleado.
- Las reglas de Storage exigen un perfil activo y mantienen las restricciones de tipo, tamaño, titularidad y escritura.

### Condiciones que impiden considerar el sistema listo para producción

1. Implementar y probar la carga/descarga real de archivos binarios en Firebase Storage; la interfaz actual registra metadatos y no demuestra una carga real.
2. Ejecutar Storage Emulator con pruebas positivas y negativas de titularidad, roles, MIME, tamaño, actualización y borrado.
3. Completar el flujo confiable de emisión/solicitud de certificados.
4. Verificar y mantener `subordinadosIds` al cambiar el organigrama; las consultas con listas extensas pueden superar los límites de disyunciones de Firestore.
5. Probar las pantallas completas con usuarios de cada rol y datos sintéticos, verificando que todas las consultas cumplan las reglas.
6. Resolver la deuda de lint y volver a ejecutar el pipeline completo.
7. Provisionar y verificar el primer administrador mediante un procedimiento controlado, nunca desde el registro público.

**Estado de publicación:** los cambios están integrados en GitHub `main`, pero no se han publicado reglas en Firebase ni desplegado la aplicación. No cargar datos personales, laborales o salariales reales hasta cerrar los pendientes y validar el entorno de producción.


## Fase de integración de Firebase Storage — rama `security/real-document-storage`

Esta fase implementa el flujo de binarios del portal documental, sin publicar reglas en el proyecto Firebase:

- Los PDF se cargan con Firebase Storage SDK, con límite de 5 MB, MIME PDF y comprobación de cabecera `%PDF-` en cliente.
- La ruta privada vincula empleado, categoría y documento: `documentos/{empleadoId}/{categoria}/{documentoId}/{archivo}`.
- Storage permite cargar al titular, Talento Humano/Administración y SST únicamente para categorías ocupacionales.
- La lectura requiere perfil activo y autorización por titular/rol sobre la ruta privada (empleado y categoría). La ruta no depende de metadatos Firestore para evitar una ventana de bloqueo entre carga y registro; el identificador aleatorio reduce la exposición, y el acceso sigue cerrado a otros empleados.
- No se permiten sobrescrituras ni borrados desde cliente.
- Las descargas usan Firebase Storage SDK autenticado (`getBlob`); no se generan URLs de descarga persistentes.
- El versionamiento de documentos existentes carga un nuevo binario y actualiza metadatos solo para Talento Humano o SST según categoría.
- Las versiones antiguas sin `storagePath` quedan marcadas como archivo no disponible; no se genera un PDF ficticio como si fuera el original.
- Se añadieron pruebas de Storage Emulator y se incluyeron junto con Firestore en CI. Las reglas usan `resource == null` para permitir solo creación y bloquear sobrescritura/borrado.

### Validaciones aún necesarias

- GitHub Actions de la rama: build y ESLint aprobados; 14 pruebas Firestore y 7 pruebas Storage aprobadas (21 en total, 0 fallidas).
- Confirmar comportamiento real en navegador contra un proyecto Firebase de pruebas y validar CORS/descarga.
- Verificar CORS y descarga real en el bucket de pruebas.
- Añadir limpieza confiable de objetos huérfanos si se carga el binario pero falla la escritura de metadatos.
- Implementar inspección de contenido del archivo en backend; MIME y cabecera PDF comprobados en cliente no sustituyen análisis antivirus/validación del lado servidor.
- Completar backend confiable de certificados, sincronización de subordinados y auditoría server-side.

**Estado:** cambios propuestos en rama independiente. No se han integrado a `main`, no se han desplegado reglas ni se han subido archivos al bucket productivo.


### Separación de lint y formato

La ejecución CI de esta fase confirmó que los errores de lint existentes eran reportes de `prettier/prettier` (deuda de formato extendida), no errores funcionales de ESLint. Para no mezclar formato masivo con el hardening:

- ESLint se conserva para reglas de código y React/TypeScript.
- Se añadió `npm run format:check` como verificación explícita de Prettier.
- No se ejecutó `prettier --write .` ni se reformateó masivamente el repositorio.
- La deuda de formato queda pendiente y debe resolverse en un cambio separado, revisando el diff completo antes de integrarlo.


Validación CI de la fase documental: build y ESLint aprobados; 21 pruebas combinadas Firestore/Storage aprobadas (14 + 7).