# Paper — Project brief

> Document de référence pour Claude Code. À lire avant toute tâche.
> Langue : **code en anglais**, **interface et textes utilisateur en français**.

---

## 1. Vision

**Paper** est un « Home OS » personnel, auto-hébergé (accès réseau local / Tailscale, PWA).
Une **seule application** AdonisJS + Inertia + React qui regroupe :

| Domaine    | Couvre                                                    | Couleur          |
| ---------- | --------------------------------------------------------- | ---------------- |
| **Budget** | patrimoine, comptes, placements, enveloppes, transactions | or `#C99A1A`     |
| **Maison** | factures, abonnements, équipements, tableau électrique    | violet `#7C5CE0` |
| **Auto**   | véhicules, pleins, entretiens, échéances, coût au km      | bleu `#2F7FE0`   |
| **Menu**   | planning repas, recettes, frigo / placards, courses       | corail `#E8604A` |

### Principe clé : organisation par **dimension**, pas par app

Les domaines **ne sont pas des apps séparées** dans l'UI. Ce sont des **étiquettes** posées sur chaque élément.
La navigation principale est transverse :

- **Aujourd'hui** — ce qui compte aujourd'hui/demain, tous domaines confondus
- **Agenda** — tout ce qui a une date (échéances, repas, prélèvements, entretiens), filtrable par domaine
- **Argent** — chaque euro, d'où qu'il vienne (un plein, une facture, des courses)
- **Listes** — Courses, À faire, Placards ; remplies automatiquement par les autres domaines
- **Fiches** — les objets du quotidien : Véhicules, Logement, Abonnements, Recettes, Placements (propriétés + éléments liés + « Mentionnée dans »)
- **Bilan du jour** (`/bilan`) — chaque soir : argent du jour confirmé, tâches triées (fait / demain / plus tard / abandon), repas (cuisiné / autre / dehors → dépense), habitudes, humeur et note. Faisable jusqu'au lendemain midi ; la **série** de jours validés est le moteur de la routine (module `app/domains/routine`).
- **Saisie universelle** (`Ctrl K`) — une phrase (« plein 38 L 67 € ») → aperçu des effets → enregistrement

**Pas de liberté façon Notion** : les types de fiches, leurs champs et les vues sont définis dans le code. L'utilisateur remplit, Paper relie.

---

## 2. Stack (non négociable)

- **AdonisJS v7** (TypeScript strict) — Lucid, VineJS, Japa, Emitter, Session, Shield
- **Inertia** + **React** + TypeScript strict
- **Tailwind CSS v4** (configuration CSS-first via `@theme`, pas de `tailwind.config.js`)
- **PostgreSQL** (extension `pg_trgm` pour la recherche floue)
- **Redis** (store de session, cache)
- **pnpm ≥ 11**, **Node ≥ 24**
- Dépendances spécifiques prévues : `chrono-node` (dates en français)

> AdonisJS v7 est récent : en cas de doute sur une API, une commande `ace` ou un provider, **vérifier la documentation officielle v7** plutôt que supposer le comportement v6.

### Interdits

- ❌ **Aucun LLM / IA générative** dans l'app. Saisie universelle et suggestions de repas = **règles + scoring déterministe**.
- ❌ Pas de découpage en plusieurs apps / micro-services, pas de Redis Streams, pas d'outbox : c'est **un monolithe modulaire**.
- ❌ Pas de nouvelle dépendance sans le demander d'abord.
- ❌ Pas de `any`, pas de `@ts-ignore` non justifié.

---

## 3. Architecture

### 3.1 Monolithe modulaire par domaine

La logique métier est rangée **par domaine** côté serveur ; les pages Inertia, elles, sont **par dimension** et croisent les domaines.

```
app/
  domains/
    budget/        models/ services/ validators/ events/ listeners/
    maison/        models/ services/ validators/ events/ listeners/
    auto/          models/ services/ validators/ events/ listeners/
    menu/          models/ services/ validators/ events/ listeners/
    lists/         shopping_items (module Listes, rempli par les autres domaines)
  capture/         # moteur de saisie universelle (cf. §6)
    registry.ts
    scorer.ts
    extractors.ts
    intents/       expense_intent.ts, fuel_intent.ts, bill_intent.ts, meal_intent.ts, shopping_item_intent.ts
  views/           # read models transverses (assemblent plusieurs domaines)
    today_view.ts  agenda_view.ts  money_view.ts  lists_view.ts
  controllers/     # fins, par dimension : today, agenda, money, lists, fiches, capture
  middleware/
inertia/
  app/app.tsx
  layouts/app_shell.tsx      # layout persistant : rail d'icônes (barre basse sur mobile) + CommandPalette
  pages/
    today.tsx  agenda.tsx  money.tsx  lists.tsx
    fiches/vehicle.tsx  fiches/home.tsx  fiches/subscription.tsx  fiches/recipe.tsx  fiches/account.tsx
  components/ui/             # composants du design system (cf. §5)
  components/icons/          # icônes de la navigation (base `Icon`, une par fichier)
  components/domain/         # DomainTag, AmountCell, DueProgress…
  lib/format.ts              # formatage FR (€, dates, km, L)
  types/
```

Utiliser les **subpath imports** Adonis (`#domains/*`, `#capture/*`, `#views/*`) déclarés dans `package.json` → `imports`.

### 3.2 Règles de dépendance

- Un domaine **n'importe jamais les models d'un autre domaine**. Il passe par :
  - un **service public** du domaine cible, appelé **dans la même transaction** quand l'effet doit être atomique (ex. un plein crée une transaction Budget) ;
  - ou un **événement** (`emitter`) pour les effets secondaires non critiques (recalcul d'échéance, mise à jour d'une liste).
- Les `views/` peuvent **lire** plusieurs domaines (requêtes Lucid / SQL en lecture seule) ; elles n'écrivent jamais.
- Les controllers restent fins : validation VineJS → service → `inertia.render()` ou `redirect().back()`.

### 3.3 Événements inter-domaines (exemples)

| Événement                | Émis par | Écouté par → effet                                                                                               |
| ------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `auto:fuel_logged`       | Auto     | Budget → transaction « Carburant » ; Auto → kilométrage + échéance vidange ; Listes → tâche « vidange » si seuil |
| `maison:bill_paid`       | Maison   | Budget → transaction « Factures »                                                                                |
| `menu:meal_planned`      | Menu     | Listes → articles manquants aux Courses ; Budget → estimation enveloppe Courses                                  |
| `menu:meal_cooked`       | Menu     | Menu → décrément du stock (frigo/placards)                                                                       |
| `lists:shopping_checked` | Listes   | Menu → incrément du stock                                                                                        |

Les listeners doivent être **idempotents**. Ils sont déclarés dans `start/events.ts`.

Implémenté à ce jour :

- `menu:meal_planned` → Listes (courses, hors basiques) ;
- `lists:shopping_checked` → Menu (stock), défait en décochant ;
- `menu:recipe_changed`, `maison:bill_changed`, `maison:contract_changed` → Listes (tâches automatiques : facture à payer, recette à compléter, préavis de contrat).

Un repas marqué cuisiné décrémente le stock **dans la même transaction** (le stock appartient à Menu) ; chaque mouvement de stock est journalisé par source (`pantry_movements`), ce qui rend ces effets idempotents et réversibles. Les mouvements d'argent (plein, facture, prélèvement, entretien, travaux) appellent `TransactionService` **dans la même transaction**, jamais via un événement. Les virements entre comptes sont deux transactions `source_type = 'transfer'`, exclues de toute somme de dépenses ou d'entrées (`NOT_TRANSFER_SQL`).

**Prélèvements d'abonnements** : tâche horaire dans le serveur web (`start/scheduler.ts`, rattrape les jours manqués, idempotente) ; équivalent manuel `node ace subscriptions:charge`.

### 3.4 Auth

Application mono-utilisateur/foyer : **guard session** Adonis (cookie, store Redis). Pas d'access tokens.

---

## 4. Modèle de données (base)

Toutes les tables ont `id`, `created_at`, `updated_at`. Montants en **centimes** (`integer`), jamais en float.
Chaque élément affichable dans Agenda/Aujourd'hui expose un `domain` (`budget | maison | auto | menu`).

**Budget** : `accounts` (type: courant/épargne/placement), `envelopes` (budget mensuel, source optionnelle), `transactions` (montant, date, envelope_id, `source_type` + `source_id` polymorphique vers l'élément d'origine).

**Auto** : `vehicles` (immat, carburant, valeur estimée), `fuel_logs` (vehicle_id, litres, total, odometer, date), `maintenances` (vehicle_id, type, statut, échéance date et/ou km, coût).

**Maison** : `bills` (fournisseur, montant, échéance, statut, pdf), `subscriptions` (prix, jour de prélèvement, usage), `equipment` (garantie, entretien), `electrical_circuits` (protection, section, conso).

**Menu** : `ingredients` (catalogue canonique, unité par défaut, `is_staple`), `recipes`, `recipe_ingredients` (quantité, unité, `is_main`), `pantry_items` (ingredient_id, quantité, emplacement, péremption), `meal_plans` (date, créneau midi/soir, recipe_id, portions), `ingredient_substitutions`.

**Listes** : `shopping_items` (ingredient_id nullable, libellé, quantité, `reason_domain`, coché), `tasks` (titre, échéance, statut, `source_type`/`source_id`, domain).

**Capture** : `capture_aliases` (phrase normalisée → entité résolue, ex. « la voiture » → vehicle #1).

**Fiches** : pas de table générique. Une fiche = une page qui affiche une entité typée (vehicle, recipe, subscription…) + ses relations + ses rétroliens calculés.

---

## 5. Design system

**Ambiance** : minimaliste noir et blanc façon Notion. **La couleur ne sert qu'à indiquer le domaine** (icône, pastille, barre de progression, courbe). Boutons primaires **toujours noirs**.

### 5.1 Tokens Tailwind 4 (`inertia/css/app.css`)

```css
@import 'tailwindcss';

@theme {
  --font-sans: 'Inter', system-ui, sans-serif;

  --color-bg: #ffffff;
  --color-sidebar: #fbfbfa;
  --color-callout: #f7f7f5;
  --color-hover: #efefed;
  --color-border: #ebebe9;
  --color-muted: #6b6b6b;
  --color-ink: #1f1f1f;

  --color-budget: #c99a1a;
  --color-budget-ink: #8a6410;
  --color-budget-soft: #fbf3db;
  --color-maison: #7c5ce0;
  --color-maison-ink: #5b3fc4;
  --color-maison-soft: #f1edfd;
  --color-auto: #2f7fe0;
  --color-auto-ink: #1f5fb0;
  --color-auto-soft: #e8f1fc;
  --color-menu: #e8604a;
  --color-menu-ink: #b5412e;
  --color-menu-soft: #fdece8;

  --color-success: #1e6b40;
  --color-success-soft: #e7f4ec;
  --color-warning: #8a5300;
  --color-warning-soft: #fdf1de;
  --color-warning-bar: #d98a00;
  --color-danger: #a8302a;
  --color-danger-soft: #fbe9e8;

  --radius-tag: 4px;
  --radius-control: 6px;
  --radius-card: 8px;
}

body {
  font-variant-numeric: tabular-nums;
}
```

### 5.2 Règles visuelles

- Fond blanc, filets fins `border`, **peu de cartes** : sections séparées par l'espace et des lignes.
- Titres de page 36px/700, sections 16px/600, corps 14px/400, labels 13px `muted`.
- Pastille de domaine : `text-xs font-medium px-1.5 py-0.5 rounded-tag` + `text-{domain}-ink bg-{domain}-soft`.
- Barres de progression **3px**, couleur du domaine (ou `warning-bar` / `danger`).
- Icônes : SVG inline en trait (stroke 1.8 dans les pages via lucide ; dans la navigation, icônes maison `components/icons/` à 1.6, 2 pour l'élément actif), jamais d'emoji.
- Accessibilité : contraste ≥ 4.5:1 (le `muted` #6B6B6B passe sur blanc), vrais `<button>` / `<a>` / `<input>` + `<label>`, cibles ≥ 40px dans la navigation (56×52 dans le rail).
- Navigation : rail blanc de 84px, icônes sans libellé visible (`aria-label` + `title` + `sr-only`), état actif par la couleur `ink` et le trait seulement (ni fond ni pastille), aucune couleur de domaine. Config dans `components/ui/nav_items.ts`.
- Responsive : sous `md`, le rail laisse place à une barre fixe en bas (Aujourd'hui, Agenda, +, Argent, Listes) et le contenu reçoit un `padding-bottom` équivalent ; tableaux larges dans un conteneur `overflow-x-auto`.

### 5.3 Composants `components/ui/`

`Button` (primary noir / secondary bordé / ghost), `Input`, `Checkbox`, `DomainTag`, `StatusTag` (fait/planifié/à prévoir/en retard), `ProgressBar`, `Callout`, `Section` (titre + lien), `DataTable`, `PropertyList` (propriétés de fiche label/valeur), `NavRail` / `MobileNavBar`, `CommandPalette`.

### 5.4 Locale

Tout le formatage passe par `inertia/lib/format.ts` (et un équivalent serveur si besoin) :

- montants : `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })` → `1 632,40 €`
- dates : `DD/MM/YYYY`, jours abrégés FR (« Mer. 28 »)
- nombres : espace fine comme séparateur de milliers (`142 380 km`), virgule décimale (`38,2 L`)

---

## 6. Saisie universelle (sans LLM)

Pipeline : **comprendre → proposer un plan → exécuter après confirmation**. Rien n'est écrit sans validation.

1. **Normalisation** : minuscules, suppression des accents, espaces.
2. **Scoring des intents** : chaque intent déclare `keywords` (+ synonymes, tolérance de faute par distance d'édition), unités attendues, entités reconnues. Score = mots-clés + unités trouvées + entités connues. Si deux intents sont proches → **proposer le choix** à l'utilisateur, ne jamais deviner.
3. **Extraction** : regex montant `€`, litres `L`, km ; dates via `chrono-node` (locale `fr`) ; entités via `pg_trgm` + `capture_aliases`.
4. **Contexte** : valeurs par défaut (date = aujourd'hui ; véhicule = seul véhicule compatible avec le carburant / cohérent avec le compteur).
5. **Plan** : liste d'`Effect` lisibles affichés dans l'aperçu.
6. **Exécution** : service du domaine dans **une transaction**, puis événements.
7. **Apprentissage** : chaque correction dans l'aperçu crée/met à jour un `capture_alias` (entité choisie, ou type de saisie choisi via « Ce n'est pas ça ? » → alias `intent`).
8. **Saisies multiples** : « plein 38 L 67 € et café 3 € » est découpé (`et`, `;`, `puis`, retour ligne) seulement si chaque morceau est compris seul ; enregistrement tout-ou-rien.
9. **Questions** (`app/capture/questions.ts`) : lecture seule (dépenses par enveloppe/période, repas, prélèvements, factures, tâches, soldes, véhicule, courses).
10. **Annuler** : chaque enregistrement est journalisé (`capture_logs`, éléments créés) ; `POST /capture/:id/annuler` défait tout via les services des domaines.

```ts
// app/capture/intent.ts
export interface CaptureIntent<T> {
  name: 'expense' | 'fuel' | 'bill' | 'meal' | 'shopping_item'
  keywords: string[]
  score(input: NormalizedInput, ctx: CaptureContext): number
  extract(input: NormalizedInput, ctx: CaptureContext): Promise<Partial<T>>
  validator: VineValidator<T>
  plan(data: T): Promise<Effect[]>
  execute(data: T, trx: TransactionClientContract): Promise<void>
}
```

Routes :

- `POST /capture/preview` → JSON `{ intent, fields, missing, effects, matches }` (appelé en `fetch` avec debounce ~150 ms depuis la palette, **pas** une visite Inertia)
- `POST /capture/commit` → exécute puis `redirect().back()` + flash (appelé via `router.post` Inertia)

Tests : un **corpus de phrases réelles** en tests Japa (`tests/unit/capture/*.spec.ts`) avec l'intent et les champs attendus.

---

## 7. Suggestions de repas (sans LLM)

Moteur de recommandation à base de règles, **explicable** (chaque suggestion affiche son « pourquoi »).

- **Couverture** = part des ingrédients disponibles en quantité suffisante (les `is_staple` sont supposés présents).
- **Bonus anti-gaspillage** si la recette utilise un produit qui périme sous 3 jours.
- **Malus** par ingrédient manquant (plus fort si `is_main`).
- **Substitutions** via `ingredient_substitutions` (« faisable en remplaçant X par Y »).
- **Planification de semaine** : heuristique gloutonne créneau par créneau, chaque choix consomme le stock simulé ; pas deux fois la même recette.
- Import de recettes par URL via le JSON-LD `schema.org/Recipe`, avec étape de rapprochement des ingrédients au catalogue.

Poids et seuils dans un fichier de config (`config/meal_suggestions.ts`), pas en dur.

---

## 8. Conventions de code

- TypeScript **strict** partout, types partagés serveur ↔ client (props Inertia, contrat de la saisie) dans `shared/types/`, importés des deux côtés via `#shared/*` (le serveur ne peut pas importer `inertia/`, projet TS référencé).
- Fichiers en `snake_case` (convention Adonis), composants React en `PascalCase` dans des fichiers `snake_case.tsx`.
- Validation **uniquement** via VineJS ; jamais de logique métier dans les controllers ni dans les composants.
- Montants en centimes côté serveur ; conversion en euros **uniquement** au formatage.
- Requêtes de `views/` optimisées (pas de N+1 : `preload`, agrégations SQL).
- Chaque service métier a ses tests unitaires ; chaque page a au moins un test fonctionnel (rendu Inertia + props).
- Commits petits et ciblés ; ne pas reformater des fichiers sans rapport avec la tâche.

## 9. Commandes utiles

Production : voir `deploy/README.md` (`compose.prod.yaml`, `tailscale serve`, sauvegardes `deploy/backup.sh`).
Versions : chaque push sur `prod` construit et publie l'image (`.github/workflows/release.yml`) ; la version de `package.json` doit avoir sa section dans `CHANGELOG.md` (affiché dans l'app, page « Nouveautés »). Toute évolution visible s'ajoute sous « Non publié ».


```bash
pnpm install
podman compose -f dev.compose.yaml up -d   # Postgres, Redis, MinIO
node ace serve --hmr          # dev
node ace migration:run
node ace db:seed
node ace test                 # Japa
pnpm typecheck && pnpm lint
```

(À ajuster selon le starter kit v7 effectivement généré.)

---

## 10. Feuille de route

1. **Coquille** : auth session, `AppShell` (navigation + palette vide), tokens Tailwind, composants `ui/`, formatage FR.
2. **Budget** : comptes, enveloppes, transactions, page **Argent**.
3. **Auto** + premier intent **`fuel`** de la saisie universelle, fiche **Véhicule**.
4. **Maison** : factures, abonnements, équipements ; intent **`bill`**.
5. **Menu** : recettes, stock, planning, courses ; intents **`meal`** et **`shopping_item`** ; suggestions frigo.
6. Vues transverses **Aujourd'hui**, **Agenda**, **Listes** branchées sur tous les domaines.
7. **V1** (fait) : entrées d'argent et virements, PWA installable, navigation mobile « Plus », déploiement Podman + sauvegardes (`deploy/README.md`), stock frigo/placards et suggestions de repas, import de recettes par URL, saisie universelle des entretiens, relevés et dépenses de travaux.
8. **Journal du jour** (fait, `/journal`) : sources gratuites aux articles courts (sciences, économie, technologie par défaut, `app/domains/news/default_sources.ts`), récupérées chaque heure et gardées 7 jours ; choix quotidien des articles ; une A4 avec chapôs, journée Paper, météo (Open-Meteo), chiffres du foyer, éphéméride et citation, puis jusqu'à 2 pages de textes complets (schema.org `articleBody` ou `<article>`, jamais de contournement de paywall, ni directs ni vidéos). Titres et textes sont ceux des éditeurs, jamais réécrits.
9. Plus tard : planification de la semaine de repas, documents (stockage à choisir), wattmètre par circuit, PWA hors ligne, import bancaire.

---

## 11. Comment travailler sur ce projet (pour Claude Code)

- Lire ce fichier et les fichiers concernés **avant** de modifier quoi que ce soit.
- Respecter la séparation **domaines (serveur) / dimensions (UI)**.
- Proposer un plan court avant toute tâche touchant plusieurs domaines ou le schéma de base.
- Toute nouvelle migration : réversible (`down` implémenté).
- En cas d'ambiguïté produit (libellé, règle de calcul, comportement), **demander** plutôt que supposer.
