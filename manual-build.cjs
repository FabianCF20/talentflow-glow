const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, TableOfContents,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, Footer, PageNumber, PageBreak } = require("docx");

const C = [];
const H1 = (t) => C.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: true, children: [new TextRun(t)] }));
const H2 = (t) => C.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] }));
const P = (t) => C.push(new Paragraph({ spacing: { after: 120 }, children: rich(t) }));
const B = (...items) => items.forEach((t) => C.push(new Paragraph({ numbering: { reference: "b", level: 0 }, children: rich(t) })));
let nref = 0;
const N = (...items) => { const r = "n" + (nref++); items.forEach((t) => C.push(new Paragraph({ numbering: { reference: r, level: 0 }, children: rich(t) }))); };
const NOTE = (t) => C.push(new Paragraph({ spacing: { before: 80, after: 160 }, shading: { fill: "EAF2F8", type: ShadingType.CLEAR },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: "1F5F8B", space: 8 } }, children: [new TextRun({ text: "Importante: ", bold: true }), ...rich(t)] }));
function rich(t) { return t.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((s) => s.startsWith("**") ? new TextRun({ text: s.slice(2, -2), bold: true }) : new TextRun(s)); }
const border = { style: BorderStyle.SINGLE, size: 1, color: "BBBBBB" };
const borders = { top: border, bottom: border, left: border, right: border };
function TABLE(head, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cell = (t, i, h) => new TableCell({ borders, width: { size: widths[i], type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: h ? { fill: "1F5F8B", type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: t, bold: h, color: h ? "FFFFFF" : undefined, size: 20 })] })] });
  C.push(new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: head.map((t, i) => cell(t, i, true)) }), ...rows.map((r) => new TableRow({ children: r.map((t, i) => cell(t, i, false)) }))] }));
  C.push(new Paragraph(""));
}

C.push(new Paragraph({ spacing: { before: 3000 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "SIGTH", bold: true, size: 72, color: "1F5F8B" })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Sistema de Gestión de Talento Humano", size: 36 })] }));
C.push(new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Manual de usuario", bold: true, size: 44 })] }));
C.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Guía completa para usuarios finales", size: 26 })] }));
C.push(new Paragraph({ spacing: { before: 1800 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Versión 1.0  ·  Octubre de 2026", size: 22, color: "555555" })] }));
C.push(new Paragraph({ children: [new PageBreak()] }));
C.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Contenido")] }));
C.push(new TableOfContents("Contenido", { hyperlink: true, headingStyleRange: "1-2" }));
C.push(new Paragraph({ children: [new TextRun({ text: "Si el índice aparece vacío, haga clic derecho sobre él y elija «Actualizar campos».", italics: true, size: 18, color: "777777" })] }));

H1("1. Introducción");
P("SIGTH es la herramienta con la que la empresa administra todo el ciclo de vida de sus trabajadores: desde la estructura de la organización y la creación del empleado, hasta la nómina, la seguridad y salud en el trabajo, las solicitudes, la dotación, las evaluaciones, los procesos disciplinarios y el cumplimiento de la ley colombiana.");
P("Este manual explica, pantalla por pantalla, cómo usar cada función. Está escrito para personas sin conocimientos técnicos.");
H2("1.1 A quién va dirigido");
B("**Empleados**, que consultan su información, piden vacaciones o certificados y actualizan sus datos.",
  "**Supervisores, jefes, directores y gerencia**, que aprueban solicitudes y siguen a su equipo.",
  "**Talento Humano, Nómina, Contabilidad y SST**, que operan los procesos de la empresa.",
  "**Administradores**, que configuran el sistema, los usuarios y los permisos.");
H2("1.2 Principios que aplican en todo el sistema");
B("**Nada se borra.** Los registros se inactivan o archivan; siempre queda el historial.",
  "**Todo queda registrado.** Cada acción guarda quién la hizo, cuándo y qué cambió (ver Auditoría).",
  "**Cada persona ve solo lo que su rol le permite.** Si una opción no aparece o sale «Contenido restringido», su rol no tiene acceso.",
  "**Los cambios se ven al instante.** Lo que otro usuario guarda aparece en su pantalla sin recargar.",
  "**Flujos de aprobación.** Muchas solicitudes pasan por pasos: Empleado → Jefe → Talento Humano (o Nómina).");
H2("1.3 Requisitos");
B("Un computador, tableta o celular con conexión a internet.", "Un navegador actualizado (Chrome, Edge, Safari o Firefox).", "Una cuenta entregada por Talento Humano o el administrador.");

H1("2. Acceso al sistema");
H2("2.1 Iniciar sesión");
N("Abra la dirección del sistema que le entregó la empresa.", "Escriba su **Correo corporativo** y su **Contraseña**.", "Haga clic en **Ingresar**. Verá el Dashboard.");
NOTE("Tras varios intentos fallidos su cuenta se bloquea por seguridad. Pida a Talento Humano o al administrador que la desbloquee.");
H2("2.2 Olvidé mi contraseña");
N("En la pantalla de ingreso haga clic en **¿Olvidó su contraseña?**.", "Escriba su correo y confirme.", "Revise su correo (también la carpeta de spam) y siga el enlace para crear una contraseña nueva.");
H2("2.3 Crear una cuenta");
P("La opción **Crear una cuenta** pide Nombres, Apellidos, Correo y Contraseña. Toda cuenta creada así entra con el rol **Empleado**; para tener más permisos, el administrador debe asignarlos. Lo habitual es que Talento Humano cree su cuenta y le entregue una contraseña temporal.");
H2("2.4 Cerrar sesión, tema y contraseña");
B("Haga clic en su nombre o iniciales (arriba a la derecha) para ver su correo y las opciones **Mi perfil**, **Cambiar contraseña** y **Cerrar sesión**.",
  "El botón de luna/sol cambia entre tema claro y oscuro.",
  "Por seguridad, la sesión se cierra sola tras un tiempo sin uso (lo define el administrador en Configuración).");

H1("3. Conociendo la pantalla");
H2("3.1 Partes de la pantalla");
B("**Menú lateral:** agrupa los módulos en General, Organización, Talento Humano, Operación y Administración. En celulares se abre con el botón de tres rayas (☰). En computador puede reducirlo con **Contraer menú**.",
  "**Buscador superior:** escriba el nombre o documento de un empleado para ir directo a él.",
  "**Campana de notificaciones:** avisos de solicitudes, aprobaciones y vencimientos. Un número indica los no leídos.",
  "**Ruta de ubicación:** encima del título de cada página (por ejemplo «Talento Humano / Empleados»).",
  "**Pestañas:** muchas páginas se dividen en pestañas; en celular deslícelas hacia los lados.");
H2("3.2 Elementos comunes");
B("**Tablas:** muestran listas. Use el cuadro de búsqueda y los filtros sobre ellas para encontrar registros.",
  "**Botones Exportar:** descargan la información en Excel/CSV o PDF.",
  "**Etiquetas de estado:** colores que indican Activo, Pendiente, Aprobada, Rechazada, Vencido, etc.",
  "**Ventanas de formulario:** al crear o editar se abre una ventana; los campos con asterisco son obligatorios. Pulse **Guardar** para confirmar o **Cancelar** para salir sin cambios.",
  "Opciones con candado en el menú están **en preparación** (por ejemplo «Proyectos y áreas»).");
H2("3.3 Uso en celular y tableta");
P("El sistema se adapta a pantallas pequeñas: el menú se oculta tras el botón ☰, las tablas se pueden deslizar horizontalmente y los formularios se desplazan hacia abajo.");

H1("4. Roles y qué puede hacer cada uno");
P("Cada usuario tiene uno o varios roles. El rol decide qué módulos ve y qué acciones puede hacer (ver, crear, editar, aprobar, exportar, inactivar).");
TABLE(["Rol", "Para qué sirve", "Alcance de lo que ve"], [
  ["Administrador", "Control total y configuración del sistema", "Toda la empresa"],
  ["Gerente General", "Visión global y aprobaciones estratégicas", "Toda la empresa"],
  ["Director", "Gestión de su dirección y aprobaciones de segundo nivel", "Las áreas de su dirección"],
  ["Jefe", "Gestión de área y aprobación de solicitudes", "Su equipo a cargo"],
  ["Supervisor", "Control operativo del equipo", "Su equipo asignado"],
  ["Talento Humano", "Administración de personal, estructura y documentos", "Toda la empresa"],
  ["Nómina", "Liquidación, novedades y reportes de nómina", "Toda la empresa (información de pago)"],
  ["Contabilidad", "Costos, causación y control presupuestal", "Información de costos"],
  ["SST", "Seguridad y salud en el trabajo", "Información de SST"],
  ["Empleado", "Autogestión de su información y solicitudes", "Solo su propia información"],
], [2000, 4200, 3160]);
NOTE("Los salarios solo los ven los roles autorizados en «Visibilidad y salarios». Si usted no tiene ese permiso, verá el valor oculto.");

H1("5. Dashboard (inicio)");
P("Es la primera pantalla tras ingresar. Muestra un resumen de la operación de talento humano según su rol: personal activo, solicitudes pendientes, ausencias, alertas y gráficos de tendencia.");
B("Haga clic en una tarjeta o indicador para ir al módulo correspondiente.", "El contenido cambia según su rol: un empleado ve sus datos; un jefe, su equipo; la gerencia, toda la empresa.");

H1("6. Bandeja de solicitudes");
P("Aquí Talento Humano revisa las actualizaciones de datos que los empleados piden desde el Portal. Ningún cambio se aplica al expediente hasta que se aprueba.");
N("Abra **General → Bandeja de solicitudes**.", "Revise cada solicitud: empleado, dato a cambiar, valor anterior y valor nuevo, y la observación del empleado.",
  "Pulse **Aprobar** para aplicar el cambio o **Rechazar** (escriba el motivo en el comentario).", "El empleado recibe una notificación con el resultado. Si no hay pendientes verá «Bandeja al día».");

H1("7. Estructura organizacional");
P("Define cómo está organizada la empresa. Es lo primero que se debe configurar, porque los empleados se asignan a estos elementos. Disponible para Administrador y Talento Humano; los demás solo consultan.");
H2("7.1 Orden recomendado de creación");
N("**Niveles jerárquicos** (provienen de los roles: Gerencia, Dirección, Jefatura, Supervisión, Operativo…).", "**Áreas** (por ejemplo Producción, Administración).", "**Dependencias** dentro de cada área.",
  "**Centros de trabajo** (sedes o plantas, con ciudad, dirección y clase de riesgo ARL I a V).", "**Centros de costo** (código, nombre, área y presupuesto anual).", "**Cargos** (código, nombre, área, nivel jerárquico y salario base).");
H2("7.2 Crear, editar e inactivar");
N("Abra **Organización → Estructura organizacional** y elija la pestaña (Áreas, Dependencias, Centros de trabajo, Centros de costo o Cargos).", "Pulse **Nuevo** y complete el formulario. Pulse **Guardar**.",
  "Para modificar, use el botón de editar en la fila del registro.", "Para dejar de usar un registro, cámbielo a **Inactivo** o **Archivado**. No se elimina, para conservar el historial.");
NOTE("Si su rol solo permite consultar, verá el mensaje «Su rol actual solo permite consultar» y los botones de crear no aparecerán.");

H1("8. Organigrama");
P("Se dibuja solo, en tiempo real, a partir del cargo, el área y el jefe inmediato de cada empleado. Cualquier cambio en la estructura o en un empleado actualiza el árbol al instante.");
B("Cada tarjeta muestra el nombre, el cargo y el área de la persona; debajo cuelgan las personas a su cargo.", "Arriba se indica cuántas personas puede ver usted según su rol («Visibles: X de Y»).", "Si el organigrama aparece vacío, primero cree niveles, áreas, cargos y empleados.");
NOTE("Para que una persona aparezca bajo su jefe, al crear o editar el empleado se debe indicar el **Jefe inmediato**.");

H1("9. Empleados");
P("Módulo de Talento Humano donde se crea y mantiene el expediente único de cada trabajador.");
H2("9.1 Pantalla principal");
B("Tarjetas con el **Personal vinculado**, los usuarios **Con acceso al sistema** y los **Retirados**.", "Pestaña **Personal vinculado:** lista de empleados activos con búsqueda.",
  "Pestaña **Retirados:** histórico de quienes salieron de la empresa (se conservan).", "Pestaña **Reportes:** resúmenes por área, cargo, tipo de contrato, etc.", "Botones **Exportar todo**, **Exportar activos** y **Exportar retirados**.");
H2("9.2 Crear un empleado (Nuevo empleado)");
P("Pulse **Nuevo empleado**. Se abre un formulario por secciones; complete todas las que apliquen y pulse **Guardar** al final.");
TABLE(["Sección", "Qué se registra"], [
  ["Datos personales", "Tipo y número de documento, nombres, apellidos, fecha y lugar de nacimiento, sexo, estado civil (soltero/a, casado/a, unión libre, separado/a, viudo/a), dirección, teléfonos y correo personal"],
  ["Información laboral", "Fecha de ingreso, cargo, área, dependencia, centro de trabajo, centro de costo, jefe inmediato, tipo de contrato y salario"],
  ["Familia", "Familiares (cónyuge, hijo/a, padre, madre, hermano/a, otro) con nombre, documento, fecha de nacimiento y teléfono"],
  ["Contactos de emergencia", "Nombre, parentesco y teléfono de quién llamar en caso de emergencia"],
  ["Formación", "Nivel (bachiller, técnico, tecnólogo, profesional, especialización, maestría, doctorado), título, institución y año"],
  ["Experiencia", "Empresas anteriores, cargo, fechas y funciones"],
  ["Bancarios", "Banco, tipo de cuenta (ahorros o corriente), número y si se adjuntó la certificación bancaria"],
  ["Seguridad social", "EPS, fondo de pensiones, cesantías, ARL y caja de compensación"],
  ["Acceso", "Casilla «Habilitar acceso al portal» para que el empleado pueda ingresar"],
], [2300, 7060]);
H2("9.3 Ficha del empleado");
P("Haga clic sobre un empleado para abrir su ficha. Tiene pestañas: **Datos personales**, **Información laboral**, **Familia y emergencia**, **Formación y experiencia**, **Bancarios y seguridad social** y **Hoja de vida digital**.");
B("Use **Editar** para actualizar datos. Cada cambio queda registrado en la hoja de vida.", "La **Hoja de vida digital** muestra la línea de tiempo: ingreso, cambios de cargo o salario, ausencias, sanciones, capacitaciones y retiro.",
  "Cada vez que alguien consulta un expediente queda registrado (protección de datos, ver Cumplimiento).");
H2("9.4 Retiro de un empleado");
P("El empleado no se borra: se cambia su estado laboral a retirado y pasa a la pestaña Retirados con todo su historial. La liquidación definitiva se hace en Nómina.");

H1("10. Portal del Empleado");
P("Es el espacio personal de cada trabajador. Todos los empleados con acceso pueden usarlo.");
TABLE(["Pestaña", "Qué puede hacer"], [
  ["Perfil", "Ver sus datos personales y de contacto"], ["Contrato e info. laboral", "Consultar cargo, área, jefe, tipo de contrato, fecha de ingreso y salario"],
  ["Actualizar datos", "Pedir el cambio de dirección, teléfono, celular, correo o información familiar"], ["Mis documentos", "Ver y descargar sus documentos del expediente"],
  ["Certificados", "Generar certificados laborales, de antigüedad o de cargo, con o sin salario"], ["Nómina", "Ver y descargar sus desprendibles de pago"],
  ["Vacaciones e incapacidades", "Consultar días causados, tomados y pendientes, e historial de incapacidades"], ["Dotación", "Ver las entregas de dotación recibidas y la próxima entrega"],
  ["Historial", "Consultar su hoja de vida y las solicitudes realizadas"],
], [2600, 6760]);
H2("10.1 Actualizar mis datos");
N("Abra **Portal del Empleado → Actualizar datos**.", "Elija el dato a cambiar, escriba el valor nuevo y, si quiere, una observación.", "Pulse **Enviar solicitud**. Quedará «Pendiente de aprobación» hasta que Talento Humano la revise.");
H2("10.2 Descargar un certificado");
N("Abra la pestaña **Certificados**.", "Elija el tipo de certificado e indique si debe incluir el salario.", "Pulse **Generar**. Se descarga un PDF firmado electrónicamente con un **código de verificación**.");
NOTE("Cualquier entidad (banco, arrendador) puede comprobar que el certificado es auténtico con su código en Administración → Cumplimiento → Documentos firmados.");

H1("11. Gestión documental");
P("Expediente digital por categorías: Personales, Académicos, Contractuales, SST, Disciplinarios e Incapacidades.");
N("Abra **Talento Humano → Gestión documental** y filtre por empleado, categoría o vigencia.", "Para cargar, pulse **Subir documento**, elija el empleado, la categoría, el nombre, la fecha de vencimiento (si tiene) y el archivo.",
  "Para reemplazar un documento, súbalo de nuevo sobre el mismo registro: se crea una **nueva versión** y se conservan las anteriores.", "Use **Descargar** para obtener el archivo y **Historial** para ver todas las versiones, quién las subió y cuándo.");
P("Cada documento muestra su vigencia: **Vigente**, **Por vencer**, **Vencido** o **Sin vencimiento**. Ningún archivo se elimina.");

H1("12. Dotación y elementos de protección");
H2("12.1 Ficha de tallas");
P("Registre para cada empleado las tallas de camisa, pantalón, calzado y demás elementos. El empleado también puede actualizar sus propias tallas.");
H2("12.2 Entregas y reposiciones");
N("Abra la pestaña **Entregas y reposiciones** y pulse **Nueva entrega**.", "Elija el empleado, la fecha, el tipo (entrega o reposición) y los elementos con talla y cantidad.",
  "En reposiciones el **Motivo** es obligatorio (daño, pérdida, desgaste).", "El empleado debe **aceptar digitalmente** la entrega; hasta entonces aparece como pendiente de firma.");

H1("13. Evaluaciones y pruebas");
P("Permite crear encuestas, evaluaciones de desempeño, cuestionarios y pruebas de SST.");
TABLE(["Pestaña", "Uso"], [["Instrumentos", "Lista de evaluaciones creadas con su estado y a quién se asignaron"], ["Nuevo instrumento", "Crear una evaluación: nombre, tipo, preguntas y a quién se asigna"],
  ["Diligenciar", "Responder las evaluaciones que le fueron asignadas"], ["Resultados", "Ver resultados individuales, consolidados e indicadores"]], [2600, 6760]);

H1("14. Gestión disciplinaria");
P("Flujo Supervisor → Jefe → Talento Humano. El historial de cada caso es permanente y no puede eliminarse.");
H2("14.1 Registrar una incidencia");
N("Abra **Gestión disciplinaria → Incidencias** y pulse **Nueva incidencia**.", "Complete Empleado, Fecha y Hora del hecho, Categoría, Tipo de falta, Gravedad presunta, Descripción de los hechos y, si existe, la Evidencia.", "Guarde. El caso avanza al jefe y luego a Talento Humano.");
H2("14.2 Actuaciones del caso");
B("Agregue actuaciones (citación, descargos, decisión) indicando el **Tipo de actuación** y el **Detalle**.", "Registre la **Versión del empleado** (sus descargos).", "Al cerrar, indique la **Sanción** y, si aplica, los **Días de suspensión**.");
H2("14.3 Observaciones internas");
P("Notas reservadas sobre el desempeño o la conducta. Solo las ven Talento Humano y los mandos autorizados; los demás ven «Contenido restringido».");

H1("15. Solicitudes e incapacidades");
P("Vacaciones, permisos, licencias y actualización de datos siguen el flujo Empleado → Jefe → Talento Humano. Las incapacidades van del empleado a Talento Humano.");
TABLE(["Pestaña", "Quién la usa", "Para qué"], [
  ["Radicar solicitud", "Todos", "Pedir vacaciones, permisos o licencias indicando fechas y motivo"], ["Bandeja de aprobación", "Jefes y Talento Humano", "Aprobar o rechazar las solicitudes pendientes de su paso"],
  ["Incapacidades", "Empleado, Talento Humano, SST", "Radicar y hacer seguimiento a incapacidades (radicada, en trámite, pagada)"], ["Histórico", "Todos según rol", "Consultar solicitudes ya resueltas"],
], [2400, 2400, 4560]);
H2("15.1 Pedir vacaciones o un permiso");
N("Abra **Operación → Solicitudes e incapacidades → Radicar solicitud**.", "Elija el tipo, las fechas desde/hasta y escriba el motivo.", "Pulse **Enviar**. Su jefe la ve en su bandeja; después pasa a Talento Humano.");
H2("15.2 Aprobar como jefe o Talento Humano");
N("Abra la pestaña **Bandeja de aprobación**.", "Revise la solicitud y pulse **Aprobar** o **Rechazar** con un comentario.", "El empleado recibe la notificación. Si no hay pendientes verá «Bandeja al día».");

H1("16. Control de asistencia");
P("Supervisores y jefes registran la asistencia diaria de su equipo: presente, ausente, retardo o novedad, con hora de entrada y salida.");
N("Abra **Operación → Control de asistencia** y elija la fecha.", "Marque el estado de cada persona y registre observaciones si las hay.", "Guarde. Las ausencias y retardos quedan disponibles para Nómina y los reportes.");

H1("17. Horas extras");
P("El supervisor registra las horas, el jefe inmediato las autoriza y Nómina las liquida. Cada paso queda en el historial de novedades.");
N("Pulse **Registrar horas**: elija empleado, fecha, cantidad de horas y tipo (diurna, nocturna, dominical o festiva).", "El jefe inmediato la ve como pendiente y pulsa **Autorizar** o **Rechazar**.", "Nómina toma las horas autorizadas y las incluye en la liquidación del periodo.");

H1("18. Historial de novedades");
P("Registro único e inalterable de todas las acciones de los procesos operativos (solicitudes, incapacidades, horas extras, asistencia). Muestra la etapa del flujo, el responsable, la fecha y el documento de referencia. Use los filtros por empleado, tipo y fecha, y exporte si lo necesita.");

H1("19. Seguridad y Salud en el Trabajo (SST)");
H2("19.1 Exámenes médicos");
P("Registre exámenes de ingreso, periódicos, de retiro o post-incapacidad: Empleado, Tipo, Fecha, Entidad / IPS, Concepto (apto, apto con restricciones, no apto) y Recomendaciones médicas. El sistema avisa cuando un examen está por vencer.");
H2("19.2 Accidentes laborales");
P("Registre accidentes e incidentes: Tipo de evento, Fecha, Hora, Empleado, Centro de trabajo, Descripción del evento, Parte del cuerpo afectada, Gravedad, Días de incapacidad, si fue Reportado a la ARL y la Causa raíz. Agregue cada **Nueva acción correctiva** con responsable y fecha.");
H2("19.3 Capacitaciones");
P("Programe capacitaciones con Tema, Fecha programada, Duración (horas), Instructor, Modalidad, si es Obligatoria y los empleados Convocados. Luego registre la asistencia.");
H2("19.4 Indicadores");
P("Frecuencia y severidad de accidentes, ausentismo, cumplimiento de exámenes y de capacitaciones, con gráficos.");

H1("20. Nómina Colombia");
TABLE(["Pestaña", "Qué hace"], [
  ["Liquidación", "Calcula el periodo: salario, auxilio de transporte, horas extras y recargos, bonificaciones, deducciones de salud y pensión y neto a pagar"],
  ["Conceptos fijos", "Registra pagos o descuentos recurrentes por empleado (tipo, descripción y valor mensual)"], ["Prestaciones", "Muestra la provisión de cesantías, intereses, prima y vacaciones"],
  ["Liquidaciones definitivas", "Liquida el contrato de un empleado que se retira"], ["Desprendibles", "Genera y descarga el desprendible de pago firmado electrónicamente"],
], [2600, 6760]);
H2("20.1 Liquidar un periodo");
N("Abra **Nómina → Liquidación** y elija el periodo.", "Revise los valores de cada empleado; las horas extras autorizadas y los conceptos fijos se incluyen solos.", "Confirme la liquidación. Los desprendibles quedan disponibles para cada empleado en su Portal.");
H2("20.2 Liquidación definitiva");
N("Abra **Liquidaciones definitivas** y pulse **Nueva liquidación**.", "Elija el Empleado, la Fecha de retiro, el Motivo y los Días de vacaciones pendientes.", "Revise el cálculo y genere el documento firmado.");

H1("21. Reportes y dashboards");
P("Indicadores consolidados con filtros (fechas, área, centro de trabajo, cargo) y exportación a Excel o PDF. Pestañas: **RRHH** (planta, rotación, ausentismo), **Nómina** (costos y devengados), **SST** (accidentalidad, exámenes) y **Gerencia** (visión ejecutiva).");

H1("22. Datos maestros");
P("Son las mismas entidades base de la Estructura organizacional (Áreas, Dependencias, Centros de trabajo, Centros de costo y Cargos), organizadas para su administración. Solo Administrador y Talento Humano pueden crear o editar. Ningún registro se elimina: se inactiva o archiva. Los niveles jerárquicos provienen de los roles del sistema.");

H1("23. Constructor de formularios");
TABLE(["Pestaña", "Uso"], [["Formularios", "Lista de formularios creados"],
  ["Constructor", "Diseñar un formulario con preguntas de texto, selección única, selección múltiple, verdadero/falso y escalas; asignarlo por empleado, cargo, área o a toda la empresa"],
  ["Diligenciar", "Responder los formularios asignados a usted"], ["Resultados", "Analizar las respuestas con gráficos y exportarlas"]], [2400, 6960]);

H1("24. Usuarios, roles y permisos");
H2("24.1 Crear un usuario");
N("Abra **Administración → Usuarios y roles → Usuarios** y pulse **Nuevo usuario**.", "Complete Nombres, Apellidos, Correo, Empleado vinculado y una Contraseña temporal.",
  "Elija los **Roles** (puede tener varios) y el **Estado de la cuenta**.", "Guarde y entregue al usuario su correo y contraseña temporal.");
H2("24.2 Administrar usuarios");
B("**Editar** nombres, roles y empleado vinculado.", "**Activar, inactivar o desbloquear** la cuenta. Estados: Activo, Inactivo, Bloqueado, Pendiente activación.",
  "**Restablecer contraseña:** envía al usuario un correo para crear una nueva.", "Se muestra el último acceso y los intentos fallidos de cada cuenta.");
H2("24.3 Roles, matriz de permisos y visibilidad");
B("**Roles:** descripción de cada rol y cuántos usuarios lo tienen.", "**Matriz de permisos:** marque para cada rol y módulo las acciones permitidas (Ver, Crear, Editar, Aprobar, Exportar, Inactivar). Guarde para aplicar.",
  "**Visibilidad y salarios:** defina el alcance de cada rol (toda la empresa, su dirección, su equipo, solo sí mismo) y quién puede ver salarios.");
NOTE("Un usuario no puede cambiarse sus propios roles. Asigne el rol Administrador solo a personas de confianza.");

H1("25. Auditoría");
P("Toda acción queda registrada con usuario, fecha, hora, IP, navegador, acción (crear, editar, inactivar, archivar, aprobar, exportar, consultar, ingreso, salida), módulo, registro afectado y valores anterior y nuevo. Filtre por usuario, módulo, acción o fechas y exporte el resultado. Los registros no se pueden modificar ni borrar.");

H1("26. Cumplimiento normativo");
P("Apoya el cumplimiento de la Ley 1581 de 2012 (protección de datos personales) y la Ley 527 de 1999 (firma electrónica).");
TABLE(["Pestaña", "Qué muestra"], [["Alertas de vencimiento", "Contratos, exámenes médicos, documentos, dotación y licencias vencidos o por vencer, con el empleado y los días restantes"],
  ["Documentos firmados", "Registro de certificados, desprendibles y liquidaciones firmados; permite verificar un documento con su código"],
  ["Acceso a datos personales", "Bitácora de quién consultó el expediente de quién, cuándo y con qué finalidad"]], [2800, 6560]);
H2("26.1 Verificar un documento");
N("Abra **Documentos firmados**.", "Escriba el código impreso en el documento y pulse **Verificar**.", "El sistema indica si es auténtico, a quién pertenece, quién lo firmó y la fecha.");

H1("27. Configuración del sistema");
P("Solo el administrador. Parámetros que aplican a todos los módulos:");
B("**Seguridad:** Longitud mínima de contraseña, Expiración de contraseña (días), Intentos fallidos antes del bloqueo y Cierre por inactividad (minutos).",
  "**Plantillas de documentos y firma:** Razón social, NIT, Dirección, Teléfono, Ciudad de expedición, Persona que firma, Cargo de quien firma, Texto de cierre de los certificados y Nota legal al pie.",
  "**Cumplimiento:** Aviso de vencimientos (días antes) y Retención documental (años).");
P("Pulse **Guardar** para aplicar. Los cambios se reflejan de inmediato en los documentos nuevos.");

H1("28. Flujos de trabajo de principio a fin");
H2("28.1 Poner en marcha la empresa (Administrador / Talento Humano)");
N("Complete la **Configuración** con los datos reales de la empresa.", "Cree la **Estructura organizacional** en el orden del capítulo 7.", "Cree a los **Empleados** con datos completos e indique su jefe inmediato.",
  "Cree los **Usuarios** y vincúlelos a cada empleado con su rol.", "Revise el **Organigrama** para confirmar la estructura.");
H2("28.2 Ingreso de un nuevo trabajador");
N("Talento Humano crea el empleado y sube sus documentos.", "SST registra el examen de ingreso.", "Se entrega la dotación y el empleado la acepta.", "Se crea su usuario para el Portal.", "Nómina lo incluye en el siguiente periodo.");
H2("28.3 Vacaciones");
N("El empleado radica la solicitud.", "El jefe aprueba.", "Talento Humano aprueba.", "Queda en el historial y Nómina la tiene en cuenta.");
H2("28.4 Retiro");
N("Talento Humano cambia el estado laboral a retirado.", "SST registra el examen de retiro.", "Nómina realiza la liquidación definitiva.", "El empleado puede pedir su certificado laboral.");

H1("29. Preguntas frecuentes y solución de problemas");
TABLE(["Situación", "Qué hacer"], [
  ["No veo un módulo en el menú", "Su rol no tiene acceso. Pida al administrador que revise sus permisos."], ["Aparece «Contenido restringido»", "La información es reservada para otros roles."],
  ["Mi cuenta está bloqueada", "Superó los intentos fallidos. Pida a Talento Humano que la desbloquee."], ["No puedo crear áreas o cargos", "Solo Administrador y Talento Humano pueden. Su rol solo permite consultar."],
  ["El organigrama está vacío", "Faltan niveles, cargos o empleados, o no tienen jefe inmediato asignado."], ["Mi solicitud sigue pendiente", "Está esperando al jefe o a Talento Humano. Revise el estado en el Histórico."],
  ["Un dato mío está mal", "Pida el cambio en Portal → Actualizar datos."], ["Mensaje de permisos insuficientes al guardar", "Su rol no puede hacer esa acción o su cuenta está inactiva. Contacte al administrador."],
  ["La página no carga", "Revise su conexión, recargue la página o pulse «Try again». Si sigue, avise al administrador."],
], [3400, 5960]);

H1("30. Glosario");
TABLE(["Término", "Significado"], [["ARL", "Administradora de Riesgos Laborales"], ["EPS", "Entidad Promotora de Salud"], ["AFP", "Fondo de pensiones"],
  ["SST / SG-SST", "Seguridad y Salud en el Trabajo / su sistema de gestión"], ["Centro de costo", "Unidad a la que se cargan los gastos de personal"], ["Desprendible", "Comprobante de pago de nómina"],
  ["Expediente", "Conjunto de datos y documentos de un empleado"], ["Habeas data", "Derecho a conocer, actualizar y rectificar los datos personales (Ley 1581)"],
  ["Inactivar", "Dejar de usar un registro sin borrarlo"], ["Rol", "Perfil que define qué puede ver y hacer un usuario"]], [2600, 6760]);

const numbering = { config: [{ reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ...Array.from({ length: nref }, (_, i) => ({ reference: "n" + i, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }))] };
const doc = new Document({
  creator: "SIGTH", title: "Manual de usuario SIGTH",
  styles: { default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 34, bold: true, font: "Arial", color: "1F5F8B" }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 27, bold: true, font: "Arial" }, paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 } },
    ] },
  numbering,
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Manual de usuario SIGTH  ·  Página ", size: 18, color: "777777" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "777777" })] })] }) },
    children: C }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync("/mnt/documents/Manual_de_usuario_SIGTH.docx", b); console.log("ok", b.length); });
