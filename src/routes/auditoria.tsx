import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { AuditTrailTable } from "@/components/common/AuditTrailTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUDIT_LOGS } from "@/data/mock";

export const Route = createFileRoute("/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoría | SIGTH" },
      {
        name: "description",
        content: "Trazabilidad completa: usuario, fecha, hora, IP, navegador, acción y valores modificados.",
      },
      { property: "og:title", content: "Auditoría | SIGTH" },
      {
        property: "og:description",
        content: "Registro inalterable de todas las acciones realizadas en la plataforma.",
      },
    ],
  }),
  component: Auditoria,
});

function Auditoria() {
  return (
    <AppShell>
      <PageHeader
        breadcrumb={["Administración", "Auditoría"]}
        title="Auditoría del sistema"
        description="Toda acción queda registrada con usuario, fecha, hora, IP, navegador, registro afectado y valores anterior/nuevo."
        actions={
          <Button variant="outline" size="sm">
            <Download className="size-4" /> Exportar
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Buscar por usuario o registro…" className="max-w-xs" />
        <Input type="date" className="max-w-40" />
        <Input type="date" className="max-w-40" />
      </div>
      <AuditTrailTable logs={AUDIT_LOGS} />
    </AppShell>
  );
}
