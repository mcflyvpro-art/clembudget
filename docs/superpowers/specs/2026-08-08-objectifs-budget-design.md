# Feature « Objectifs » — plafonds de dépenses par catégorie

Date : 2026-08-08
Projet : BudgetClem (Next.js App Router + Supabase)

## Objectif

Permettre de définir un montant à ne pas dépasser, par catégorie ou globalement,
sur une période donnée, et voir cet objectif partout dans l'app (accueil, stats,
catégories) sans alourdir le flux quotidien.

Contrainte forte : **additif uniquement**. Sans objectif défini, l'app se
comporte exactement comme avant.

## Modèle de données

Nouvelle table `public.budgets`. Aucune modification de `expenses` ni `tags`.

| colonne | type | rôle |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → auth.users | RLS |
| `tag_id` | uuid → tags, nullable | `null` = objectif global |
| `amount` | numeric > 0 | plafond en € |
| `kind` | text | `recurring` \| `oneshot` |
| `period` | text nullable | `weekly` \| `monthly` \| `yearly` — requis si `recurring` |
| `start_date` | date nullable | requis si `oneshot` |
| `end_date` | date nullable | requis si `oneshot`, ≥ `start_date` |
| `label` | text nullable | nom libre d'un objectif ponctuel |
| `is_active` | boolean, défaut `true` | mise en pause sans suppression |
| `created_at` | timestamptz | |

Contraintes :

- `kind = 'recurring'` ⟹ `period` non nul, `start_date`/`end_date` nuls.
- `kind = 'oneshot'` ⟹ `start_date`/`end_date` non nuls, `period` nul.
- Index unique partiel : un seul objectif `recurring` actif par
  `(user_id, tag_id)`, `tag_id` NULL inclus (`NULLS NOT DISTINCT`, PG15+).
  Le global compte donc pour un.
- Objectifs `oneshot` : illimités, aucune contrainte d'unicité.
- `ON DELETE CASCADE` sur `tag_id` : supprimer une catégorie supprime son objectif.
- RLS activée, 4 policies (select/insert/update/delete) sur `user_id = auth.uid()`.

## Logique — `lib/budgets.ts`

Module pur, sans I/O, réutilisé par les 3 pages.

```ts
getPeriodWindow(budget, today) → { from: string, to: string }
```
- `recurring` + `weekly` → lundi → dimanche de la semaine de `today`
- `recurring` + `monthly` → 1er → dernier jour du mois
- `recurring` + `yearly` → 1er janvier → 31 décembre
- `oneshot` → `start_date` → `end_date`

```ts
computeProgress(budget, expenses, today) → BudgetProgress
```
Champs retournés :

- `spent` — somme des dépenses de la fenêtre dont `date <= today`
- `upcoming` — somme des occurrences de la fenêtre dont `date > today`
  (essentiellement les récurrentes étalées par `fetchExpensesForStats`)
- `projected` = `spent + upcoming`
- `remaining` = `amount - spent`
- `daysLeft` — jours restants dans la fenêtre, `today` inclus
- `perDayRemaining` = `remaining / daysLeft`, `null` si fenêtre terminée
- `pctSpent`, `pctProjected` — bornés à 100 pour l'affichage, valeur brute conservée
- `status` :
  - `over` si `spent >= amount`
  - `risk` si `projected >= amount` (mais `spent < amount`)
  - `warning` si `spent >= 0.8 * amount`
  - `ok` sinon
- `isPast` — fenêtre entièrement passée (objectif ponctuel terminé)

Le filtrage par catégorie se fait sur `tag_id` ; pour un objectif global, toutes
les dépenses de la fenêtre comptent.

## Chargement des données — `lib/db/budgets.ts`

`fetchBudgetsWithProgress(supabase, userId)` :

1. charge les `budgets` actifs (+ `tags(*)`)
2. calcule l'union `[min(from), max(to)]` de toutes les fenêtres
3. **une seule** requête `fetchExpensesForStats(union.from, union.to)` — réutilise
   l'expansion des récurrentes existante, aucun code dupliqué
4. calcule `computeProgress` par budget, en mémoire
5. retourne `BudgetProgress[]` trié : global d'abord, puis par `status` décroissant

Si aucun budget : retourne `[]` sans faire de requête sur `expenses`.

## Composants

### `BudgetBar` — brique visuelle unique

Barre horizontale en deux segments sur une piste `bg-muted` :
- segment plein, couleur du tag (ou `primary` pour le global) = `spent`
- segment hachuré translucide = `upcoming`
- au-delà de 100 %, la barre passe en `destructive`

Props : `progress: BudgetProgress`, `size?: 'sm' | 'md'`, `showLabel?: boolean`.
Utilisée telle quelle par le dashboard, `/stats`, `/objectifs` et `/categories`.

### `BudgetsStrip` — bandeau dashboard

Compact, sous le total du mois (mobile) / sous `ChartPanel` (desktop).
Affiche l'objectif global puis les 3 catégories les plus tendues, en `sm`.
Masqué entièrement si aucun objectif.

### `BudgetsManager` — page `/objectifs`

Calqué sur `TagsManager` : liste à gauche, formulaire sticky à droite.
Trois sections : *Global*, *Par catégorie*, *Ponctuels*.
Chaque ligne : `BudgetBar`, montant, reste, boutons éditer/pause/supprimer.
Le formulaire bascule entre récurrent (catégorie + période) et ponctuel
(nom + dates), avec les catégories déjà pourvues d'un objectif désactivées.

### `BudgetsPanel` — carte `/stats`

État des objectifs de la période **en cours** (indépendant du filtre de dates,
libellé explicite). Par objectif : `BudgetBar`, reste, €/jour restant,
projection fin de période.

De plus, dans la liste « Répartition par catégorie » existante, un repère
plafond est superposé sur la barre d'une catégorie **uniquement** quand le
filtre actif est *Cette semaine* / *Ce mois* / *Cette année* sur la période
courante — sinon la comparaison serait fausse.

### Intégrations légères

- `/categories` : pastille « 300 €/mois » sur chaque tag pourvu, lien vers `/objectifs`.
- Ajout de dépense : après insertion, si la dépense fait franchir 80 % ou 100 %
  d'un objectif, un bandeau de feedback s'affiche quelques secondes.
- `NavBar` : entrée « Objectifs », icône `Target`, entre Stats et Récurrents.

## Server actions — `app/actions.ts`

`createBudget` · `updateBudget` · `deleteBudget` · `toggleBudget`

Même forme que les actions `tags` existantes : auth via `supabase.auth.getUser()`,
filtre `eq('user_id', user.id)`, puis `revalidatePath('/')`, `/stats`,
`/objectifs`, `/categories`.

Validation serveur : montant > 0, cohérence `kind`/`period`/dates,
`end_date >= start_date`.

## Non-régression

- Aucune colonne ni requête existante modifiée.
- Les composants existants (`DashboardClient`, `StatsClient`, `TagsManager`)
  reçoivent une prop **optionnelle** `budgets?: BudgetProgress[]`. Absente ou
  vide ⟹ rendu strictement identique à l'actuel.
- `fetchExpensesForStats` et `fetchExpensesForHistory` inchangées.
- Vérification finale : `npm run type-check`, `npm run lint`, `npm run build`.

## Hors scope

- Historique du respect des objectifs sur les mois passés.
- Notifications push.
- Objectifs partagés / multi-utilisateurs (l'app est mono-utilisatrice).
