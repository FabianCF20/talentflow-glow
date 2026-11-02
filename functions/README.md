# Migración segura de claves de evaluaciones antiguas

Este procedimiento mueve el campo `correcta` de `disc_evaluaciones/{id}.campos` a `disc_claves_evaluacion/{id}.claves`, y conserva un respaldo completo del documento original en `disc_evaluaciones_migration_backup/{id}`.

## Seguridad

- El script apunta exclusivamente al proyecto Firebase `indunilo`.
- La ejecución sin `--apply` es una simulación: no escribe en Firestore.
- Cada evaluación se migra en una transacción: respaldo, claves privadas y limpieza del documento público se confirman juntos.
- Si ya existe un respaldo para una evaluación que todavía contiene claves públicas, el script se detiene para ese documento y no lo sobrescribe.
- Las reglas cliente deniegan el acceso a las claves privadas y a los respaldos.
- Nunca guardes el JSON de la cuenta de servicio en el repositorio ni lo compartas.

## Preparación en Windows PowerShell

Desde la carpeta del repositorio:

```powershell
cd functions
npm install
npm test
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta-segura\cuenta-servicio.json"
```

La cuenta de servicio debe pertenecer al proyecto `indunilo` y tener permisos administrativos suficientes sobre Firestore. También puedes usar Application Default Credentials configuradas de forma segura.

## 1. Simular (no modifica datos)

```powershell
npm run migrate:evaluations -- --project=indunilo --limit=100 --batch-size=25
```

El script informa cuántos documentos revisó y cuáles requieren migración. No imprime respuestas correctas.

Para revisar toda la colección en modo simulación:

```powershell
npm run migrate:evaluations -- --project=indunilo --all --batch-size=25
```

## 2. Aplicar después de revisar la simulación

Primero realiza además una copia de seguridad de Firestore desde el mecanismo de respaldo aprobado por la empresa. Después:

```powershell
npm run migrate:evaluations -- --project=indunilo --apply --all --batch-size=25
```

No ejecutes este comando hasta confirmar que `indunilo` es el proyecto correcto, que la copia de seguridad externa terminó y que el reporte de simulación es coherente.

## 3. Verificar

Vuelve a ejecutar la simulación con `--all`. El resultado esperado es `candidates: 0` y `errors: 0`. Revisa también que las evaluaciones antiguas sigan apareciendo y que las respuestas se califiquen correctamente.

El respaldo contiene las claves originales; mantenlo restringido y conserva su retención según la política de la empresa. No lo descargues ni lo expongas en la interfaz.
