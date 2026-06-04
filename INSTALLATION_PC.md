# Lancer le projet SRM-MS sur un PC (Windows)

Guide pas à pas pour installer et démarrer **l’API**, l’**application web** et (optionnel) l’**application mobile** sur un ordinateur Windows.

---

## 1. Prérequis à installer

| Logiciel | Version | Lien |
|----------|---------|------|
| **Git** | récent | https://git-scm.com/download/win |
| **Java JDK** | **17** | https://adoptium.net/ |
| **PostgreSQL** | **14+** (16 OK) | https://www.postgresql.org/download/windows/ |
| **Node.js** | **20 LTS** ou **22** | https://nodejs.org/ |

Vérifier dans PowerShell :

```powershell
git --version
java -version
node -v
npm -v
psql --version
```

**Mobile (optionnel)** : application **Expo Go** sur le téléphone + PC et téléphone sur le **même Wi‑Fi**.

---

## 2. Récupérer le code

```powershell
cd C:\Users\VOTRE_USER\Documents
git clone https://github.com/MariamAQADDAR/SRM-MS.git
cd SRM-MS
```

*(Adapter le chemin et l’URL du dépôt si besoin.)*

---

## 3. Base de données PostgreSQL

1. Ouvrir **pgAdmin** ou `psql`.
2. Créer la base (exemple) :

```sql
CREATE DATABASE srm_mutuelle;
```

3. Noter : **utilisateur**, **mot de passe**, **port** (souvent `5432`).

---

## 4. Backend (API Spring Boot)

### 4.1 Fichier `.env`

```powershell
cd srm-mutuelle-backend
Copy-Item .env.example .env
notepad .env
```

À personnaliser au minimum :

| Variable | Exemple | Rôle |
|----------|---------|------|
| `SERVER_PORT` | `8082` | Port de l’API |
| `DB_URL` | `jdbc:postgresql://localhost:5432/srm_mutuelle` | Connexion PostgreSQL |
| `DB_USERNAME` | `postgres` | Utilisateur DB |
| `DB_PASSWORD` | *votre mot de passe* | Mot de passe DB |
| `JWT_SECRET` | *au moins 32 caractères* | Sécurité JWT |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Autoriser le front web |
| `FRONTEND_BASE_URL` | `http://localhost:5173` | Liens dans les e-mails (mot de passe oublié) |
| `MUTUAL_CARDS_STORAGE_DIR` | `./data/mutual-cards` | Stockage PDF cartes |

**E-mail (mot de passe oublié)** — ajouter dans `.env` si vous testez l’envoi de mails :

```env
SPRING_MAIL_USERNAME=votre.adresse@gmail.com
SPRING_MAIL_PASSWORD=mot_de_passe_application_gmail
```

*(Gmail : compte Google → Sécurité → mots de passe d’application.)*

### 4.2 Démarrer l’API

**Terminal 1** (laisser ouvert) :

```powershell
cd C:\chemin\vers\SRM-MS\srm-mutuelle-backend
.\mvnw.cmd spring-boot:run
```

Premier démarrage : Flyway crée les tables et les données de démo (quelques minutes).

**Vérification** : ouvrir dans le navigateur  
http://localhost:8082/api/health  
→ doit répondre OK.

---

## 5. Application web (React + Vite)

### 5.1 Fichier `.env`

```powershell
cd ..\srm-mutuelle-web
Copy-Item .env.example .env
```

Contenu typique de `.env` :

```env
VITE_API_BASE_URL=http://localhost:8082
```

### 5.2 Démarrer le front

**Terminal 2** (laisser ouvert) :

```powershell
cd C:\chemin\vers\SRM-MS\srm-mutuelle-web
npm install
npm run dev
```

**Interface** : http://localhost:5173

---

## 6. Comptes de démonstration

| Rôle | E-mail | Mot de passe |
|------|--------|--------------|
| Administrateur | `admin@srm-ms.ma` | `admin123` |
| Opérateur | `operateur@srm-ms.ma` | `oper123` |
| Consultateur | `consult@srm-ms.ma` | `cons123` |
| Adhérent | `adherent@srm-ms.ma` | `adh123` |

**Mot de passe oublié** : écran de connexion → lien « Mot de passe oublié » → e-mail si SMTP configuré.

**Chatbot** : icône assistant (web ou mobile) — réponses basées sur vos données (devis, remboursements, cartes mutuelles).

---

## 7. Application mobile (Expo) — optionnel

### 7.1 Adresse de l’API

Le téléphone ne peut pas utiliser `localhost`. Éditer :

`srm-mutuelle-mobile/config.js`

```javascript
export const API_BASE_URL = 'http://IP_DU_PC:8082';
```

**Trouver l’IP du PC** (PowerShell) :

```powershell
ipconfig
```

→ utiliser l’adresse **IPv4** du Wi‑Fi (ex. `192.168.1.25`).

Le port doit être le même que `SERVER_PORT` du backend (`8082` par défaut).

### 7.2 Démarrer Expo

**Terminal 3** :

```powershell
cd C:\chemin\vers\SRM-MS\
npm install
npx expo start --lan
```

Scanner le QR code avec **Expo Go** (même réseau Wi‑Fi que le PC).

**Pare-feu Windows** : autoriser Java (port **8082**) et Node/Expo si la connexion échoue.

---

## 8. Ordre de démarrage (résumé)

```text
1. PostgreSQL (service Windows démarré)
2. Backend  →  .\mvnw.cmd spring-boot:run     (port 8082)
3. Web      →  npm run dev                    (port 5173)
4. Mobile   →  npx expo start --lan           (après config IP dans config.js)
```

---

## 9. Dépannage rapide

| Problème | Solution |
|----------|----------|
| Erreur connexion PostgreSQL | Vérifier `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` dans `srm-mutuelle-backend/.env` |
| Port 8082 déjà utilisé | Changer `SERVER_PORT` dans `.env` backend **et** `VITE_API_BASE_URL` côté web |
| CORS / login web bloqué | Ajouter l’URL du front dans `CORS_ALLOWED_ORIGINS` |
| Mobile « Network request failed » | IP correcte dans `config.js`, même Wi‑Fi, backend démarré, pare-feu |
| E-mail mot de passe non reçu | Configurer `SPRING_MAIL_*` dans `.env` ; vérifier courriers indésirables |
| `npm install` échoue | Node 20+ ; supprimer `node_modules` et relancer `npm install` |

---

## 10. Commandes utiles

```powershell
# Compiler le backend sans le lancer
cd srm-mutuelle-backend
.\mvnw.cmd compile

# Tests backend
.\mvnw.cmd test

# Build production web
cd ..\srm-mutuelle-web
npm run build
```

---

## 11. Sécurité

- **Ne jamais** committer les fichiers `.env` (ils contiennent des secrets).
- En production : changer tous les mots de passe démo, `JWT_SECRET`, et utiliser HTTPS.

Pour plus de détails (RBAC, APK Android, structure du dépôt), voir **[README.md](README.md)**.
