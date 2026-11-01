const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
initializeApp();
const db = getFirestore();
const rolesPermitidos = ["administrador", "talento_humano", "sst"];
async function perfil(uid) {
  const s = await db.doc("usuarios/" + uid).get();
  if (!s.exists || s.data().estado !== "activo" || s.data().estadoUsuario === "inactivo" || s.data().bloqueado === true) throw new HttpsError("permission-denied", "Cuenta no activa.");
  return s.data();
}
function comparar(a,b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    const x=(Array.isArray(a)?a:[String(a)]).map(String).sort();
    const y=(Array.isArray(b)?b:[String(b)]).map(String).sort();
    return x.length===y.length && x.every((v,i)=>v===y[i]);
  }
  return String(a)===String(b);
}
function fechaHora(now) {
  const p=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Bogota",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const o=Object.fromEntries(p.map(x=>[x.type,x.value]));
  return {fecha:o.year+"-"+o.month+"-"+o.day,hora:new Intl.DateTimeFormat("en-GB",{timeZone:"America/Bogota",hour:"2-digit",minute:"2-digit",second:"2-digit",hourCycle:"h23"}).format(now)};
}
async function asignado(tx, a, empleadoId) {
  if(a.tipo==="empresa") return true;
  if(a.tipo==="empleado") return a.valores.includes(empleadoId);
  const docs=await Promise.all(["empleados_rrhh","org_empleados"].map(c=>tx.get(db.doc(c+"/"+empleadoId))));
  const data=docs.filter(d=>d.exists).map(d=>d.data());
  const ids=a.tipo==="cargo"?data.flatMap(x=>[x.cargoId,x.laboral?.cargoId]):data.flatMap(x=>[x.areaId,x.laboral?.areaId]);
  return ids.some(id=>id && a.valores.includes(id));
}
exports.listarEmpleadosEvaluacion=onCall(async req=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Inicia sesión.");
  const p=await perfil(req.auth.uid);
  if(!Array.isArray(p.roles)||!p.roles.some(r=>rolesPermitidos.includes(r))) throw new HttpsError("permission-denied","Sin permiso para consultar destinatarios.");
  const snap=await db.collection("empleados_rrhh").get();
  return snap.docs.map(d=>{
    const e=d.data(), laboral=e.laboral||{};
    return {
      id:d.id,
      nombres:typeof e.nombres==="string"?e.nombres:"",
      apellidos:typeof e.apellidos==="string"?e.apellidos:"",
      estadoLaboral:e.estadoLaboral||"retirado",
      laboral:{cargoId:laboral.cargoId||"",areaId:laboral.areaId||""}
    };
  }).filter(e=>["activo","vacaciones","incapacidad","licencia","suspendido"].includes(e.estadoLaboral));
});
exports.listarEvaluaciones=onCall(async req=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Inicia sesión.");
  const p=await perfil(req.auth.uid);
  const esGestor=Array.isArray(p.roles)&&p.roles.some(r=>rolesPermitidos.includes(r));
  const empleadoId=p.empleadoId;
  if(!esGestor&&(typeof empleadoId!=="string"||!empleadoId)) return [];
  const snap=await db.collection("disc_evaluaciones").get();
  const resultado=[];
  for(const docSnap of snap.docs){
    const e=docSnap.data();
    if(!esGestor){
      if(e.estado!=="activo"||!(await db.runTransaction(tx=>asignado(tx,e.asignacion,empleadoId)))) continue;
    }
    const campos=Array.isArray(e.campos)?e.campos.map(({correcta,...campo})=>campo):[];
    resultado.push({...e,id:docSnap.id,campos});
  }
  return resultado;
});
exports.crearEvaluacion=onCall(async req=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Inicia sesión.");
  const p=await perfil(req.auth.uid), d=req.data||{};
  if(!Array.isArray(p.roles)||!p.roles.some(r=>rolesPermitidos.includes(r))) throw new HttpsError("permission-denied","Sin permiso para crear evaluaciones.");
  if(typeof d.titulo!=="string"||d.titulo.trim().length<5||!Array.isArray(d.campos)||d.campos.length<1||d.campos.length>100) throw new HttpsError("invalid-argument","Título o preguntas no válidas.");
  if(!d.asignacion||!["empleado","cargo","area","empresa"].includes(d.asignacion.tipo)) throw new HttpsError("invalid-argument","Asignación inválida.");
  const vals=Array.isArray(d.asignacion.valores)?[...new Set(d.asignacion.valores.filter(x=>typeof x==="string"))]:[];
  if(d.asignacion.tipo==="empresa"?vals.length!==0:vals.length===0) throw new HttpsError("invalid-argument","Faltan destinatarios.");
  const max=Number(d.maxIntentos||1);
  if(!Number.isInteger(max)||max<1||max>20) throw new HttpsError("invalid-argument","Intentos inválidos.");
  const open=d.abreEn?new Date(d.abreEn):null, close=d.cierraEn?new Date(d.cierraEn):null;
  if((open&&!Number.isFinite(open.getTime()))||(close&&!Number.isFinite(close.getTime()))||(open&&close&&close<=open)) throw new HttpsError("invalid-argument","Fechas inválidas.");
  const ids=new Set();
  for(const c of d.campos){
    if(!c||typeof c.id!=="string"||!c.id||ids.has(c.id)||typeof c.etiqueta!=="string"||!c.etiqueta.trim()||!["texto","seleccion_unica","seleccion_multiple","booleano","escala"].includes(c.tipo)) throw new HttpsError("invalid-argument","Pregunta inválida.");
    ids.add(c.id);
    if(["seleccion_unica","seleccion_multiple"].includes(c.tipo)&&(!Array.isArray(c.opciones)||c.opciones.length<2||c.opciones.length>50)) throw new HttpsError("invalid-argument","Opciones inválidas.");
  }
  const now=new Date(), id="ev-"+db.collection("disc_evaluaciones").doc().id, fh=fechaHora(now);
  const publicFields=d.campos.map(({correcta,...c})=>c);
  const keys=Object.fromEntries(d.campos.filter(c=>c.correcta!==undefined).map(c=>[c.id,{correcta:c.correcta,peso:Number.isFinite(c.peso)&&c.peso>0?c.peso:1}]));
  const pub={id,codigo:"EVA-"+now.getTime().toString(36).toUpperCase(),titulo:d.titulo.trim(),descripcion:String(d.descripcion||"").slice(0,2000),tipo:d.tipo,campos:publicFields,asignacion:{tipo:d.asignacion.tipo,valores:vals},puntajeAprobacion:Number.isFinite(d.puntajeAprobacion)?Math.max(0,Math.min(100,d.puntajeAprobacion)):70,estado:"activo",creadoPor:req.auth.uid,creadoEn:fh.fecha,abreEn:open?open.toISOString():null,cierraEn:close?close.toISOString():null,maxIntentos:max};
  const batch=db.batch();
  batch.create(db.doc("disc_evaluaciones/"+id),pub);
  batch.create(db.doc("disc_claves_evaluacion/"+id),{evaluacionId:id,claves:keys});
  await batch.commit();
  return {id,codigo:pub.codigo};
});
exports.archivarEvaluacion=onCall(async req=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Inicia sesión.");
  const p=await perfil(req.auth.uid);
  if(!Array.isArray(p.roles)||!p.roles.some(r=>rolesPermitidos.includes(r))) throw new HttpsError("permission-denied","Sin permiso para archivar evaluaciones.");
  const id=req.data?.evaluacionId;
  if(typeof id!=="string"||!/^ev-[A-Za-z0-9_-]+$/.test(id)) throw new HttpsError("invalid-argument","Evaluación inválida.");
  const ref=db.doc("disc_evaluaciones/"+id);
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists) throw new HttpsError("not-found","Evaluación no encontrada.");
    tx.update(ref,{estado:snap.data().estado==="activo"?"archivado":"activo",actualizadoEn:FieldValue.serverTimestamp()});
  });
  return {success:true};
});
exports.responderEvaluacion=onCall(async req=>{
  if(!req.auth) throw new HttpsError("unauthenticated","Inicia sesión.");
  const p=await perfil(req.auth.uid), empleadoId=p.empleadoId;
  if(typeof empleadoId!=="string"||!empleadoId) throw new HttpsError("failed-precondition","Usuario sin empleado vinculado.");
  const {evaluacionId,valores}=req.data||{};
  if(typeof evaluacionId!=="string"||!/^ev-[A-Za-z0-9_-]+$/.test(evaluacionId)) throw new HttpsError("invalid-argument","Evaluación inválida.");
  const er=db.doc("disc_evaluaciones/"+evaluacionId), kr=db.doc("disc_claves_evaluacion/"+evaluacionId);
  const cr=db.doc("disc_intentos_evaluacion/"+evaluacionId+"_"+empleadoId), rr=db.collection("disc_respuestas").doc();
  const now=new Date(), fh=fechaHora(now);
  await db.runTransaction(async tx=>{
    const [es,ks,cs]=await Promise.all([tx.get(er),tx.get(kr),tx.get(cr)]);
    if(!es.exists||!ks.exists) throw new HttpsError("not-found","Evaluación no encontrada.");
    const e=es.data();
    if(e.estado!=="activo"||(e.abreEn&&now<new Date(e.abreEn))||(e.cierraEn&&now>new Date(e.cierraEn))) throw new HttpsError("failed-precondition","Evaluación fuera de su periodo.");
    if(!(await asignado(tx,e.asignacion,empleadoId))) throw new HttpsError("permission-denied","No estás asignado.");
    if(!valores||typeof valores!=="object"||Array.isArray(valores)) throw new HttpsError("invalid-argument","Respuestas inválidas.");
    const fields=new Map(e.campos.map(c=>[c.id,c]));
    if(Object.keys(valores).some(k=>!fields.has(k))) throw new HttpsError("invalid-argument","Pregunta desconocida.");
    for(const c of e.campos){
      const v=valores[c.id], empty=v===undefined||v===""||(Array.isArray(v)&&!v.length);
      if(c.requerido&&empty) throw new HttpsError("invalid-argument","Completa preguntas obligatorias.");
      if(empty) continue;
      if(c.tipo==="texto"&&(typeof v!=="string"||v.length>10000)) throw new HttpsError("invalid-argument","Texto inválido.");
      if(c.tipo==="seleccion_unica"&&(typeof v!=="string"||!c.opciones.includes(v))) throw new HttpsError("invalid-argument","Opción inválida.");
      if(c.tipo==="seleccion_multiple"&&(!Array.isArray(v)||v.some(x=>!c.opciones.includes(x))||new Set(v).size!==v.length)) throw new HttpsError("invalid-argument","Selección inválida.");
      if(c.tipo==="booleano"&&typeof v!=="boolean") throw new HttpsError("invalid-argument","Valor booleano inválido.");
      if(c.tipo==="escala"&&(!Number.isInteger(v)||v<(c.escalaMin??1)||v>(c.escalaMax??5))) throw new HttpsError("invalid-argument","Escala inválida.");
    }
    const count=cs.exists?(cs.data().cantidad||0):0;
    if(count>=(e.maxIntentos||1)) throw new HttpsError("resource-exhausted","Máximo de intentos alcanzado.");
    const keys=ks.data().claves||{}, entries=Object.entries(keys);
    let score, passed;
    if(entries.length){
      const total=entries.reduce((s,[,k])=>s+k.peso,0);
      const got=entries.reduce((s,[id,k])=>s+(valores[id]!==undefined&&comparar(valores[id],k.correcta)?k.peso:0),0);
      score=Math.round(got/Math.max(total,1)*100); passed=score>=(e.puntajeAprobacion??70);
    }
    tx.create(rr,{id:rr.id,evaluacionId,empleadoId,fecha:fh.fecha,hora:fh.hora,valores,...(score===undefined?{}:{puntaje:score,aprobado:passed}),creadoEn:FieldValue.serverTimestamp(),creadoPorUid:req.auth.uid});
    tx.set(cr,{evaluacionId,empleadoId,cantidad:count+1,actualizadoEn:FieldValue.serverTimestamp()});
  });
  return {success:true};
});
