# SRM-MS — Mutuelle Marrakech-Safi

Monorepo : **API Spring Boot** (PostgreSQL), **application web** (React + Vite), **application mobile** (Expo / React Native).

## Prérequis

| Outil | Version recommandée |
|--------|---------------------|
| [Node.js](https://nodejs.org/) | **20 LTS** ou **22.12+** (pour éviter les avertissements ESLint / Vite) |
| [Java](https://adoptium.net/) | **17** |
| [PostgreSQL](https://www.postgresql.org/download/) | 14+ |
| [Git](https://git-scm.com/) | récent |

**Mobile (optionnel)** : [Expo Go](https://expo.dev/go) sur le téléphone, même réseau Wi‑Fi que le PC pour le mode `--lan`.

---

## Cloner le dépôt

```bash
git clone https://github.com/MariamAQADDAR/SRM-MS.git
cd SRM-MS
```

---

## 1. Base de données PostgreSQL

Créer une base et un utilisateur (adapter nom et mot de passe).

Exemple avec une base nommée `srm_mutuelle` (sans tiret, plus simple en SQL) :

```sql
CREATE DATABASE srm_mutuelle;
-- ou, si vous utilisez un nom avec tiret :
-- CREATE DATABASE "SRM-MS";

CREATE USER srm_user WITH PASSWORD 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON DATABASE srm_mutuelle TO srm_user;
-- Pour PostgreSQL 15+ : donner les droits sur le schéma public si besoin
\c srm_mutuelle
GRANT ALL ON SCHEMA public TO srm_user;
```

Noter l’URL JDBC : `jdbc:postgresql://localhost:5432/nom_de_la_base`.

---

## 2. Backend (Spring Boot)

Répertoire : `srm-mutuelle-backend/`

### Fichier `.env` — rôle et sécurité

- Le backend lit la **base PostgreSQL** et le **port** via des variables d’environnement, alignées sur `application.properties`.
- Le fichier **`.env`** contient des **secrets** (mot de passe DB). Il est **exclu de Git** (`.gitignore`). Seul **`.env.example`** est versionné, comme modèle sans mot de passe réel sensible.
- **Ne jamais** pousser `.env` sur GitHub. Chaque développeur / serveur copie `.env.example` → `.env` puis adapte les valeurs.

### Créer votre `.env`

**Windows (cmd)** :

```bat
cd srm-mutuelle-backend
copy .env.example .env
```

**Linux / macOS** :

```bash
cd srm-mutuelle-backend
cp .env.example .env
```

Ouvrir `.env` dans un éditeur et remplacer au minimum **`DB_PASSWORD`**, et si besoin **`DB_URL`**, **`DB_USERNAME`**, **`SERVER_PORT`**.

Les lignes commençant par `#` sont des commentaires. Le script Windows `start-backend.ps1` les ignore.

### Détail de chaque variable

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `SERVER_PORT` | Non | Port HTTP de l’API. Défaut Spring si absent : **8080**. |
| `DB_URL` | Non* | URL JDBC PostgreSQL : `jdbc:postgresql://HÔTE:PORT/NOM_BASE`. Ex. local : `jdbc:postgresql://localhost:5432/srm_mutuelle`. *Si absent, la valeur par défaut dans `application.properties` est utilisée. |
| `DB_USERNAME` | Non* | Utilisateur PostgreSQL (ex. `postgres` ou utilisateur dédié). *Défaut : `postgres`. |
| `DB_PASSWORD` | Non* | Mot de passe de l’utilisateur DB. *Défaut dans le code : `postgres` — **à changer** sur une vraie machine. |
| `JPA_DDL_AUTO` | Non | Comportement Hibernate sur les tables : **`update`** (recommandé en dev : met à jour le schéma sans tout supprimer). Autres : `none`, `validate`, `create`, `create-drop`. |
| `JPA_SHOW_SQL` | Non | `true` = afficher les SQL dans la console (pratique en dev) ; `false` en production. |

**Base PostgreSQL dont le nom contient un tiret** (ex. `SRM-MS`) : créer la base avec des guillemets en SQL, puis dans `DB_URL` utiliser le même nom, par exemple :

`DB_URL=jdbc:postgresql://localhost:5432/SRM-MS`

(adaptez si votre instance exige une casse ou un encodage différent).

### Exemple de `.env` complet (valeurs fictives)

```env
SERVER_PORT=8080
DB_URL=jdbc:postgresql://localhost:5432/srm_mutuelle
DB_USERNAME=postgres
DB_PASSWORD=MonMotDePasseSecurise
JPA_DDL_AUTO=update
JPA_SHOW_SQL=true
```

### Démarrer l’API **sans** `start-backend.ps1` (Linux / macOS, ou variables manuelles)

Le script `start-backend.ps1` charge `.env` automatiquement sous Windows. Ailleurs, exportez les variables **avant** `mvnw`, ou utilisez votre IDE pour les définir.

Exemple **bash** (une ligne par variable, sans fichier `.env` lu par Maven — export manuel) :

```bash
cd srm-mutuelle-backend
export SERVER_PORT=8080
export DB_URL=jdbc:postgresql://localhost:5432/srm_mutuelle
export DB_USERNAME=postgres
export DB_PASSWORD=votre_mot_de_passe
export JPA_DDL_AUTO=update
export JPA_SHOW_SQL=true
./mvnw spring-boot:run
```

### Démarrer l’API

**Windows (PowerShell)** — charge automatiquement `.env` puis lance Maven :

```powershell
cd srm-mutuelle-backend
.\start-backend.ps1
```

**Sans script** (après avoir défini les variables dans le terminal, ou avec les valeurs par défaut de `application.properties`) :

```bash
cd srm-mutuelle-backend
# Windows
.\mvnw.cmd spring-boot:run

# Linux / macOS
chmod +x mvnw
./mvnw spring-boot:run
```

**Vérification** : ouvrir [http://localhost:8080/api/health](http://localhost:8080/api/health) — la réponse doit confirmer que le service est joignable (et la base, si tout est bien configuré).

---

## 3. Application web (Node / Vite / React)

Répertoire : `srm-mutuelle-web/`

```bash
cd srm-mutuelle-web
npm install
npm run dev
```

L’interface démarre en général sur [http://localhost:5173](http://localhost:5173).

Autres commandes utiles :

```bash
npm run build      # build de production → dossier dist/
npm run preview    # prévisualiser le build localement
npm run lint       # ESLint
```

**Note (Windows / Rolldown)** : si une erreur liée à un binding natif apparaît, réinstaller les dépendances ou installer le paquet `@rolldown/binding-win32-x64-msvc` comme indiqué par le message d’erreur.

---

## 4. Application mobile (Expo / React Native)

Répertoire : `srm-mutuelle-mobile/`

### API depuis le téléphone

Le fichier `config.js` doit pointer vers **l’adresse IP locale du PC** (pas `localhost`), sur le **même port que le backend** (souvent `8080`), pour que le téléphone puisse joindre l’API :

```js
export const API_BASE_URL = 'http://192.168.x.x:8080';
```

Remplacer `192.168.x.x` par l’IPv4 du PC (invite de commande : `ipconfig` sous Windows).

### Commandes

```bash
cd srm-mutuelle-mobile
npm install
npx expo start --lan
```

Scanner le QR code avec **Expo Go** (Android / iOS). Préférer `--lan` sur le même Wi‑Fi que le PC ; le mode tunnel peut échouer selon le réseau.

Scripts npm :

```bash
npm start          # équivalent à expo start
npm run android
npm run ios
npm run web
```

---

## Récap des URLs

| Service | URL habituelle |
|---------|----------------|
| API health | http://localhost:8080/api/health |
| Web (dev) | http://localhost:5173 |

---

## Structure du dépôt

```
SRM-MS/
├── srm-mutuelle-backend/   # Spring Boot, Maven, PostgreSQL
├── srm-mutuelle-web/       # React + Vite + Font Awesome
├── srm-mutuelle-mobile/    # Expo + React Native
└── README.md
```

---

## Dépannage rapide

- **PostgreSQL : authentication failed** — vérifier utilisateur, mot de passe et `DB_URL` dans `.env`.
- **Mobile : backend inaccessible** — firewall Windows, bonne IP dans `config.js`, backend démarré, même Wi‑Fi.
- **Node : EBADENGINE** — mettre à jour Node vers une version supportée par les paquets (voir tableau des prérequis).

---

## Licence / projet

Projet SRM-MS — usage interne / démonstration selon le contexte du dépôt.
