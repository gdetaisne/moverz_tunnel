import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

// Singleton Prisma client (pattern recommandé pour Next.js App Router)

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function findProjectRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

// En dev, Turbopack/Next peut exécuter certains chunks avec un cwd différent (ex: `.next/`).
// Si DATABASE_URL est relatif (`file:./...`), Prisma peut alors ne plus trouver le fichier.
// On normalise uniquement les URLs *relatives* vers un chemin absolu basé sur la racine projet.
if (process.env.NODE_ENV !== "production") {
  const raw = process.env.DATABASE_URL ?? "";
  const cleaned = raw.trim().replace(/^"+|"+$/g, "");
  const isRelativeSqlite =
    cleaned.startsWith("file:./") || cleaned.startsWith("file:../");

  if (!cleaned || isRelativeSqlite) {
    const root = findProjectRoot(process.cwd());
    const dbPath = path.join(root, "prisma", "dev.db");
    process.env.DATABASE_URL = `file:${dbPath}`;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}


