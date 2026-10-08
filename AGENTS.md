<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Reglas de arquitectura

- Capas por dominio: pantallas en `src/routes`, reglas en `src/lib/<dominio>.ts`, estado en `src/store`, modelos en `src/types`. Por qué: localizar cada responsabilidad sin leer pantallas enteras.
- Utilidades de fecha y formato viven solo en `src/lib/fechas.ts` y `src/lib/formato.ts`; los demás módulos las re-exportan, nunca las duplican. Por qué: una sola fuente de verdad.
- Cada archivo inicia con un comentario `/** */` de propósito y los comentarios se escriben en español. Por qué: facilitar correcciones manuales del equipo.
- Las funciones de formato deben tolerar campos faltantes. Por qué: los registros de Firestore pueden llegar incompletos y romper pantallas.
- La arquitectura se documenta en `docs/ARQUITECTURA.md`; actualícelo al crear un módulo. Por qué: mantener la guía vigente.
- El menú lateral y el acceso a cada pantalla se derivan de la matriz de permisos (`can(roles, modulo, "ver")`). Por qué: una sola fuente de verdad para lo que ve cada rol; la seguridad real la imponen las reglas de Firestore.
