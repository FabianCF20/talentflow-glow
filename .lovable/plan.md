# Plan: Fortalecer Talento Humano y gestión de empleados

Cuatro frentes aprobados por la usuaria: alertas, flujos de contratación/retiro, expediente/hoja de vida e indicadores. Sin nómina, costos ni presupuestos (restricción vigente).

## 1. Seguimiento y alertas

Hoy `src/lib/alertas.ts` ya cubre contratos, documentos, exámenes, dotación, licencias y retención. Se amplía con:

- **Cumpleaños del mes** y **aniversarios de ingreso** (1, 5, 10 años) en el dashboard de gestión.
- **Vacaciones acumuladas**: alerta cuando un empleado lleva más de 11 meses sin vacaciones (art. 186 CST).
- **Periodo de prueba por vencer** para contratos nuevos (30/60 días según tipo de contrato).
- Panel "Alertas de hoy" en el dashboard con conteo por nivel (vencido / por vencer / informativo).

## 2. Flujos de contratación y retiro

- **Checklist de ingreso** por empleado nuevo: datos personales completos, documentos del expediente cargados, afiliaciones (EPS/AFP/ARL/caja), examen de ingreso, dotación entregada. Estado "En proceso de vinculación" hasta completar el checklist; al completarse pasa a Activo y se registra el evento en la hoja de vida.
- **Checklist de retiro** al cambiar a "retirado": paz y salvo de dotación, carta de terminación, paz y salvo de equipos, examen de retiro. El retiro queda "pendiente de cierre" hasta completar los ítems; la hoja de vida registra el cierre.
- Datos guardados en Firestore (`empleados_rrhh/{id}` campo `checklist`) para que varios usuarios de TH vean el mismo avance.

## 3. Expediente y hoja de vida

- Indicador de **completitud del expediente** (%) por empleado: evalúa datos personales, familiares, contactos de emergencia, estudios, experiencia, datos bancarios y seguridad social. Barra de progreso en la ficha y columna en el listado de empleados.
- Filtro en Empleados: "expediente incompleto".
- La hoja de vida gana filtros por tipo de evento y exportación a PDF del historial del empleado.

## 4. Reportes e indicadores

- Nueva pestaña **"Talento Humano"** en /reportes con: distribución por género, por tipo de contrato, por rango de edad, y rotación por área (gráficas nuevas sobre los datos ya existentes).
- Exportación a Excel incluye las hojas nuevas.
- Tarjetas del dashboard de gestión enlazan a la pantalla correspondiente (empleados, alertas, reportes).

## Notas técnicas

- Reglas nuevas en `src/lib/rrhh.ts` (completitud, checklist, antigüedad de vacaciones); utilidades de fecha solo en `src/lib/fechas.ts`; comentarios en español con encabezado `/** */` por archivo.
- Funciones tolerantes a campos faltantes (registros incompletos de Firestore).
- Se actualiza `docs/ARQUITECTURA.md` con los módulos nuevos.
- Verificación: typecheck, build y recorrido en pantalla con la cuenta de Talento Humano (qa-rol-talento_humano@demo.co).
- No se toca la matriz de permisos ni las reglas de Firebase; todo usa los módulos y colecciones existentes.
