# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Projet

Application web personnelle de budget quotidien pour **une seule utilisatrice**. L'objectif est d'ouvrir le site chaque soir, ajouter des dépenses en 5 secondes, et voir visuellement où part l'argent.

**Règle principale :** si une décision rend l'app plus complexe sans améliorer l'usage quotidien réel — ne pas la faire.

---

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Supabase** (PostgreSQL + Auth) — connecté directement en local et en prod
- **Vercel** — déploiement en dernier, après que tout fonctionne en local

Supabase est la seule dépendance externe dès le début. Pas de base locale simulée.

---

## Commandes

```bash
npm run dev        # démarrage local (Next.js)
npm run build      # build de production
npm run lint       # ESLint
npm run type-check # tsc --noEmit
```

Variables d'environnement requises (`.env.local`) :
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Architecture

```
app/
  (auth)/          # pages login/logout
  (app)/           # pages protégées (budget, stats)
    layout.tsx     # vérifie la session Supabase
components/
  ui/              # shadcn/ui (ne pas modifier)
  [feature]/       # composants métier regroupés par feature
lib/
  supabase.ts      # client Supabase (browser + server)
  db/              # helpers de requêtes (pas d'ORM lourd)
Componant/         # specs design (theme-style.md, graph-pie.md)
```

Pas de Prisma — Supabase client suffit pour ce scope. Requêtes directes via `supabase-js`.

---

## Auth

Supabase Auth, **sans confirmation email** (`email_confirm = false` dans les settings Supabase). Une seule utilisatrice. Pas de rôles, pas d'admin.

La session est gérée côté serveur via les cookies Supabase SSR (`@supabase/ssr`).

---

## Schéma de données (Supabase)

Tables principales :
- `expenses` — id, user_id, amount, label, tag_id, date, is_recurring, recurrence_frequency, is_exceptional, created_at
- `tags` — id, user_id, name, color

Les tags ont des défauts (Food, Transport, Shopping, Santé, Loisirs, Maison) créés à l'inscription.

---

## Design

Style : doux, minimaliste, féminin sobre, mobile-first. Référence interne : `Componant/theme-style.md` et `Componant/graph-pie.md`.

- Graphique principal : camembert (`Componant/graph-pie.md`)
- Couleurs des tags : harmonisées avec le thème, personnalisables
- Animations : légères, fluides, discrètes
- Ne jamais faire : dashboard crypto, interface enterprise, surcharge d'infos

Librairie de graphiques : **Recharts** (compatible shadcn/ui, léger).

---

## Priorités de dev

1. Ajout de dépense rapide (flux minimal, peu de clics)
2. Visualisation claire (camembert + liste)
3. Tags simples
4. Dépenses récurrentes (checkbox + fréquence)
5. Dépenses exceptionnelles (flag simple)
6. Stats légères (moyenne/jour, catégorie dominante, comparaison mois précédent)
