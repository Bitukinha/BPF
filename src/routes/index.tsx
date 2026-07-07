import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2, Printer, Wheat } from "lucide-react";
import {
  type Evidencia,
  createEvidencia,
  deleteEvidencia,
  listEvidencias,
} from "@/lib/evidencias";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nutrimilho — Registro de Auditoria BPF" },
      {
        name: "description",
        content:
          "Registro de evidências de auditoria de Boas Práticas de Fabricação (BPF) — Nutrimilho.",
      },
    ],
  }),
  component: Index,
});

const SETORES = [
  "Moagem",
  "Extrusão",
  "Expedição",
  "Manutenção Industrial",
  "Envase",
  "Recebimento",
  "Almoxarifado",
];
const TURNOS = ["Turno A", "Turno B", "Turno C", "Turno D"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function fmt(dateISO: string) {
  const [y, m, d] = dateISO.split("-");
  return `${d}/${m}/${y}`;
}

function Index() {
  const queryClient = useQueryClient();
  const [filterSetor, setFilterSetor] = useState<string>("todos");
  const [open, setOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["evidencias"],
    queryFn: () => listEvidencias(),
  });

  const createMutation = useMutation({
    mutationFn: (evidencia: Evidencia) => createEvidencia({ data: evidencia }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["evidencias"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvidencia({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["evidencias"] }),
  });

  const grouped = useMemo(() => {
    const filtered =
      filterSetor === "todos"
        ? items
        : items.filter((i) => i.setor === filterSetor);
    const map = new Map<string, Evidencia[]>();
    for (const it of filtered) {
      const key = `${it.data}__${it.turno}__${it.auditor}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, list]) => {
        const [data, turno, auditor] = key.split("__");
        const bySetor = new Map<string, Evidencia[]>();
        for (const it of list) {
          if (!bySetor.has(it.setor)) bySetor.set(it.setor, []);
          bySetor.get(it.setor)!.push(it);
        }
        return { data, turno, auditor, bySetor };
      });
  }, [items, filterSetor]);

  function addItem(e: Evidencia) {
    createMutation.mutate(e);
  }
  function removeItem(id: string) {
    deleteMutation.mutate(id);
  }

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <TopBar onNew={() => setOpen(true)} />

      <main className="mx-auto max-w-6xl px-4 py-6 print:max-w-none print:px-0 print:py-0">
        <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Filtrar setor</Label>
            <Select value={filterSetor} onValueChange={setFilterSetor}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os setores</SelectItem>
                {SETORES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90">
                  <Plus className="h-4 w-4" /> Nova evidência
                </Button>
              </DialogTrigger>
              <NewEvidenceDialog onAdd={(e) => { addItem(e); setOpen(false); }} />
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-lg border-2 border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
            Carregando evidências...
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState onNew={() => setOpen(true)} />
        ) : (
          <div className="space-y-8">
            {grouped.map((g, gi) => {
              const totalPages = g.bySetor.size;
              let pageIdx = 0;
              return (
                <div key={gi} className="space-y-4">
                  {Array.from(g.bySetor.entries()).map(([setor, list], si) => {
                    pageIdx += 1;
                    return (
                      <ReportSheet
                        key={si}
                        setor={setor}
                        data={fmt(g.data)}
                        turno={g.turno}
                        auditor={g.auditor}
                        pageIdx={pageIdx}
                        totalPages={totalPages}
                        items={list}
                        onRemove={removeItem}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}

function NutrimilhoLogo({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-md bg-brand text-brand-foreground ${className ?? ""}`}
      aria-label="Nutrimilho"
      role="img"
    >
      <Wheat className="h-1/2 w-1/2" />
    </div>
  );
}

function TopBar({ onNew }: { onNew: () => void }) {
  return (
    <header className="border-b bg-white shadow-sm print:hidden">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <NutrimilhoLogo className="h-9 w-9 shrink-0" />
        <div className="ml-2 hidden min-w-0 border-l pl-3 sm:block">
          <p className="text-sm font-semibold text-foreground">
            Evidências de Auditoria de BPF
          </p>
          <p className="text-xs text-muted-foreground">
            Registro de qualidade — Boas Práticas de Fabricação
          </p>
        </div>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="gap-1"
          >
            <Printer className="h-4 w-4" /> PDF
          </Button>
          <Button
            size="sm"
            onClick={onNew}
            className="bg-[color:var(--accent-yellow)] text-foreground hover:brightness-95"
          >
            <Plus className="mr-1 h-4 w-4" /> Nova evidência
          </Button>
        </div>
      </div>
    </header>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-lg border-2 border-dashed bg-card p-10 text-center">
      <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
      <h2 className="mt-3 text-lg font-semibold">Nenhuma evidência registrada</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Adicione a primeira não conformidade encontrada em auditoria.
      </p>
      <Button
        onClick={onNew}
        className="mt-4 gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
      >
        <Plus className="h-4 w-4" /> Nova evidência
      </Button>
    </div>
  );
}

function ReportSheet({
  setor,
  data,
  turno,
  auditor,
  pageIdx,
  totalPages,
  items,
  onRemove,
}: {
  setor: string;
  data: string;
  turno: string;
  auditor: string;
  pageIdx: number;
  totalPages: number;
  items: Evidencia[];
  onRemove: (id: string) => void;
}) {
  return (
    <article className="overflow-hidden rounded-lg border-2 border-border bg-card shadow-sm print:break-after-page print:shadow-none">
      {/* Header table */}
      <div className="grid grid-cols-[140px_1fr_180px] border-b-2 border-border text-sm">
        <div className="flex items-center justify-center border-r-2 border-border bg-white p-3">
          <NutrimilhoLogo className="h-10 w-10" />
        </div>
        <div className="flex flex-col justify-center border-r-2 border-border p-3">
          <div className="text-center text-sm font-bold uppercase tracking-wide">
            Evidências de Auditoria de BPF
          </div>
          <div className="mt-1 text-center text-xs text-muted-foreground">
            Setor: <span className="font-medium text-foreground">{setor}</span>
          </div>
        </div>
        <div className="flex flex-col justify-center divide-y-2 divide-border text-xs">
          <div className="px-3 py-2">
            <span className="font-medium">{data}</span> — {turno}
          </div>
          <div className="px-3 py-2">Auditor(es): <span className="font-medium">{auditor}</span></div>
          <div className="px-3 py-2">PÁG: {pageIdx} de {totalPages}</div>
        </div>
      </div>

      {/* Setor title band */}
      <div className="border-b-2 border-border bg-accent/60 py-2 text-center text-sm font-bold uppercase tracking-wider">
        {pageIdx} — {setor}
      </div>

      {/* Rows */}
      <div className="divide-y-2 divide-border">
        {items.map((it) => (
          <EvidenceRow key={it.id} item={it} onRemove={onRemove} />
        ))}
      </div>
    </article>
  );
}

function EvidenceRow({
  item,
  onRemove,
}: {
  item: Evidencia;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-0">
      <div className="flex items-center justify-center border-b-2 border-border bg-muted/40 p-3 md:border-b-0 md:border-r-2">
        {item.foto ? (
          <img
            src={item.foto}
            alt="Evidência fotográfica"
            className="max-h-72 w-auto rounded-sm object-contain"
          />
        ) : (
          <div className="grid h-40 w-full place-items-center rounded border-2 border-dashed border-border text-xs text-muted-foreground">
            Sem foto anexada
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div>
          <Badge className="bg-nc text-nc-foreground hover:bg-nc/90">
            Não conformidade
          </Badge>
          <p className="mt-2 text-sm font-semibold leading-snug">
            {item.naoConformidade}
          </p>
        </div>
        <div className="border-t-2 border-dashed border-border pt-3">
          <div className="text-xs font-bold uppercase tracking-wide text-brand">
            Ação corretiva
          </div>
          <p className="mt-1 text-sm leading-snug">{item.acaoCorretiva}</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-2 print:hidden">
          <span className="text-xs text-muted-foreground">
            Registrado em {new Date(item.createdAt).toLocaleString("pt-BR")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir
          </Button>
        </div>
      </div>
    </div>
  );
}

function NewEvidenceDialog({ onAdd }: { onAdd: (e: Evidencia) => void }) {
  const [data, setData] = useState(todayISO());
  const [turno, setTurno] = useState("Turno A");
  const [auditor, setAuditor] = useState("");
  const [setor, setSetor] = useState(SETORES[0]);
  const [nc, setNc] = useState("");
  const [ac, setAc] = useState("");
  const [foto, setFoto] = useState<string | undefined>();

  function onFile(f: File | undefined) {
    if (!f) return setFoto(undefined);
    const r = new FileReader();
    r.onload = () => setFoto(String(r.result));
    r.readAsDataURL(f);
  }

  function submit() {
    if (!auditor.trim() || !nc.trim() || !ac.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      data,
      turno,
      auditor: auditor.trim(),
      setor,
      naoConformidade: nc.trim(),
      acaoCorretiva: ac.trim(),
      foto,
      createdAt: Date.now(),
    });
    setNc("");
    setAc("");
    setFoto(undefined);
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Nova evidência de BPF</DialogTitle>
        <DialogDescription>
          Registre uma não conformidade encontrada em auditoria e a ação
          corretiva associada.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Data</Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Turno</Label>
            <Select value={turno} onValueChange={setTurno}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TURNOS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Auditor</Label>
            <Input
              placeholder="Ex: ANA"
              value={auditor}
              onChange={(e) => setAuditor(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Setor</Label>
          <Select value={setor} onValueChange={setSetor}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SETORES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label>Não conformidade encontrada</Label>
          <Textarea
            rows={3}
            placeholder="Descreva a não conformidade observada..."
            value={nc}
            onChange={(e) => setNc(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Ação corretiva</Label>
          <Textarea
            rows={3}
            placeholder="Descreva a ação corretiva a ser tomada..."
            value={ac}
            onChange={(e) => setAc(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label>Foto (opcional)</Label>
          <Input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {foto && (
            <img
              src={foto}
              alt="Pré-visualização"
              className="mt-1 max-h-40 w-auto rounded border"
            />
          )}
        </div>
      </div>

      <DialogFooter>
        <Button
          onClick={submit}
          className="bg-brand text-brand-foreground hover:bg-brand/90"
        >
          Salvar evidência
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
