# Asistencia con marcación del empleado y validación del superior

## Flujo
- El empleado registra únicamente ingreso y salida final desde Portal del Empleado.
- Cada marcación solicita geolocalización del navegador y conserva latitud, longitud y precisión reportada.
- Las horas se escriben con `serverTimestamp()`; no se usa el reloj local para determinar la hora registrada.
- El documento diario usa el identificador `as-{empleadoId}-{fecha}` para impedir más de un ingreso por empleado y fecha.
- El superior consulta sus subordinados y puede validar u observar un registro individual o un lote de hasta 450.
- Una observación requiere motivo. La validación conserva UID y hora del responsable.

## Seguridad Firestore
- El empleado solo puede crear su propio ingreso y añadir una sola salida a su documento.
- El superior solo puede cambiar estado/metadata de validación; no puede cambiar hora, GPS ni titular.
- Las reglas verifican la hora transformada del servidor (`request.time`), rango de coordenadas y precisión.
- No se permiten borrados desde cliente.
- Nómina no tiene lectura global de esta colección; el acceso se limita a RR. HH. y al alcance jerárquico.

## Históricos y reportes
- Los documentos anteriores con `horaIngreso`/`horaSalida` se conservan para consulta.
- Los históricos no se presentan como registros GPS ni se habilitan para nueva validación.
- Las horas nuevas se muestran en zona horaria `America/Bogota`; los reportes incluyen coordenadas y precisión.

## Límites
- GPS del navegador es evidencia orientativa: puede ser imprecisa o suplantada. No implementa geocerca ni detección antifraude.
- `fecha` identifica el día de jornada y se calcula en el cliente con zona horaria de Colombia; la hora absoluta es del servidor. Para impedir manipulación deliberada de la fecha se requerirá un endpoint/backend confiable.
- La consulta de mandos usa el alcance de subordinados mantenido por RR. HH.; la consulta masiva debe probarse con jerarquías mayores a 30 subordinados por los límites de disyunciones de Firestore.
- El empleado debe conceder permiso de ubicación y usar HTTPS (o localhost en desarrollo).

## Publicación
1. Ejecutar build, lint y pruebas de reglas.
2. Publicar `firestore.rules` antes de habilitar el flujo.
3. Probar en Firebase con cuentas reales de empleado y superior.
4. Probar ingreso, salida, GPS denegado, doble marcación, validación individual, lote, observación y exportación.
5. No activar en producción hasta verificar navegador y móvil.
