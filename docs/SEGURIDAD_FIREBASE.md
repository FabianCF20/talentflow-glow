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

## Limitaciones que requieren una segunda fase

- El organigrama completo no se entrega a empleados ni mandos que no tengan acceso a los datos salariales, porque `org_empleados` contiene el campo salario. Para recuperar el organigrama sin exponer salarios se debe crear una proyección pública sin datos sensibles, generada por un backend confiable (Cloud Functions/Admin SDK), y adaptar la pantalla a esa colección.
- El alcance jerárquico usa `subordinadosIds` como proyección confiable en el perfil. Si se modifica el organigrama, esa lista debe sincronizarse desde Talento Humano o un backend confiable; no se concede acceso por inferencia ni por campos enviados por el cliente.
- La auditoría del cliente queda autoatribuida por UID y es inmutable para el cliente, pero no es una bitácora forense infalsificable. Para garantizar eventos de cambios críticos, la escritura debe migrarse a Cloud Functions o backend con Admin SDK y controles de integridad.
- Las reglas deben probarse en Emulator Suite antes de producción. Este cambio no se considera certificado hasta que pasen las pruebas de autorización y se valide la aplicación desplegada.
