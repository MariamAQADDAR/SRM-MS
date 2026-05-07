# Matrice privilèges SRM-MS (UC → API)

Hiérarchie Spring : `ROLE_ADMINISTRATEUR > ROLE_OPERATEUR > ROLE_CONSULTATEUR`.  
`ROLE_ADHERENT` est hors hiérarchie ; accès données limité à `agentId` du porteur.

## Expressions `@PreAuthorize` standard

| Expression | Usage |
|------------|--------|
| `hasRole('ADMINISTRATEUR')` | Gestion utilisateurs, suppression dure, publication notifications (option) |
| `hasAnyRole('ADMINISTRATEUR','OPERATEUR')` | CRUD métier (agents, bénéficiaires, ordonnances, devis, remboursements, référentiels, brouillons notifications) |
| `hasAnyRole('ADMINISTRATEUR','OPERATEUR','CONSULTATEUR')` | Lecture listes / détail + statistiques |
| `hasRole('ADHERENT')` | Endpoints espace adhérent (profil, mot de passe, données filtrées par agent) |

## Ressources HTTP (préfixe `/api`)

- **Auth** : `POST /api/auth/login` (public), `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/change-password` (authentifié).
- **Utilisateurs** : `/api/admin/users` — CRUD + PATCH actif (admin uniquement).
- **Agents** : `/api/agents` — GET (staff + adhérent restreint), POST/PUT/DELETE (admin + opérateur).
- **Bénéficiaires** : `/api/beneficiaries` — idem + filtre `agentId`.
- **Ordonnances** : `/api/ordonnances` — GET large ; POST/PUT/PATCH/DELETE (admin + opérateur) ; adhérent : GET filtré `agentId`.
- **Devis** : `/api/quotes` + transitions `.../submit`, `.../approve`, `.../reject`, `.../scan` (admin + opérateur pour mutations ; adhérent : création/lecture sur son agent).
- **Remboursements** : `/api/reimbursements` + `.../validate`, `.../close`.
- **PEC / maladies** : `/api/care-episodes`, `/api/special-diseases`.
- **Établissements / médecins / médicaments** : `/api/medical-facilities`, `/api/contracted-doctors`, `/api/medicines`.
- **Entités org.** : `/api/organizational-entities`.
- **Cartes mutuelles** : `/api/mutual-cards` (+ téléchargement placeholder).
- **Statistiques** : `/api/stats/summary` (consultateur et au-dessus).
- **Notifications boîte** : `GET /api/notifications`, `PATCH /api/notifications/{id}/read`, `GET /api/notifications/unread-count`.
- **Notifications campagnes** : `GET/POST/PATCH /api/notification-broadcasts`, `POST .../{id}/publish` (staff ; publish réservé admin si politique stricte — ici admin + opérateur).

Portée **exclue** : gestion / upload de logos (assets statiques uniquement).
