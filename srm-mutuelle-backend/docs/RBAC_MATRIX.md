# Matrice privilèges SRM-MS (UC → API)

Cahier des charges technique complet (modèles, RBAC, endpoints) : **[CAHIER_DES_CHARGES_TECHNIQUE_SRM_MS.md](../../docs/CAHIER_DES_CHARGES_TECHNIQUE_SRM_MS.md)**.

Hiérarchie Spring : `ROLE_ADMINISTRATEUR > ROLE_OPERATEUR > ROLE_CONSULTATEUR`.  
`ROLE_ADHERENT` est hors hiérarchie ; accès données limité à `agentId` du porteur.

## Expressions `@PreAuthorize` standard

| Expression | Usage |
|------------|--------|
| `hasRole('ADMINISTRATEUR')` | **Suppressions HTTP `DELETE` métier**, cas réservés admin |
| `hasAnyRole('ADMINISTRATEUR','OPERATEUR')` | Création / mise à jour métier (sans `DELETE`), **gestion utilisateurs** `/api/admin/users` |
| `hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR')` | Lecture listes / détail + statistiques |
| `hasRole('ADHERENT')` | Endpoints espace adhérent (profil, mot de passe, données filtrées par agent) |

## Ressources HTTP (préfixe `/api`)

- **Auth** : `POST /api/auth/login` (public), `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/change-password` (authentifié).
- **Utilisateurs** : `/api/admin/users` — lecture + création / mise à jour / PATCH actif pour **administrateur et opérateur** ; **suppression** et toute action sur un compte **ADMINISTRATEUR** (création, édition, activer/désactiver) **réservées à l’administrateur** ; l’opérateur ne peut pas non plus attribuer le rôle administrateur.
- **Agents** : `/api/agents` — GET (staff + adhérent restreint), POST/PUT (admin + opérateur), **DELETE (admin uniquement)**.
- **Bénéficiaires** : `/api/beneficiaries` — idem + filtre `agentId`.
- **Ordonnances** : `/api/ordonnances` — GET large ; POST/PUT (admin + opérateur) ; **DELETE admin** ; adhérent : GET filtré `agentId`.
- **Devis** : `/api/quotes` + `POST .../submit`, `.../approve`, `.../reject`, `.../scan` (admin + opérateur pour mutations staff ; adhérent : création, envoi `submit`, lecture sur son agent) ; **DELETE admin**.
- **Remboursements** : `/api/reimbursements` + `.../validate`, `.../close` ; **DELETE admin**. Notifications boîte adhérent créées sur validation / clôture.
- **PEC / maladies** : `/api/care-episodes`, `/api/special-diseases` — **DELETE admin**.
- **Établissements / médecins / médicaments** : `/api/medical-facilities`, `/api/contracted-doctors`, `/api/medicines` — **DELETE admin**.
- **Entités org.** : `/api/organizational-entities` — **DELETE admin**.
- **Cartes mutuelles** : `/api/mutual-cards` — création déclenche **génération PDF** (fichier sous `app.mutual-cards.storage-dir`) ; `GET .../download` renvoie le PDF (`application/pdf`).
- **Statistiques** : `/api/stats/summary` (consultateur et au-dessus).
- **Notifications boîte** : `GET /api/notifications`, `PATCH /api/notifications/{id}/read`, `GET /api/notifications/unread-count`.
- **Notifications campagnes** : `GET/POST/PATCH /api/notification-broadcasts`, `POST .../{id}/publish` (staff ; publish réservé admin si politique stricte — ici admin + opérateur).

Portée **exclue** : gestion / upload de logos (assets statiques uniquement).
