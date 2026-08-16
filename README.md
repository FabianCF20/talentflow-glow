# TalentFlow Hub

Analiza completamente este requerimiento antes de generar código.



Vamos a construir una plataforma SaaS empresarial llamada SIGTH (Sistema Integral de Gestión de Talento Humano).



El software está orientado a empresas colombianas y será utilizado inicialmente por una empresa con más de 100 empleados.



OBJETIVO



Centralizar toda la gestión de recursos humanos, documentación, solicitudes, nómina, SST, evaluaciones, control operativo y gestión disciplinaria.



REGLAS GLOBALES



- Arquitectura modular.

- Escalable.

- Multiusuario.

- Responsive.

- Optimizada para escritorio.

- Menú lateral corporativo.

- Dashboard configurable.

- Buscador global.

- Sistema de notificaciones internas.

- Tema claro y oscuro.



SEGURIDAD



- Login.

- Recuperación de contraseña.

- Cambio de contraseña.

- Sesiones seguras.

- Bloqueo por intentos fallidos.

- Cierre automático por inactividad.



ELIMINACIÓN



No permitir eliminación física de registros.



Toda información deberá manejar:



- Activo.

- Inactivo.

- Archivado.



AUDITORÍA OBLIGATORIA



Registrar:



- Usuario.

- Fecha.

- Hora.

- Dirección IP.

- Navegador.

- Acción.

- Registro afectado.

- Valor anterior.

- Valor nuevo.



Todas las pantallas deberán considerar auditoría.



NOTIFICACIONES



Las notificaciones serán internas dentro de la plataforma.



ROLES INICIALES



Administrador

Gerente General

Director

Jefe

Supervisor

Talento Humano

Nómina

SST

Empleado



PERMISOS



Cada módulo debe permitir:



- Ver.

- Crear.

- Editar.

- Aprobar.

- Exportar.

- Inactivar.



No crear módulos todavía.



Primero crear la arquitectura base completa del sistema, navegación principal, layout, diseño corporativo, estructura de carpetas, entidades maestras y componentes reutilizables.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c18f71ce-5e17-4b85-9c59-0bf58db3277c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
