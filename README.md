# Digitall Booster

Structure du projet:

- `index.html`: landing page publique
- `admin.html`: dashboard CMS
- `css/`: feuilles de style
  - `styles.css`: styles de la landing
  - `admin.css`: styles du CMS
- `js/`: scripts front-end
  - `app.js`: rendu dynamique de la landing
  - `admin.js`: logique du dashboard CMS
- `data/`: donnees initiales
  - `content-default.js`: contenu par defaut + configuration theme/navigation/storage
  - `cms-config.js`: configuration backend CMS global (local/supabase)

## CMS V4 global (Supabase)

1. Creer un projet Supabase.
2. Creer la table `site_content`:

```sql
create table if not exists public.site_content (
  id bigint primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);
```

3. Activer RLS puis policies:

```sql
alter table public.site_content enable row level security;

create policy "public read content"
on public.site_content for select
to anon, authenticated
using (true);

create policy "authenticated write content"
on public.site_content for all
to authenticated
using (true)
with check (true);
```

4. Ajouter une ligne initiale:

```sql
insert into public.site_content (id, payload)
values (1, '{}')
on conflict (id) do nothing;
```

5. Renseigner `data/cms-config.js`:
  - `provider: "supabase"`
  - `url`
  - `anonKey`
  - `table` et `rowId` si besoin

6. Dans `admin.html`, se connecter avec un compte Supabase (`email + mot de passe`) pour pouvoir sauvegarder en base.
