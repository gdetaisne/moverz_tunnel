# MIGRATION HETZNER — Mars 2026

> **URGENT** : Ce repo (`moverz_tunnel` → `devis.moverz.fr`) a été migré de Hostinger/CapRover vers Hetzner/Coolify le 16 mars 2026.
> Lire ce document avant toute modification de configuration, DNS, ou déploiement.

---

## Nouvelle infrastructure

| Élément | Avant (Hostinger) | Après (Hetzner) |
|---|---|---|
| Serveur | VPS Hostinger (`88.223.94.12`) | CCX23 Hetzner (`116.203.177.139`) |
| URL interne CapRover | `devis-gratuit.gslv.cloud` | `https://devis.moverz.fr` |
| Plateforme deploy | CapRover | **Coolify** |
| Build pack | CapRover (Dockerfile existant) | Coolify **Dockerfile** |

## Déploiement

- **Plateforme** : Coolify sur `116.203.177.139:8000`
- **UUID app** : `59e59ec2-5be6-4fdb-b924-18265abe36ac`
- **Repo GitHub** : `gdetaisne/moverz_tunnel` (privé — GitHub App Coolify)
- **Build** : Dockerfile existant (`node:20-bullseye-slim`)
- **Branche** : `main`

## DNS — Cloudflare

| Enregistrement | Type | Valeur | Proxy |
|---|---|---|---|
| `devis.moverz.fr` | A | `116.203.177.139` | Orange (Cloudflare activé) |

**SSL** : Let's Encrypt via Traefik/Coolify + Cloudflare en mode Full.

## Modifications apportées lors de la migration

### Aucune modification de code

Le Dockerfile existant était déjà fonctionnel (`node:20-bullseye-slim`, `npm ci --include=dev`).

### Corrections dans Coolify (hors code)

1. **`git_repository`** : corrigé de `https://github.com/gdetaisne/moverz_tunnel` → `gdetaisne/moverz_tunnel` (format attendu par l'API Coolify)
2. **Certificat SSL** : entrée `devis.moverz.fr` corrompue dans `acme.json` supprimée manuellement + restart `coolify-proxy` pour forcer la réémission
3. **GitHub App** : l'app est liée à la GitHub App Coolify (pas à une deploy key)

### Commit notable (avant migration)

**Commit `170b6c5`** : désactivation de `/api/ai/analyze-photos` — route Claude désactivée suite à l'incident malware de mars 2026. **Ne pas réactiver sans audit de sécurité.**

## Variables d'environnement

Injectées dans Coolify. Source de vérité : `docs/ENV_PRODUCTION.md` dans `Back_Office`.

Variables clés :
- `NEXT_PUBLIC_API_URL` : URL du back-office (`https://moverz-backoffice.gslv.cloud`)
- `DATABASE_URL` : SQLite local (monté dans le container Coolify)
- `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_PAYPAL_PAYMENT_URL`

## Points d'attention

- **SQLite** : la base de données est stockée localement dans le container. Si le container est recréé, les données sont perdues. Envisager une migration vers Neon (Postgres) — voir `post-migration → optimisations` dans `Back_Office/docs/MIGRATION_HETZNER_MARS2026.md`
- **`/api/ai/analyze-photos`** : désactivée — ne pas réactiver

## Checklist à la réouverture

- [ ] `https://devis.moverz.fr` répond 200 ?
- [ ] Le formulaire multi-étapes fonctionne ?
- [ ] Les events tunnel (`tunnel-events`) transmettent bien au back-office ?
- [ ] SQLite : base de données persistée dans le volume Coolify ?

---

*Document créé le 16/03/2026 — migration Hostinger → Hetzner*
