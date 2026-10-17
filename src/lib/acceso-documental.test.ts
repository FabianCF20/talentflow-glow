/** Pruebas de permisos documentales por función, categoría y titular. */
import { describe, expect, it } from "vitest";
import { alcanceConsultaDocumental, categoriasGestionables, puedeLeerDocumento } from "./acceso-documental";
import { can, PERMISSION_MATRIX } from "../config/roles";

describe("Acceso documental", () => {
  it("SST no consulta contratos ajenos", () => {
    expect(puedeLeerDocumento(["sst"], "sst-propio", { empleadoId: "otro", categoria: "contractuales" })).toBe(false);
  });
  it("SST no consulta información personal ajena", () => {
    expect(puedeLeerDocumento(["sst"], "sst-propio", { empleadoId: "otro", categoria: "personales" })).toBe(false);
  });
  it("SST consulta soportes de su función", () => {
    expect(puedeLeerDocumento(["sst"], "", { empleadoId: "otro", categoria: "sst" })).toBe(true);
    expect(categoriasGestionables(["sst"])).toEqual(["sst", "incapacidades"]);
  });
  it("El empleado solo consulta sus documentos", () => {
    expect(puedeLeerDocumento(["empleado"], "yo", { empleadoId: "yo", categoria: "contractuales" })).toBe(true);
    expect(puedeLeerDocumento(["empleado"], "yo", { empleadoId: "otro", categoria: "contractuales" })).toBe(false);
  });
  it("Una cuenta sin vínculo no recibe la colección completa", () => {
    expect(alcanceConsultaDocumental(["empleado"], "")).toEqual({ enabled: false, filtros: [] });
  });
  it("Administración y TH gestionan el expediente completo", () => {
    for (const roles of [["administrador"], ["talento_humano"]] as const) {
      expect(puedeLeerDocumento([...roles], "", { empleadoId: "otro", categoria: "disciplinarios" })).toBe(true);
    }
  });
  it("Un mando no obtiene acceso general aunque la matriz lo conceda", () => {
    const previo = PERMISSION_MATRIX.documentacion.jefe;
    PERMISSION_MATRIX.documentacion.jefe = ["ver", "exportar"];
    try { expect(can(["jefe"], "documentacion", "ver")).toBe(false); }
    finally { PERMISSION_MATRIX.documentacion.jefe = previo; }
  });
  it("La consulta SST filtra desde el origen", () => {
    expect(alcanceConsultaDocumental(["sst"], "yo", true)).toEqual({ enabled: true, filtros: [
      { campo: "empleadoId", valor: "yo" }, { campo: "categoria", valor: ["sst", "incapacidades"] },
    ] });
  });
});