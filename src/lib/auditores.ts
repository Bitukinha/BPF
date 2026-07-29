import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { pool, withSchema } from "./db";

export type Auditor = {
  id: string;
  nome: string;
};

export const listAuditores = createServerFn({ method: "GET" }).handler(async () => {
  await withSchema();
  const result = await pool.query(
    `SELECT id, nome FROM auditores ORDER BY nome ASC`,
  );
  return result.rows as Auditor[];
});

export const createAuditor = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ id: z.string(), nome: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    await withSchema();
    await pool.query(
      `INSERT INTO auditores (id, nome) VALUES ($1, $2) ON CONFLICT (nome) DO NOTHING`,
      [data.id, data.nome.trim()],
    );
  });

export const deleteAuditor = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    await withSchema();
    await pool.query(`DELETE FROM auditores WHERE id = $1`, [data.id]);
  });
