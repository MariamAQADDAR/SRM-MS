# Cahier des charges technique — SRM-MS (Mutuelle)

**Usage :** copier-coller ce document (intégralement ou par section) dans un prompt Cursor pour guider l’implémentation ou l’extension du backend / full-stack **sans ambiguïté** sur les modèles, le RBAC et les endpoints.

**Stack de référence du dépôt actuel :**

| Couche | Technologie |
|--------|-------------|
| API | Spring Boot 3, Java, REST `/api`, JWT (stateless) |
| Persistance | PostgreSQL, JPA/Hibernate, Flyway (`db/migration`) |
| Sécurité | Spring Security, `@PreAuthorize`, hiérarchie de rôles |
| Front | React + Vite (`srm-mutuelle-web`) |

> Les spécifications UML mentionnent parfois `ROLE_ADMIN`, `ROLE_OPERATEUR`, etc. Dans ce projet, les autorités Spring sont **`ROLE_` + nom de l’énumération** `AppUserRole` (`ADMINISTRATEUR`, `OPERATEUR`, `CONSULTATEUR`, `ADHERENT`).

---

## 1. Correspondance rôles (spécification ↔ code)

| Spécification / UML | Enum Java `AppUserRole` | Autorité Spring |
|---------------------|-------------------------|-----------------|
| ROLE_ADMIN | `ADMINISTRATEUR` | `ROLE_ADMINISTRATEUR` |
| ROLE_OPERATEUR | `OPERATEUR` | `ROLE_OPERATEUR` |
| ROLE_CONSULTATEUR | `CONSULTATEUR` | `ROLE_CONSULTATEUR` |
| ROLE_ADHERENT | `ADHERENT` | `ROLE_ADHERENT` |

**Hiérarchie métier (hors adhérent) :**  
`ADMINISTRATEUR` > `OPERATEUR` > `CONSULTATEUR` (voir `SecurityConfig` — `RoleHierarchyImpl`).

**Adhérent :** pas dans la hiérarchie staff ; accès **borné par `agentId`** lié au compte utilisateur (`AppUser.agent`).

---

## 2. RBAC — règles normatives (à respecter pour toute évolution)

### 2.1 `ADMINISTRATEUR`

- **CRUD complet** sur tous les modules métier exposés par l’API.
- **Seul rôle** autorisé pour :
  - suppression **dure** des ressources utilisateur (`DELETE /api/admin/users/{id}`) ;
  - gestion centralisée des comptes (`/api/admin/users` : création, mise à jour, activation/désactivation).
- Peut tout ce que l’opérateur peut faire (y compris DELETE métier si la politique produit l’autorise).

### 2.2 `OPERATEUR`

- Même périmètre fonctionnel que l’admin sur les **modules opérationnels** (agents, bénéficiaires, devis, remboursements, ordonnances, référentiels médicaux, PEC, maladies, entités, cartes, brouillons notifications, etc.) : **Create, Read, Update**.
- **Interdiction formelle du DELETE** au niveau global pour l’opérateur : toute méthode `DELETE` REST sur entité métier doit être refusée (`403`) sauf si une exception métier documentée impose un « soft delete » via `PATCH` uniquement.
  - *Implémentation dépôt :* les `@DeleteMapping` métier sont en `hasRole('ADMINISTRATEUR')` ; les services `delete(...)` appellent `AccessRules.assertAdmin(user)`.

### 2.3 `CONSULTATEUR`

- **Lecture seule** : principalement `GET` (listes, détail, agrégats).
- Périmètre : tableaux de bord / statistiques, listes agents, remboursements (filtres), devis, ordonnances, entités, cartes (lecture), référentiels en lecture, notifications (lecture), etc.
- **Aucune** mutation métier (`POST` / `PUT` / `PATCH` / `DELETE`) hors exceptions explicitement prévues (ex. marquer une notification lue si considéré comme non sensible).

### 2.4 `ADHERENT` (Espace adhérent)

- Accès **uniquement aux données rattachées à son `agentId`** (filtrage systématique côté service, pas seulement le front).
- Fonctions typiques : profil / mot de passe, ses remboursements, ses devis (création / suivi selon règles métier), sa carte mutuelle (téléchargement), médicaments remboursables en **lecture seule**, notifications le concernant, chatbot (voir front `ChatbotPage` / widget).

### 2.5 Auth publique / authentifiée

| Endpoint | Accès |
|----------|--------|
| `POST /api/auth/login` | Public |
| `GET /api/auth/me`, `POST /api/auth/change-password` | Authentifié (tous rôles selon cas) |
| `GET /api/health` | Public (contrôle santé) |

Documentation complémentaire : `docs/RBAC_MATRIX.md`.

---

## 3. Modèles de données (entités JPA principales)

Préfixe package : `ma.srm.mutuelle.domain`.

| Module conceptuel | Entité Java | Table (indicatif) | Relations / remarques |
|-------------------|-------------|-------------------|------------------------|
| Auth & utilisateurs | `AppUser` | `app_users` | `role` (`AppUserRole`), `active`, lien optionnel `agent` |
| Agents | `Agent` | `agents` | Porteur mutuelle |
| Bénéficiaires | `Beneficiary` | `beneficiaries` | Lié à un `Agent` |
| Carte mutuelle | `MutualCard` | `mutual_cards` | Lié adhérent / agent |
| Remboursement | `Reimbursement` | `reimbursements` | Statuts métier : en attente, validé, clôturé (à mapper sur enums / colonnes Flyway) |
| Devis | `Quote` | `quotes` | Document scanné, statut, montants, etc. |
| Médical | `Ordonnance` | `ordonnances` | |
| Référentiel | `Medicine` | `medicines` | Médicaments remboursables |
| Référentiel | `ContractedDoctor` | `contracted_doctors` | Médecins conventionnés |
| Référentiel | `MedicalFacility` | `medical_facilities` | Établissements |
| PEC | `CareEpisode` | `care_episodes` | Prises en charge |
| Maladies spéciales | `SpecialDiseaseDeclaration` | `special_disease_declarations` | |
| Organisation | `OrganizationalEntity` | `organizational_entities` | |
| Notifications | `Notification` | `notifications` | Boîte adhérent / utilisateur |
| Campagnes | `NotificationBroadcast` | `notification_broadcasts` | Brouillon / publication |
| Paramétrage types | `AppTypeConfigEntry` | `app_type_config_entries` | Listes configurables (API dédiée) |

Schéma exact : migrations Flyway sous `src/main/resources/db/migration`.

---

## 4. Fonctionnalités & endpoints (REST cible)

Préfixe global : **`/api`**. Les chemins ci-dessous sont ceux du **backend Spring actuel** ; compléter selon ce cahier des charges (ex. `POST .../submit` pour devis si absent).

### Module 1 — Auth & gestion des utilisateurs

| Action | Méthode & chemin | Rôles |
|--------|------------------|-------|
| Login / token | `POST /api/auth/login` | Public |
| Profil JWT | `GET /api/auth/me` | Authentifié |
| Changer mot de passe | `POST /api/auth/change-password` | Authentifié |
| Lister / CRUD utilisateurs | `/api/admin/users` | **ADMINISTRATEUR** uniquement (`UserAdminController`) |
| Supprimer utilisateur | `DELETE /api/admin/users/{id}` | **ADMINISTRATEUR** uniquement |
| Activer / désactiver | `PATCH` (selon implémentation DTO) | **ADMINISTRATEUR** |

### Module 2 — Agents & bénéficiaires

| Ressource | Base path | Mutations (CRUD) |
|-----------|-----------|------------------|
| Agents | `/api/agents` | `POST`, `PUT`, `DELETE` — spéc : **DELETE réservé ADMIN** après alignement RBAC |
| Bénéficiaires | `/api/beneficiaries` | Idem |

**Lecture :** `ADMINISTRATEUR`, `OPERATEUR`, `CONSULTATEUR`, `ADHERENT` (adhérent filtré par `agentId`).

### Module 3 — Cartes mutuelles

| Action | Endpoint | Rôles |
|--------|----------|-------|
| Lister | `GET /api/mutual-cards` | Staff + adhérent (scope) |
| Par agent | `GET /api/mutual-cards/by-agent/{agentId}` | Idem |
| Créer / assurer carte | `POST /api/mutual-cards` | `ADMINISTRATEUR`, `OPERATEUR`, `ADHERENT` (règles métier) |
| Téléchargement PDF | `GET /api/mutual-cards/by-agent/{agentId}/download` | Réponse actuelle : **placeholder** JSON — **cible spec :** génération PDF réelle (fichier stocké disque/S3) **déclenchée à la création** (`<<include>>` UML). |

### Module 4 — Remboursements

| Action | Endpoint | Rôles mutation |
|--------|----------|----------------|
| CRUD de base | `GET/POST/PUT/DELETE /api/reimbursements` | Mutations : staff ; **DELETE opérateur à retirer** si conformité stricte |
| Valider | `POST /api/reimbursements/{id}/validate` | `ADMINISTRATEUR`, `OPERATEUR` |
| Clôturer | `POST /api/reimbursements/{id}/close` | Idem |

**Événement `<<extend>>` (cible) :** à chaque passage à **Validé** ou **Clôturé**, déclencher **`NotifierAdherent`** (email, push, ou création `Notification` en base) — **à implémenter ou renforcer** dans `ReimbursementService` si absent.

### Module 5 — Devis

| Action | Endpoint | Rôles |
|--------|----------|-------|
| Lister / détail | `GET /api/quotes`, `GET /api/quotes/{id}` | Staff + adhérent (scope) |
| Créer | `POST /api/quotes` | `ADMINISTRATEUR`, `OPERATEUR`, `ADHERENT` |
| Mettre à jour | `PUT /api/quotes/{id}` | Staff |
| Supprimer | `DELETE /api/quotes/{id}` | Spéc : **ADMIN seul** pour DELETE |
| Scanner / pièce jointe | `POST /api/quotes/{id}/scan` | Staff |
| **Soumettre** (workflow) | `POST /api/quotes/{id}/submit` | **Prévu spec / RBAC_MATRIX** — *à ajouter si manquant* |
| Approuver / refuser | `POST /api/quotes/{id}/approve`, `.../reject` | Staff |

**Événement `<<extend>>` (cible) :** approuver ou refuser **déclenche** `NotifierAdherent` (idem remboursements).

### Module 6 — Gestion médicale & référentiels

| Ressource | Path | CRUD lecture | CRUD écriture |
|-----------|------|--------------|---------------|
| Ordonnances | `/api/ordonnances` | Tous rôles pertinents + scope adhérent | `ADMINISTRATEUR`, `OPERATEUR` |
| Médicaments | `/api/medicines` | + `CONSULTATEUR`, `ADHERENT` (lecture liste) | Staff |
| Médecins conventionnés | `/api/contracted-doctors` | Idem | Staff |
| Établissements | `/api/medical-facilities` | Idem | Staff |

**Opérateur :** pas de `DELETE` (remplacer par désactivation ou réservé admin selon règle produit).

### Module 7 — Consultation & rapports (`CONSULTATEUR`)

- `GET /api/stats/summary` — agrégats dashboard.
- `GET` sur : agents, remboursements (filtres query), devis, ordonnances, entités, etc. — **sans mutation**.

### Module 8 — Notifications & campagnes

- Boîte : `/api/notifications` (liste, non lus, marquer lu).
- Campagnes : `/api/notification-broadcasts` (rédaction brouillon, publication — politique rôle selon `RBAC_MATRIX` / `NotificationBroadcastController`).

### Paramétrage applicatif (types)

- `GET/PUT /api/settings/type-config` — rôles gérés dans `SecurityConfig` (souvent staff pour lecture/écriture selon politique).

---

## 5. Règles d’implémentation transverses

1. **Portée adhérent :** tout service appelé avec un utilisateur `ADHERENT` doit vérifier `user.getAgent().getId()` (ou équivalent) vs ressource demandée.
2. **JWT :** claims / `UserDetails` alignés sur `AppUser` ; tests d’intégration : `AuthMeIntegrationTest`, etc.
3. **Soft delete utilisateur :** préférer `active = false` ; suppression SQL réservée admin.
4. **Idempotence :** création carte / remboursements sensibles — documenter comportement.
5. **Fichiers :** upload devis / scan — stockage sécurisé, validation MIME, taille max.

---

## 6. Services transverses (UML)

| Service | Déclencheur | Comportement attendu |
|---------|-------------|----------------------|
| **Générateur PDF carte mutuelle** | Création carte (`<<include>>`) | Générer PDF, persister chemin ou blob ; endpoint téléchargement retourne fichier ou URL signée |
| **NotifierAdherent** | Validation / refus devis ; validation / clôture remboursement (`<<extend>>`) | Notification persistante + canal async (email/push) configurable |

---

## 7. Front-end (vues à cohérence RBAC)

Répertoire : `srm-mutuelle-web/src/pages/`.  
Chaque page doit **masquer ou désactiver** les actions interdites selon le rôle retourné par `/api/auth/me`, en complément des contrôles serveur.

Pages typiques : `DashboardPage`, `BeneficiairesPage`, `RemboursementsPage`, `DevisPage`, `OrdonnancesPage`, `UtilisateursPage` (admin), `ParametragePage`, `ChatbotPage`, `ProfilPage`, `NotificationsPage`, etc.

---

## 8. Check-list « zéro erreur » pour une PR générée par l’IA

- [ ] Chaque nouveau endpoint a `@PreAuthorize` cohérent avec les sections 2 et 4.
- [x] Aucun `DELETE` accessible à `OPERATEUR` (contrôleurs + services).
- [ ] Adhérent : tests de fuite de données croisées (`agentId` A vs B).
- [ ] Migrations Flyway : nom de fichier versionné, pas de modification rétroactive.
- [ ] DTOs + validation Jakarta (`@Valid`, `@NotBlank`, etc.).
- [x] Événements métier : notifications persistantes adhérent sur validation/clôture remboursement et approbation/refus devis ; PDF carte à la création.

---

## 9. Références fichiers clés (backend)

| Sujet | Fichier / package |
|-------|-------------------|
| Sécurité globale | `config/SecurityConfig.java` |
| RBAC annoté | `api/*Controller.java` |
| Utilisateurs admin | `api/UserAdminController.java`, `service/UserAdminService.java` |
| Modèles | `domain/*.java` |
| Client HTTP front | `srm-mutuelle-web/src/api/client.js` |

---

*Document généré pour le dépôt SRM-MS — à maintenir lors des évolutions majeures d’architecture.*
