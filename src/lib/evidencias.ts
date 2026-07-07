import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { pool, withSchema } from "./db";

export type Evidencia = {
  id: string;
  data: string;
  turno: string;
  auditor: string;
  setor: string;
  naoConformidade: string;
  acaoCorretiva: string;
  foto?: string;
  createdAt: number;
};

const evidenciaInputSchema = z.object({
  id: z.string(),
  data: z.string(),
  turno: z.string(),
  auditor: z.string(),
  setor: z.string(),
  naoConformidade: z.string(),
  acaoCorretiva: z.string(),
  foto: z.string().optional(),
  createdAt: z.number(),
});

function rowToEvidencia(row: {
  id: string;
  data: Date;
  turno: string;
  auditor: string;
  setor: string;
  nao_conformidade: string;
  acao_corretiva: string;
  foto: string | null;
  created_at: Date;
}): Evidencia {
  return {
    id: row.id,
    data: row.data.toISOString().slice(0, 10),
    turno: row.turno,
    auditor: row.auditor,
    setor: row.setor,
    naoConformidade: row.nao_conformidade,
    acaoCorretiva: row.acao_corretiva,
    foto: row.foto ?? undefined,
    createdAt: row.created_at.getTime(),
  };
}

export const listEvidencias = createServerFn({ method: "GET" }).handler(async () => {
  await withSchema();
  const result = await pool.query(
    `SELECT id, data, turno, auditor, setor, nao_conformidade, acao_corretiva, foto, created_at
     FROM evidencias
     ORDER BY created_at DESC`,
  );
  return result.rows.map(rowToEvidencia);
});

export const createEvidencia = createServerFn({ method: "POST" })
  .validator((input: unknown) => evidenciaInputSchema.parse(input))
  .handler(async ({ data }) => {
    await withSchema();
    await pool.query(
      `INSERT INTO evidencias (id, data, turno, auditor, setor, nao_conformidade, acao_corretiva, foto, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9 / 1000.0))`,
      [
        data.id,
        data.data,
        data.turno,
        data.auditor,
        data.setor,
        data.naoConformidade,
        data.acaoCorretiva,
        data.foto ?? null,
        data.createdAt,
      ],
    );
  });

export const deleteEvidencia = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    await withSchema();
    await pool.query(`DELETE FROM evidencias WHERE id = $1`, [data.id]);
  });
