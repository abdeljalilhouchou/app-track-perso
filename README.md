# track.perso

App web pour suivre tes **habitudes**, ton **sport** et ton **humeur** — avec comptes
utilisateurs, visualisations (carte façon GitHub, graphiques hebdomadaires) et un insight
automatique qui compare ton humeur les jours de sport vs les jours de repos.

Stack : Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (auth + Postgres).

## Mise en route

### 1. Crée un projet Supabase

1. Va sur [supabase.com](https://supabase.com), crée un compte et un nouveau projet (gratuit).
2. Dans **Project Settings > API**, récupère l'**URL** du projet et la clé **anon public**.
3. Dans **SQL Editor**, colle et exécute le contenu de [`supabase/schema.sql`](supabase/schema.sql).
   Ça crée les tables `profiles`, `habits`, `habit_logs`, `workouts`, `mood_entries`, avec les
   règles de sécurité (Row Level Security) : chaque utilisateur ne voit que ses propres données.
4. Dans **Authentication > Settings**, tu peux désactiver la confirmation par email pour tester
   plus vite (sinon il faudra confirmer via le lien reçu par email).

### 2. Configure les variables d'environnement

Copie `.env.local.example` en `.env.local` et remplis avec tes valeurs Supabase :

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. Lance l'application

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000). Crée un compte, et c'est parti.

## Structure du projet

```
src/
  app/
    (app)/          # Routes protégées (dashboard, habits, sport, humeur) + layout avec sidebar
    login/ signup/   # Pages d'authentification
    auth/callback/   # Callback de confirmation email Supabase
  components/        # Composants UI (heatmap, graphiques, cartes)
  lib/
    actions/         # Server actions (create/toggle/delete...)
    supabase/        # Clients Supabase (browser, server, middleware)
  types/database.ts  # Types TypeScript de la base de données
supabase/schema.sql   # Schéma SQL + politiques RLS à exécuter sur Supabase
```

## Fonctionnalités

- **Habitudes** : créer des habitudes, cocher le jour, voir sa série (streak) et une carte de
  chaleur des 18 dernières semaines, façon GitHub.
- **Sport** : logger une séance (activité, durée, intensité), graphique du volume hebdomadaire.
- **Humeur** : noter humeur + énergie chaque jour, courbe des 30 derniers jours.
- **Dashboard** : vue d'ensemble avec les stats clés et un insight qui compare automatiquement
  l'humeur moyenne les jours de sport vs les jours sans sport.
- Chaque utilisateur ne voit que ses propres données (Row Level Security Supabase).
