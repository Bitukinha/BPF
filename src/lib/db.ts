import { Pool } from "pg";

declare global {
  var __bpfPool: Pool | undefined;
  var __bpfSchemaReady: Promise<unknown> | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  // Neon terminates TLS with a certificate chain that serverless runtimes
  // don't always have the intermediate CA for; encrypt without strict
  // verification rather than fail the handshake.
  return new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
}

// Reused across HMR reloads in dev and warm serverless invocations in prod.
export const pool = globalThis.__bpfPool ?? (globalThis.__bpfPool = createPool());

function ensureSchema() {
  return pool.query(`
    CREATE TABLE IF NOT EXISTS evidencias (
      id UUID PRIMARY KEY,
      data DATE NOT NULL,
      turno TEXT NOT NULL,
      auditor TEXT NOT NULL,
      setor TEXT NOT NULL,
      nao_conformidade TEXT NOT NULL,
      acao_corretiva TEXT NOT NULL,
      foto TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS auditores (
      id UUID PRIMARY KEY,
      nome TEXT NOT NULL UNIQUE
    )
  `);
}

export function withSchema() {
  return (globalThis.__bpfSchemaReady ??= ensureSchema());
}
