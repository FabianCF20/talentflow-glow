# Asistencia con GPS y validación

## Flujo

1. El empleado entra al Portal del Empleado y registra el ingreso.
2. El navegador solicita permiso de ubicación y captura latitud, longitud y precisión reportada por el dispositivo.
3. Firestore guarda la hora con `serverTimestamp()`; las reglas exigen que coincida con `request.time`.
4. Al terminar la jornada, el empleado registra la salida con una segunda captura GPS.
5. El superior consulta el día, revisa horas y ubicaciones, y valida u observa cada registro.
6. El superior también puede validar en lote los registros completos que seleccione.

## Documento diario

Colección: `op_asistencia`

ID determinista: `{empleadoId}_{YYYY-MM-DD}`

Campos nuevos:
- `id`, `empleadoId`, `fecha`
- `ingreso`: `latitud`, `longitud`, `precisionMetros`, `marcadoEn`
- `salida`: mismos campos que ingreso
- `validacion`: `estado` (pendiente/validada/observada), `usuarioUid`, `fecha`, `observacion`

## Permisos

- El empleado solo puede crear su ingreso y agregar una salida una sola vez.
- El empleado no puede cambiar la hora, coordenadas, precisión ni validación.
- El superior solo puede validar registros de personas que estén en `usuarios/{uid}.subordinadosIds`.
- Talento Humano y administración pueden consultar y validar globalmente.
- Nómina no tiene acceso global a asistencia.
- No se permiten borrados desde el cliente.
- Las validaciones masivas usan un lote de Firestore y conservan las marcaciones originales.

## Consultas e índices

La vista de supervisión consulta por fecha y por bloques de hasta 30 subordinados para respetar el límite de disyunciones de Firestore. Se incluye un índice compuesto para `fecha + empleadoId`.

## Registros históricos

Los documentos antiguos con `horaIngreso` y `horaSalida` se conservan. Se muestran como históricos sin GPS y no se pueden validar como si tuvieran evidencia de ubicación.

## Límites y verificación

- La geolocalización del navegador requiere HTTPS (localhost también está permitido en desarrollo).
- Si el empleado deniega el permiso o el dispositivo no obtiene ubicación, no se registra la marcación.
- Se guarda la precisión reportada por el GPS para que el superior pueda valorarla.
- La hora es emitida por Firestore y no por el reloj del dispositivo.
- Las coordenadas son evidencia capturada por el dispositivo, pero un navegador no puede demostrar por sí solo que el GPS no fue manipulado. Esta primera fase no aplica geocerca ni detección antifraude.
- El campo `fecha` se usa para agrupar la jornada y se genera con la zona horaria `America/Bogota` en la interfaz. La hora `marcadoEn` es la evidencia temporal autoritativa; una fase posterior puede mover también la generación/validación del día laboral a un servicio backend confiable.

## Publicación

Antes de habilitar marcaciones reales, desplegar y probar las reglas y el índice de Firestore del branch. La interfaz no sustituye las pruebas con cuentas reales de empleado, supervisor y Talento Humano.