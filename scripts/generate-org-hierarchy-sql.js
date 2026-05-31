/**
 * Génère V19__srm_ms_organizational_hierarchy.sql
 * Usage: node scripts/generate-org-hierarchy-sql.js
 */
const fs = require('fs');
const path = require('path');

const PROVINCES = [
  { code: 'MAR', label: 'Préfectorale de Marrakech' },
  { code: 'SAF', label: 'Provinciale de Safi' },
  { code: 'HAO', label: "Provinciale d'Al Haouz" },
  { code: 'KEL', label: "Provinciale d'El Kelaâ des Sraghna" },
  { code: 'ESS', label: "Provinciale d'Essaouira" },
  { code: 'REH', label: 'Provinciale de Rehamna' },
  { code: 'CHI', label: 'Provinciale de Chichaoua' },
  { code: 'YOU', label: 'Provinciale de Youssoufia' },
];

function provincialBranch(prefix, provinceLabel) {
  const isPref = provinceLabel.startsWith('Préfectorale');
  const dirType = isPref ? 'Préfectorale' : 'Provinciale';
  return {
    code: `${prefix}-EXP`,
    name: `Département d'Exploitation ${dirType}`,
    type: 'Département',
    children: [
      {
        code: `${prefix}-EXP-TECH`,
        name: 'Division Technique Intercommunale',
        type: 'Division',
        children: [
          { code: `${prefix}-SRV-ELEC`, name: 'Service Réseaux Électricité (Maintenance et Dépannage Local)', type: 'Service' },
          { code: `${prefix}-SRV-EAU`, name: 'Service Réseaux Eau Potable (Distribution et Réparation des Fuites)', type: 'Service' },
          { code: `${prefix}-SRV-ASS`, name: 'Service Réseaux Assainissement (Curage et Interventions Urbaines)', type: 'Service' },
        ],
      },
    ],
  };
}

function provincialCommercial(prefix) {
  return {
    code: `${prefix}-COM`,
    name: 'Département Commercial Provincial',
    type: 'Département',
    children: [
      {
        code: `${prefix}-COM-CLI`,
        name: 'Division Clientèle Locale',
        type: 'Division',
        children: [
          { code: `${prefix}-SRV-AG`, name: 'Service Agences Locales de Proximité et Guichets', type: 'Service' },
          { code: `${prefix}-SRV-REL`, name: 'Service Relève des Index, Encaisses et Facturation Provinciale', type: 'Service' },
        ],
      },
    ],
  };
}

function provincialSupport(prefix) {
  return {
    code: `${prefix}-SUP`,
    name: 'Département Support Provincial',
    type: 'Département',
    children: [
      {
        code: `${prefix}-SUP-LOG`,
        name: 'Division Logistique et Logistique Territoriale',
        type: 'Division',
        children: [
          { code: `${prefix}-SRV-MAG`, name: 'Service Magasin Local et Approvisionnement d\'Urgence', type: 'Service' },
          { code: `${prefix}-SRV-PARC`, name: 'Service Maintenance du Parc Auto Provincial', type: 'Service' },
        ],
      },
    ],
  };
}

const HIERARCHY = {
  code: 'DG-SRM-MS',
  name: 'Direction Générale SRM Marrakech-Safi',
  type: 'Direction générale',
  children: [
    {
      code: 'DIR-OPE-ELEC',
      name: 'Direction Opérationnelle Électricité (Région Marrakech-Safi)',
      type: 'Direction',
      children: [
        {
          code: 'DEP-ELEC-RESEAU',
          name: 'Département Réseaux et Distribution HT/MT/BT',
          type: 'Département',
          children: [
            {
              code: 'DIV-ELEC-HTMT',
              name: 'Division Haute et Moyenne Tension (HT/MT)',
              type: 'Division',
              children: [
                { code: 'SRV-ELEC-COND', name: 'Service Conduite du Réseau, Dispatching et Téléconduite', type: 'Service' },
                { code: 'SRV-ELEC-POST', name: 'Service Maintenance des Postes de Transformation et Postes Sources', type: 'Service' },
              ],
            },
            {
              code: 'DIV-ELEC-BT',
              name: 'Division Basse Tension (BT)',
              type: 'Division',
              children: [
                { code: 'SRV-ELEC-NEUF', name: 'Service Travaux Neufs, Extensions et Éclairage Public', type: 'Service' },
                { code: 'SRV-ELEC-DEP', name: 'Service Dépannage, Sécurité et Maintenance Curative', type: 'Service' },
              ],
            },
          ],
        },
        {
          code: 'DEP-ELEC-ING',
          name: 'Département Ingénierie et Planification Électricité',
          type: 'Département',
          children: [
            {
              code: 'DIV-ELEC-ETU',
              name: 'Division Études et Projets Réseau',
              type: 'Division',
              children: [
                { code: 'SRV-ELEC-BE', name: 'Service Bureau d\'Études Électricité et Modélisation', type: 'Service' },
                { code: 'SRV-ELEC-NORM', name: 'Service Normalisation, Contrôle de Conformité et Réception', type: 'Service' },
              ],
            },
          ],
        },
      ],
    },
    {
      code: 'DIR-OPE-EAU',
      name: 'Direction Opérationnelle Eau Potable (Région Marrakech-Safi)',
      type: 'Direction',
      children: [
        {
          code: 'DEP-EAU-PROD',
          name: 'Département Production, Traitement et Qualité',
          type: 'Département',
          children: [
            {
              code: 'DIV-EAU-INFRA',
              name: 'Division Infrastructures de Production et Adduction',
              type: 'Division',
              children: [
                { code: 'SRV-EAU-POMP', name: 'Service Exploitation des Stations de Pompage et Forages', type: 'Service' },
                { code: 'SRV-EAU-RES', name: 'Service Gestion des Réservoirs Principaux et Conduites d\'Adduction', type: 'Service' },
              ],
            },
            {
              code: 'DIV-EAU-LABO',
              name: 'Division Laboratoire Régional et Contrôle de Qualité (Marrakech)',
              type: 'Division',
              children: [
                { code: 'SRV-EAU-PHY', name: 'Service Analyses Physico-chimiques de l\'Eau', type: 'Service' },
                { code: 'SRV-EAU-BACT', name: 'Service Analyses Bactériologiques et Vigilance Sanitaire', type: 'Service' },
              ],
            },
          ],
        },
        {
          code: 'DEP-EAU-DIST',
          name: 'Département Distribution et Performance Réseau',
          type: 'Département',
          children: [
            {
              code: 'DIV-EAU-EXPL',
              name: 'Division Exploitation et Maintenance des Réseaux Eau',
              type: 'Division',
              children: [
                { code: 'SRV-EAU-MAINT', name: 'Service Maintenance des Conduites, Vannes et Branchements', type: 'Service' },
              ],
            },
            {
              code: 'DIV-EAU-REND',
              name: 'Division Sectorisation et Rendement',
              type: 'Division',
              children: [
                { code: 'SRV-EAU-FUITE', name: 'Service Recherche des Fuites et Optimisation des Pressions', type: 'Service' },
                { code: 'SRV-EAU-RENOV', name: 'Service Renouvellement des Réseaux Vétustes', type: 'Service' },
              ],
            },
          ],
        },
      ],
    },
    {
      code: 'DIR-OPE-ASS',
      name: 'Direction Opérationnelle Assainissement Liquide (Région Marrakech-Safi)',
      type: 'Direction',
      children: [
        {
          code: 'DEP-ASS-COLL',
          name: 'Département Collecte et Réseaux d\'Évacuation',
          type: 'Département',
          children: [
            {
              code: 'DIV-ASS-ENT',
              name: 'Division Entretien et Curage des Réseaux',
              type: 'Division',
              children: [
                { code: 'SRV-ASS-COLL', name: 'Service Maintenance des Collecteurs d\'Eaux Usées', type: 'Service' },
                { code: 'SRV-ASS-PLUV', name: 'Service Gestion, Curage et Protection contre les Crues (Ouvrages Pluviaux)', type: 'Service' },
              ],
            },
          ],
        },
        {
          code: 'DEP-ASS-TRAIT',
          name: 'Département Traitement, Épuration et Revalorisation',
          type: 'Département',
          children: [
            {
              code: 'DIV-ASS-STEP',
              name: 'Division Station d\'Épuration (STEP Marrakech et Stations Régionales)',
              type: 'Division',
              children: [
                { code: 'SRV-ASS-EXPL', name: 'Service Exploitation et Maintenance Lourde de la STEP', type: 'Service' },
              ],
            },
            {
              code: 'DIV-ASS-ECO',
              name: 'Division Économie Circulaire et Réutilisation',
              type: 'Division',
              children: [
                { code: 'SRV-ASS-BOUE', name: 'Service Valorisation des Boues (Biogaz/Agriculture)', type: 'Service' },
                { code: 'SRV-ASS-REUT', name: 'Service Traitement Tertiaire et Réutilisation des Eaux Épurées', type: 'Service' },
              ],
            },
          ],
        },
      ],
    },
    {
      code: 'DIR-COM',
      name: 'Direction Commerciale et Relation Clientèle',
      type: 'Direction',
      children: [
        {
          code: 'DEP-COM-FACT',
          name: 'Département Gestion des Abonnés et Facturation',
          type: 'Département',
          children: [
            {
              code: 'DIV-COM-CPT',
              name: 'Division Comptage et Relève',
              type: 'Division',
              children: [
                { code: 'SRV-COM-CPT', name: 'Service Pose, Remplacement, Étalonnage et Contrôle des Compteurs', type: 'Service' },
                { code: 'SRV-COM-REL', name: 'Service Tournées de Relève des Index et Saisie Mobile', type: 'Service' },
              ],
            },
            {
              code: 'DIV-COM-FACT',
              name: 'Division Facturation et Recouvrement',
              type: 'Division',
              children: [
                { code: 'SRV-COM-CALC', name: 'Service Calculs, Audit et Édition des Factures', type: 'Service' },
                { code: 'SRV-COM-REC', name: 'Service Recouvrement, Contentieux et Gestion des Impayés', type: 'Service' },
              ],
            },
          ],
        },
        {
          code: 'DEP-COM-RC',
          name: 'Département Relation Clientèle et Canaux de Vente',
          type: 'Département',
          children: [
            {
              code: 'DIV-COM-AG',
              name: 'Division Agences et Front-Office',
              type: 'Division',
              children: [
                { code: 'SRV-COM-ACC', name: 'Service Accueil, Gestion et Standardisation des Agences Physiques', type: 'Service' },
                { code: 'SRV-COM-CRC', name: 'Service Centre de Relation Client (CRC) et Gestion des Réclamations', type: 'Service' },
              ],
            },
            {
              code: 'DIV-COM-RACC',
              name: 'Division Nouveaux Raccordements et Promoteurs',
              type: 'Division',
              children: [
                { code: 'SRV-COM-PART', name: 'Service Raccordement et Branchement des Particuliers', type: 'Service' },
                { code: 'SRV-COM-GC', name: 'Service Grands Comptes, Lotisseurs et Zones Industrielles', type: 'Service' },
              ],
            },
          ],
        },
      ],
    },
    {
      code: 'DIR-DAF',
      name: 'Direction Administrative et Financière',
      type: 'Direction',
      children: [
        {
          code: 'DEP-DAF-RH',
          name: 'Département Ressources Humaines',
          type: 'Département',
          children: [
            {
              code: 'DIV-DAF-ADM',
              name: 'Division Administration du Personnel',
              type: 'Division',
              children: [
                { code: 'SRV-DAF-PAIE', name: 'Service Gestion Administrative, Contrats et Paie', type: 'Service' },
                { code: 'SRV-DAF-TPS', name: 'Service Gestion du Temps, Présences, Congés et Pointage', type: 'Service' },
              ],
            },
            {
              code: 'DIV-DAF-GPEC',
              name: 'Division Gestion Prévisionnelle des Emplois et Compétences (GPEC)',
              type: 'Division',
              children: [
                { code: 'SRV-DAF-REC', name: 'Service Recrutement, Intégration et Mobilité Inter-provinces', type: 'Service' },
                { code: 'SRV-DAF-FORM', name: 'Service Formation Continue, Évaluation et Gestion des Carrières', type: 'Service' },
              ],
            },
            {
              code: 'DIV-DAF-SOC',
              name: 'Division Affaires Sociales, Hygiène et Sécurité',
              type: 'Division',
              children: [
                { code: 'SRV-DAF-MUT', name: 'Service Médecine du Travail, Mutuelle et Assurance Maladie', type: 'Service' },
                { code: 'SRV-DAF-OEUV', name: 'Service Œuvres Sociales et Conditions de Travail', type: 'Service' },
              ],
            },
          ],
        },
        {
          code: 'DEP-DAF-FIN',
          name: 'Département Finances, Comptabilité et Contrôle de Gestion',
          type: 'Département',
          children: [
            {
              code: 'DIV-DAF-CPT',
              name: 'Division Comptabilité et Fiscalité',
              type: 'Division',
              children: [
                { code: 'SRV-DAF-CGEN', name: 'Service Comptabilité Générale et Fournisseurs', type: 'Service' },
                { code: 'SRV-DAF-CANA', name: 'Service Comptabilité Analytique et Déclarations Fiscales', type: 'Service' },
              ],
            },
            {
              code: 'DIV-DAF-GFIN',
              name: 'Division Gestion Financière et Performance',
              type: 'Division',
              children: [
                { code: 'SRV-DAF-TRES', name: 'Service Trésorerie, Financements et Relations Bancaires', type: 'Service' },
                { code: 'SRV-DAF-BUD', name: 'Service Budgets, Tableaux de Bord et Contrôle de Gestion', type: 'Service' },
              ],
            },
          ],
        },
        {
          code: 'DEP-DAF-ACH',
          name: 'Département Achats, Logistique et Moyens Généraux',
          type: 'Département',
          children: [
            {
              code: 'DIV-DAF-MARC',
              name: 'Division Marchés Publics et Approvisionnements',
              type: 'Division',
              children: [
                { code: 'SRV-DAF-AO', name: 'Service Appels d\'Offres, Cahiers des Charges (CPS) et Contrats', type: 'Service' },
                { code: 'SRV-DAF-STK', name: 'Service Gestion des Stocks, Magasins Centraux et Pièces de Rechange', type: 'Service' },
              ],
            },
            {
              code: 'DIV-DAF-MG',
              name: 'Division Moyens Généraux et Patrimoine',
              type: 'Division',
              children: [
                { code: 'SRV-DAF-AUTO', name: 'Service Gestion du Parc Auto régional (Véhicules d\'intervention)', type: 'Service' },
                { code: 'SRV-DAF-PAT', name: 'Service Entretien du Patrimoine Immobilier, Gardiennage et Nettoyage', type: 'Service' },
              ],
            },
          ],
        },
      ],
    },
    {
      code: 'DIR-DSI',
      name: 'Direction des Systèmes d\'Information et Digitalisation (DSI)',
      type: 'Direction',
      children: [
        {
          code: 'DEP-DSI-INFRA',
          name: 'Département Infrastructures IT, Systèmes et Cybersécurité',
          type: 'Département',
          children: [
            {
              code: 'DIV-DSI-RESEAU',
              name: 'Division Réseaux, Systèmes et Télécoms',
              type: 'Division',
              children: [
                { code: 'SRV-DSI-SRV', name: 'Service Administration des Serveurs, Datacenter et Cloud', type: 'Service' },
                { code: 'SRV-DSI-SUP', name: 'Service Support Utilisateurs et Maintenance du Parc Informatique', type: 'Service' },
              ],
            },
            {
              code: 'DIV-DSI-SEC',
              name: 'Division Sécurité des Systèmes d\'Information (SSI)',
              type: 'Division',
              children: [
                { code: 'SRV-DSI-CYBER', name: 'Service Cybersécurité, Gestion des Droits et Sauvegardes', type: 'Service' },
              ],
            },
          ],
        },
        {
          code: 'DEP-DSI-APP',
          name: 'Département Solutions Applicatives, Données et SIG',
          type: 'Département',
          children: [
            {
              code: 'DIV-DSI-PROG',
              name: 'Division Progiciels et Applications Métiers',
              type: 'Division',
              children: [
                { code: 'SRV-DSI-ERP', name: 'Service ERP Central (Gestion Finance, RH, Achats)', type: 'Service' },
                { code: 'SRV-DSI-CRM', name: 'Service Système d\'Information Clientèle (Facturation/CRM) et Portails Web/Mobile', type: 'Service' },
              ],
            },
            {
              code: 'DIV-DSI-SIG',
              name: 'Division Systèmes d\'Information Géographique (SIG)',
              type: 'Division',
              children: [
                { code: 'SRV-DSI-CARTO', name: 'Service Cartographie Digitale, Réseau Connecté et Données Topographiques', type: 'Service' },
              ],
            },
          ],
        },
      ],
    },
    ...PROVINCES.map((p) => ({
      code: `DIR-PROV-${p.code}`,
      name: `Direction ${p.label}`,
      type: 'Direction',
      children: [
        provincialBranch(`PROV-${p.code}`, p.label),
        provincialCommercial(`PROV-${p.code}`),
        provincialSupport(`PROV-${p.code}`),
      ],
    })),
  ],
};

const rows = [];
let nextId = 1000;

function walk(node, parentId = null) {
  const id = nextId++;
  rows.push({ id, code: node.code, name: node.name, type: node.type, parentId });
  (node.children || []).forEach((c) => walk(c, id));
}

walk(HIERARCHY);

const esc = (s) => s.replace(/'/g, "''");

let sql = `-- Arborescence officielle SRM Marrakech-Safi (DG → Direction → Département → Division → Service)
-- Généré par scripts/generate-org-hierarchy-sql.js

DELETE FROM organizational_entities;

INSERT INTO organizational_entities (id, code, name, entity_type, parent_id, deleted) VALUES
`;

sql += rows
  .map((r) => `    (${r.id}, '${esc(r.code)}', '${esc(r.name)}', '${esc(r.type)}', ${r.parentId ?? 'NULL'}, FALSE)`)
  .join(',\n');

sql += `;

SELECT setval(pg_get_serial_sequence('organizational_entities', 'id'), (SELECT MAX(id) FROM organizational_entities));

-- Aligner quelques agents démo sur la nouvelle structure (mutuelle / DSI)
UPDATE agents SET entite_name = 'Service Médecine du Travail, Mutuelle et Assurance Maladie'
WHERE matricule IN ('AGT-001', 'AGT-002', 'AGT-007', 'AGT-008');

UPDATE agents SET entite_name = 'Service Système d''Information Clientèle (Facturation/CRM) et Portails Web/Mobile'
WHERE matricule IN ('AGT-004', 'AGT-006');

UPDATE agents SET entite_name = 'Direction Opérationnelle Électricité (Région Marrakech-Safi)'
WHERE matricule = 'AGT-003';

UPDATE agents SET entite_name = 'Direction Commerciale et Relation Clientèle'
WHERE matricule = 'AGT-005';
`;

const out = path.join(__dirname, '..', 'srm-mutuelle-backend', 'src', 'main', 'resources', 'db', 'migration', 'V19__srm_ms_organizational_hierarchy.sql');
fs.writeFileSync(out, sql, 'utf8');
console.log(`Written ${rows.length} entities to ${out}`);
