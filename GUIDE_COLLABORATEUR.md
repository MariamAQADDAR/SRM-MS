# Guide Collaborateur - SRM Mutuelle

Ce guide résume les étapes pour installer et lancer le projet, ainsi que les solutions aux problèmes courants rencontrés sur Windows.

## 1. Installation Initiale
Après avoir récupéré le code via Git :

### Backend (Java/Spring)
- Assurez-vous d'avoir Java 17 installé.
- Le fichier `.env` dans `srm-mutuelle-backend` doit contenir les identifiants de votre base de données PostgreSQL locale.

### Frontend Web & Mobile
Lancez l'installation des paquets dans les deux dossiers :
```powershell
cd srm-mutuelle-web
npm install

cd ..\srm-mutuelle-mobile
npm install
```

## 2. Configuration Importante (IP Mobile)
Pour que l'application mobile communique avec le backend :
1. Trouvez votre IP locale : `ipconfig` (cherchez "Adresse IPv4" sous Wi-Fi).
2. Ouvrez `srm-mutuelle-mobile/config.js`.
3. Modifiez `API_BASE_URL` avec votre IP (ex: `http://192.168.0.105:8081`).

## 3. Lancement du projet
Ouvrez **3 terminaux séparés** :

**Terminal 1 (Backend) :**
```powershell
cd srm-mutuelle-backend
.\start-backend.ps1
```

**Terminal 2 (Web) :**
```powershell
cd srm-mutuelle-web
npm run dev
```

**Terminal 3 (Mobile) :**
```powershell
cd srm-mutuelle-mobile
npm start
```
*Note : Si Expo demande d'utiliser le port 8082, répondez **Y**. Si il demande de se connecter, choisissez **Proceed anonymously**.*

## 4. Problèmes fréquents (Dépannage)
- **Erreur Git (Unlink failed)** : Fermez VS Code ou tuez les processus `git` avant de faire un pull.
- **Port 8081 déjà utilisé** : Le backend occupe ce port. Assurez-vous qu'une seule instance du backend tourne à la fois.
- **Mobile ne se connecte pas** : Vérifiez que votre téléphone et votre PC sont sur le **MÊME réseau Wi-Fi**.
