# SRM-MS — Mutuelle Marrakech-Safi

Monorepo : **API Spring Boot** (PostgreSQL, JWT, Flyway), **application web** (React + Vite), **application mobile** (Expo / React Native).

Ce dépôt regroupe le travail suivant : **API REST complète**, **contrôle d’accès par rôles (RBAC)**, **notifications** (publications + boîte de réception), **intégration web dynamique** (remplacement des données statiques par l’API), **écrans alignés sur l’ancien système** (devis dentaire, remboursements, ordonnances analyse / ordonnance / radio), **page Paramétrage** pour les listes de « types » (plus de valeurs en dur dans le code), et **confirmations SweetAlert2** sur les actions sensibles.

Pour un guide pas à pas en français, voir aussi **[`GUIDE_UTILISATION.txt`](GUIDE_UTILISATION.txt)**. La matrice des rôles et endpoints : **[`srm-mutuelle-backend/docs/RBAC_MATRIX.md`](srm-mutuelle-backend/docs/RBAC_MATRIX.md)**.

---

## Fonctionnalités principales

| Domaine | Contenu |
|--------|---------|
| **Authentification** | JWT, profil `/api/auth/me`, changement de mot de passe |
| **RBAC** | Rôles hiérarchiques (`@PreAuthorize`, filtrage menu côté web) |
| **Référentiels** | Utilisateurs, agents, bénéficiaires, entités, établissements, maladies spéciales, PEC, etc. |
| **Métier** | Devis, remboursements, ordonnances, cartes mutuelle, statistiques |
| **Notifications** | Centre de publication (brouillon → publier), inbox utilisateur |
| **Paramétrage** | Listes configurables (types devis, ordonnance, radio, soin, établissement, entité, maladie) stockées côté navigateur |
| **UX** | SweetAlert2 pour les confirmations critiques (ex. suppression utilisateur, publication) |

**Note — champs « legacy »** : certaines colonnes ajoutées pour coller aux anciens écrans (dates, scans, observations, etc.) sont **persistées dans le `localStorage` du navigateur** jusqu’à migration éventuelle en base ; le reste du métier passe par l’API et PostgreSQL.

---

## Stack technique

- **Backend** : Java 17, Spring Boot, Spring Security, JPA, Flyway (migrations + jeux de données), PostgreSQL  
- **Frontend** : React, Vite, client API dédié, SweetAlert2  
- **Mobile** : Expo / React Native (optionnel)

---

## Prérequis

| Outil | Version recommandée |
|--------|---------------------|
| [Node.js](https://nodejs.org/) | **20 LTS** ou **22.12+** |
| [Java](https://adoptium.net/) | **17** |
| [PostgreSQL](https://www.postgresql.org/download/) | **14+** (PG **16** : dépendance Flyway `flyway-database-postgresql` incluse dans le `pom.xml`) |
| [Git](https://git-scm.com/) | récent |

**Mobile (optionnel)** : [Expo Go](https://expo.dev/go), même réseau Wi‑Fi que le PC pour `npx expo start --lan`.

---

## Cloner le dépôt

```bash
git clone https://github.com/MariamAQADDAR/SRM-MS.git
cd SRM-MS
```

---

## 1. Base de données PostgreSQL

Créer une base et un utilisateur (adapter nom et mot de passe).

Exemple :

```sql
CREATE DATABASE srm_mutuelle;
-- ou, avec tiret dans le nom :
-- CREATE DATABASE "SRM-MS";

CREATE USER srm_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE srm_mutuelle TO srm_user;
\c srm_mutuelle
GRANT ALL ON SCHEMA public TO srm_user;
```

URL JDBC typique : `jdbc:postgresql://localhost:5432/nom_de_la_base`.

---

## 2. Backend (Spring Boot)

Répertoire : **`srm-mutuelle-backend/`**

### Fichier `.env` (obligatoire en pratique)

- Les secrets et l’URL DB ne doivent **pas** être commités : **`.env` est dans `.gitignore`**.
- Modèle sans secrets sensibles versionné : **`.env.example`** — à copier vers **`.env`**.
- Le fichier `application.properties` importe optionnellement `.env` :  
  `spring.config.import=optional:file:.env[.properties]`

**Windows (PowerShell)** :

```powershell
cd srm-mutuelle-backend
Copy-Item .env.example .env
# Éditer .env : DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET (≥ 32 caractères), CORS_ALLOWED_ORIGINS
```

**Linux / macOS** :

```bash
cd srm-mutuelle-backend
cp .env.example .env
```

Variables importantes (voir commentaires dans `.env.example`) : `SERVER_PORT`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JPA_DDL_AUTO`, `JPA_SHOW_SQL`, `JWT_SECRET`, `JWT_EXPIRATION_MS`, `CORS_ALLOWED_ORIGINS`.

**PostgreSQL 16** : le projet inclut la dépendance Maven `flyway-database-postgresql` pour la compatibilité Flyway.

### Démarrer l’API

**Windows** :

```powershell
cd srm-mutuelle-backend
.\mvnw.cmd spring-boot:run
```

Si le script `start-backend.ps1` existe, il peut charger `.env` automatiquement.

**Linux / macOS** :

```bash
cd srm-mutuelle-backend
chmod +x mvnw
./mvnw spring-boot:run
```

**Vérification** : [http://localhost:8080/api/health](http://localhost:8080/api/health)

**Autre port** : dans `.env`, `SERVER_PORT=8081` (par exemple), puis aligner `VITE_API_BASE_URL` côté frontend.

**Tests** :

```bash
cd srm-mutuelle-backend
./mvnw test    # ou .\mvnw.cmd test sous Windows
```

---

## 3. Application web (React + Vite)

Répertoire : **`srm-mutuelle-web/`**

Créer **`srm-mutuelle-web/.env`** à partir de **`srm-mutuelle-web/.env.example`** :

```env
VITE_API_BASE_URL=http://localhost:8080
```

Puis :

```bash
cd srm-mutuelle-web
npm install
npm run dev
```

Interface : [http://localhost:5173](http://localhost:5173)

Autres commandes : `npm run build`, `npm run preview`, `npm run lint`.

---

## 4. Comptes de démonstration (seed)

Après un premier démarrage réussi (Flyway + initialiseur Java `DevUserDataInitializer`), les comptes suivants sont disponibles : **à réserver au développement / démo**.

| Rôle (résumé) | Email | Mot de passe |
|---------------|-------|--------------|
| Administrateur | `admin@srm-ms.ma` | `admin123` |
| Opérateur | `operateur@srm-ms.ma` | `oper123` |
| Consultateur | `consult@srm-ms.ma` | `cons123` |
| Adhérent | `adherent@srm-ms.ma` | `adh123` |
| Opérateur inactif | `h.moussaoui@srm-ms.ma` | `oper123` |

La page de connexion utilise uniquement **email + mot de passe** (pas de sélecteur de compte démo).

---

## 5. Pages web notables

- **Tableau de bord**, **Bénéficiaires**, **Devis** (filtres et colonnes type ancien écran dentaire), **Remboursements**, **Ordonnances** (vues Analyse / Ordonnance / Radio), **Notifications**, **Profil**
- **Administration** : utilisateurs, etc. selon rôles
- **Paramétrage** : édition des listes de types (stockage navigateur)
- **Communication** (rôles autorisés) : **Centre de publication**

---

## 6. Application mobile (Expo)

Répertoire : **`srm-mutuelle-mobile/`**

Dans `config.js`, utiliser **l’IP locale du PC** (pas `localhost`) et le port du backend.

```bash
cd srm-mutuelle-mobile
npm install
npx expo start --lan
```

---

## URLs habituelles

| Service | URL |
|---------|-----|
| API health | http://localhost:8080/api/health |
| Web (dev) | http://localhost:5173 |

---

## Structure du dépôt

```
SRM-MS/
├── srm-mutuelle-backend/     # Spring Boot, Flyway (db/migration), docs/RBAC_MATRIX.md
├── srm-mutuelle-web/         # React + Vite, api/, config/typeConfig.js
├── srm-mutuelle-mobile/      # Expo + React Native
├── GUIDE_UTILISATION.txt     # Guide utilisateur détaillé (FR)
└── README.md
```

---

## Dépannage rapide

| Problème | Piste |
|----------|--------|
| Authentification PostgreSQL | Vérifier `.env` : URL, utilisateur, mot de passe |
| Flyway / PG 16 | Dépendance `flyway-database-postgresql` déjà dans le projet |
| CORS | `CORS_ALLOWED_ORIGINS` doit inclure l’origine du front (ex. `http://localhost:5173`) |
| Port 8080 occupé | Changer `SERVER_PORT` dans `.env` et `VITE_API_BASE_URL` |
| Variables non prises en compte | Vérifier que `.env` est bien à la racine de `srm-mutuelle-backend` et que `spring.config.import` est actif |

---

## Licence / contexte

Projet **SRM-MS** — usage interne ou démonstration selon le contexte du dépôt.  
**Ne pas committer** de fichiers `.env` contenant de vrais secrets en production.
