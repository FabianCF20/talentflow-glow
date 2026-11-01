# Validación manual de gestión documental

Esta lista complementa las pruebas automáticas de Firestore y Storage Emulator. Debe ejecutarse en un proyecto Firebase de pruebas, nunca con documentos reales.

## Preparación

1. Seleccionar explícitamente el proyecto Firebase de pruebas.
2. Aplicar allí las reglas de `firestore.rules` y `storage.rules` de esta rama.
3. Crear cuentas separadas para Administración, Talento Humano, SST, empleado A y empleado B.
4. Vincular empleado A y B a sus respectivos perfiles. Verificar que todos los perfiles estén activos.
5. Usar PDF de prueba sin datos personales, de máximo 5 MB.
6. Si la descarga con `getBlob()` falla por CORS, configurar el bucket para permitir únicamente los orígenes reales de desarrollo y producción. No usar `*` como origen. La configuración CORS del bucket debe permitir las operaciones y encabezados requeridos por Firebase Storage SDK; no se debe publicar una configuración amplia sin verificar los dominios.

## Casos de aceptación

| Caso | Acción | Resultado esperado |
|---|---|---|
| D1 | Talento Humano carga PDF en expediente de empleado A | Se crea objeto privado en Storage y metadato en Firestore |
| D2 | Empleado A consulta y descarga su documento | Puede descargar el binario original |
| D3 | Empleado B intenta consultar o descargar el documento de A | Acceso denegado |
| D4 | Empleado A intenta cargar un contrato | Acceso denegado |
| D5 | Talento Humano carga contrato de A | Permitido; A puede leerlo, B no |
| D6 | Administración carga contrato | Permitido |
| D7 | SST carga documento de categoría SST o incapacidades | Permitido |
| D8 | SST intenta cargar o leer documento personal o contractual | Acceso denegado |
| D9 | Usuario intenta cargar archivo que no sea PDF o supere 5 MB | Rechazado |
| D10 | Usuario intenta sobrescribir o borrar un objeto existente | Rechazado |
| D11 | Talento Humano carga una nueva versión | Se conserva la versión anterior y aparece una nueva ruta de Storage |
| D12 | Se descarga una versión anterior | Se obtiene el archivo binario de esa versión, no el archivo más reciente |
| D13 | Empleado intenta editar metadatos de documento existente | Acceso denegado |
| D14 | Se prueba un documento heredado sin `storagePath` | La interfaz informa que no existe binario; no presenta una carátula como si fuera el original |

## Verificaciones técnicas

- En Firebase Storage, comprobar que cada archivo esté bajo `documentos/{empleadoId}/{categoria}/{documentoId}/{archivo}`.
- En Firestore, comprobar que cada versión guarde su propio `storagePath`, nombre, tamaño, fecha y usuario que la cargó.
- Confirmar que las rutas de descarga no sean URLs públicas persistentes.
- Revisar la consola del navegador y la pestaña Network para identificar errores de permisos, CORS o metadatos.
- Probar la descarga en el mismo navegador y en una segunda sesión autenticada con otro empleado.
- Confirmar que los archivos de prueba no incluyan información real de trabajadores.

## Riesgos que requieren backend antes de producción

1. **Objetos huérfanos:** si Storage acepta el archivo y Firestore rechaza los metadatos, queda un objeto sin expediente. No habilitar borrado general desde el cliente. Resolver con una tarea backend/Cloud Function de conciliación y limpieza con permisos mínimos.
2. **Inspección de contenido:** MIME y cabecera PDF comprobados en navegador no son un antivirus. Analizar el archivo en backend antes de marcarlo como disponible para uso oficial.
3. **Concurrencia de versiones:** dos cargas simultáneas pueden intentar crear el mismo número de versión. Antes de producción, serializar la asignación de versión en una transacción/backend y evitar sobrescribir metadatos.
4. **CORS:** validar el bucket real y los dominios exactos. No se considera probada una descarga solo porque la carga haya funcionado.

## Criterio para cerrar la fase

La fase documental solo se considera validada cuando D1–D14 pasan en el proyecto de pruebas, se conserva el archivo original en todas las versiones, no hay acceso cruzado entre empleados y los tres riesgos de backend tienen una solución planificada antes de producción.

No desplegar estas reglas ni cargar documentos reales como parte de esta prueba.
