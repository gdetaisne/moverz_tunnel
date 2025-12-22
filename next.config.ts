import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// Chargement auto des variables d'env locales depuis KEYS/moverz-tunnel-env-local.txt
// pour le développement uniquement. Format attendu: lignes "KEY=VALUE".
if (process.env.NODE_ENV !== "production") {
  try {
    const envFilePath = path.join(
      "/Users/guillaumestehelin/KEYS",
      "moverz-tunnel-env-local.txt"
    );
    if (fs.existsSync(envFilePath)) {
      const raw = fs.readFileSync(envFilePath, "utf8");
      raw
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .forEach((line) => {
          const idx = line.indexOf("=");
          if (idx === -1) return;
          const key = line.slice(0, idx).trim();
          const value = line.slice(idx + 1).trim();
          if (!key || value === undefined) return;
          if (!process.env[key]) {
            process.env[key] = value;
          }
        });
    }
  } catch (e) {
    // En dev on log en console, mais on ne bloque jamais Next
    // eslint-disable-next-line no-console
    console.warn("Impossible de charger KEYS/moverz-tunnel-env-local.txt", e);
  }
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Ensure widget updates propagate quickly (avoid “stuck in cache” on moverz.fr).
      {
        source: "/moverz-widget.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;


