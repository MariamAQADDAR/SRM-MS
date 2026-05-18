# Guide collaboration GitHub + import des données (JSON)

Ce document est pour **toi (push)** et **ton collègue (pull + base de données)** sur le projet **SRM-MS**.

Fichier de données : [`data/srm-ms-donnees-reference.json`](../data/srm-ms-donnees-reference.json)

---

## 1. Toi — avant le push sur GitHub

### 1.1 Vérifications

- [ ] Aucun fichier **`.env`** dans le commit (secrets) — seulement `.env.example`.
- [ ] Pas de mots de passe de production dans le code ou la doc.
- [ ] Le backend compile : `cd srm-mutuelle-backend` puis `.\mvnw.cmd compile` (Windows) ou `./mvnw compile` (Mac/Linux).
- [ ] Optionnel : le front démarre (`cd srm-mutuelle-web` → `npm install` → `npm run dev`).

### 1.2 Commandes Git (exemple)

```powershell
cd D:\marieme\SRM-MS
git status
git add .
git commit -m "Fonctionnalités devis/PEC, notifications admin, données JSON de référence"
git push origin main
```

*(Remplacer `main` par le nom de ta branche si besoin : `master`, `develop`, etc.)*

### 1.3 Message pour ton collègue

Tu peux lui envoyer :

> J’ai poussé sur GitHub. Fais un `git pull`, suis `docs/GUIDE_PUSH_PULL_ET_IMPORT_JSON.md`, crée ta base PostgreSQL et lance le backend une fois. Le fichier `data/srm-ms-donnees-reference.json` décrit les tables ; tu peux compléter les tableaux vides (`quotes`, etc.) ou saisir directement dans l’application web.

---

## 2. Ton collègue — après le `git pull`

### 2.1 Récupérer le code

```bash
git clone https://github.com/MariamAQADDAR/SRM-MS.git
cd SRM-MS
```

Ou, si le dépôt existe déjà :

```bash
cd SRM-MS
git pull origin main
```

### 2.2 Prérequis

| Outil        | Version      |
|-------------|--------------|
| Java        | 17           |
| PostgreSQL  | 14+ (16 OK)  |
| Node.js     | 20 LTS ou 22 |
| Git         | récent       |

### 2.3 Créer la base PostgreSQL

```sql
CREATE DATABASE srm_mutuelle;
-- Utilisateur (adapter mot de passe) :
CREATE USER srm_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE srm_mutuelle TO srm_user;
\c srm_mutuelle
GRANT ALL ON SCHEMA public TO srm_user;
```

### 2.4 Fichier `.env` backend

```powershell
cd srm-mutuelle-backend
Copy-Item .env.example .env
```

Éditer `.env` (minimum) :

```env
SERVER_PORT=8082
DB_URL=jdbc:postgresql://localhost:5432/srm_mutuelle
DB_USERNAME=srm_user
DB_PASSWORD=votre_mot_de_passe
JWT_SECRET=changez-moi-minimum-32-caracteres!!
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 2.5 Fichier `.env` frontend web

```powershell
cd ..\srm-mutuelle-web
Copy-Item .env.example .env
```

Contenu typique :

```env
VITE_API_BASE_URL=http://localhost:8082
```

### 2.6 Démarrer l’API (recommandé — schéma + seed automatiques)

```powershell
cd srm-mutuelle-backend
.\mvnw.cmd spring-boot:run
```

Au **premier** démarrage :

1. **Flyway** exécute les migrations `V1` à `V10` (tables + données de référence V2).
2. **`DevUserDataInitializer`** crée les comptes de démo si la table `app_users` est vide.

Vérifier : [http://localhost:8082/api/health](http://localhost:8082/api/health)

### 2.7 Démarrer le front

```powershell
cd srm-mutuelle-web
npm install
npm run dev
```

Ouvrir : [http://localhost:5173](http://localhost:5173)

### 2.8 Comptes de connexion (démo)

| Rôle            | Email                 | Mot de passe |
|-----------------|-----------------------|--------------|
| Administrateur  | admin@srm-ms.ma       | admin123     |
| Opérateur       | operateur@srm-ms.ma   | oper123      |
| Consultateur    | consult@srm-ms.ma     | cons123      |
| Adhérent        | adherent@srm-ms.ma    | adh123       |

L’adhérent est lié à l’agent **AGT-001** (Youssef Benali).

---

## 3. Utiliser le fichier JSON

Le fichier [`data/srm-ms-donnees-reference.json`](../data/srm-ms-donnees-reference.json) contient :

- **`_meta`** : ordre d’import, règles, types de notifications.
- **Données de référence** : entités, agents (après migration V6), bénéficiaires, établissements, médicaments, paramétrage des types.
- **Tableaux vides** à compléter : `quotes`, `ordonnances`, `reimbursements`, `care_episodes`, `notifications`, etc.
- **`_exemples_a_remplir`** : modèles (devis **Soumis**, notification admin **DEVIS_A_TRAITER**, PEC, remboursement).

### 3.1 Méthode A — la plus simple (recommandée)

Ne pas importer le JSON à la main :

1. Lancer le backend (Flyway remplit déjà le référentiel).
2. Se connecter en **adhérent** → page **Devis** → déposer un PDF → **Envoyer à la mutuelle**.
3. Se connecter en **admin** → cloche **Notifications** : message *« Devis à traiter »*.

Les notifications **adhérent** et **admin/opérateur** sont créées par l’**API**, pas besoin d’INSERT SQL.

### 3.2 Méthode B — compléter le JSON puis insérer en SQL

Ordre obligatoire (clés étrangères) — voir aussi `_meta.ordre_import` dans le JSON :

1. `organizational_entities`
2. `agents`
3. `beneficiaries`
4. `medical_facilities` → `contracted_doctors`, `medicines`
5. `app_type_config` (mise à jour des listes de types)
6. `mutual_cards`
7. `quotes`, `ordonnances`, `reimbursements`, `care_episodes`, `special_disease_declarations`
8. `notifications` (nécessite `app_users` existants)

**Ne pas** insérer `app_users` à la main sauf expert : les mots de passe sont hashés (BCrypt). Utiliser le **1er démarrage backend** pour les comptes démo.

#### Exemple INSERT — devis à traiter (après comptes créés)

```sql
INSERT INTO quotes (
  numero, quote_type, quote_date, agent_id, beneficiaire,
  montant, taux, etat, scanned, dentist_name, deposit_date, sent_date
) VALUES (
  'DEV-2026-001', 'Dentaire', '2026-05-18', 1, 'Youssef Benali',
  3500.00, 50, 'Soumis', false, 'Dr. Alaoui', '2026-05-18', '2026-05-18'
);
```

Pour une notification admin **manuelle** (test uniquement) :

```sql
INSERT INTO notifications (app_user_id, notif_type, read_flag, body, created_at)
SELECT id, 'DEVIS_A_TRAITER', false,
       'Devis à traiter — n° DEV-2026-001 (Dentaire, Benali).', NOW()
FROM app_users WHERE email = 'admin@srm-ms.ma';
```

En usage normal, cette ligne est créée **automatiquement** quand l’adhérent envoie le devis (`POST /api/quotes/{id}/submit`).

#### Mettre à jour les types de devis (paramétrage)

```sql
UPDATE app_type_config
SET values_json = '["Dentaire", "Optique", "Auditif", "Hospitalisation", "Autre"]'::jsonb
WHERE config_key = 'quoteTypes';
```

### 3.3 Méthode C — base vide puis tout depuis le JSON

Si la base est **totalement vide** et que Flyway n’a pas encore tourné :

1. Lancer quand même le backend une fois (Flyway + comptes).
2. Compléter les tableaux dans le JSON.
3. Générer des `INSERT` depuis le JSON (outil maison, DBeaver, ou script) en respectant l’ordre de la section 3.2.

---

## 4. Fonctionnalités récentes à tester ensemble

| Fonction | Qui teste | Résultat attendu |
|----------|-----------|------------------|
| Devis multi-types (Dentaire, Optique, …) | Adhérent | Dépôt PDF + types au choix |
| Envoi mutuelle | Adhérent | État **Soumis** |
| Notification admin | Admin / Opérateur | Type `DEVIS_A_TRAITER` dans la cloche |
| Badge menu Devis (staff) | Admin | Nombre de devis **Soumis** |
| Prise en charge (PEC) | Adhérent + staff | Demande 3 étapes, validation avec taux |
| Notifications adhérent | Adhérent | Étapes dépôt / envoi devis |

---

## 5. Dépannage rapide

| Problème | Solution |
|----------|----------|
| `Connection refused` API | Backend démarré ? Port `8082` dans `.env` et `VITE_API_BASE_URL` |
| Erreur Flyway | Base vide ou backup ; vérifier version PostgreSQL |
| Pas de comptes | Table `app_users` vide → redémarrer backend (initializer) |
| CORS | Ajouter l’URL du front dans `CORS_ALLOWED_ORIGINS` |
| Port 8082 occupé | Changer `SERVER_PORT` et mettre à jour le front |

---

## 6. Structure des fichiers utiles

```
SRM-MS/
├── data/
│   └── srm-ms-donnees-reference.json   ← données / exemples
├── docs/
│   └── GUIDE_PUSH_PULL_ET_IMPORT_JSON.md  ← ce guide
├── srm-mutuelle-backend/
│   ├── .env.example
│   └── src/main/resources/db/migration/   ← schéma Flyway V1–V10
└── srm-mutuelle-web/
    └── .env.example
```

---

*Dernière mise à jour : mai 2026 — équipe SRM-MS.*
