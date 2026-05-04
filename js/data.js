// ============================================
// CRM MUTUELLE SRM-MS — Simulated Data
// ============================================

const SimData = {
  // --- AGENTS (Bénéficiaires) ---
  agents: [
    { id: 1, matricule: 'AGT-001', nom: 'Benali', prenom: 'Youssef', cin: 'BK432198', dateNaissance: '1985-03-15', situation: 'Marié', entite: 'Direction Financière', telephone: '0661234567', email: 'y.benali@srm-ms.ma' },
    { id: 2, matricule: 'AGT-002', nom: 'El Amrani', prenom: 'Fatima', cin: 'BK541122', dateNaissance: '1990-07-22', situation: 'Célibataire', entite: 'Direction RH', telephone: '0667891234', email: 'f.amrani@srm-ms.ma' },
    { id: 3, matricule: 'AGT-003', nom: 'Ouazzani', prenom: 'Mohamed', cin: 'BK765432', dateNaissance: '1978-11-03', situation: 'Marié', entite: 'Direction Technique', telephone: '0670001122', email: 'm.ouazzani@srm-ms.ma' },
    { id: 4, matricule: 'AGT-004', nom: 'Tazi', prenom: 'Amina', cin: 'BK112233', dateNaissance: '1992-01-20', situation: 'Célibataire', entite: 'Direction SI', telephone: '0655443322', email: 'a.tazi@srm-ms.ma' },
    { id: 5, matricule: 'AGT-005', nom: 'Cherkaoui', prenom: 'Hassan', cin: 'BK998877', dateNaissance: '1982-05-10', situation: 'Marié', entite: 'Direction Commerciale', telephone: '0699887766', email: 'h.cherkaoui@srm-ms.ma' },
    { id: 6, matricule: 'AGT-006', nom: 'Alaoui', prenom: 'Sara', cin: 'BK667788', dateNaissance: '1995-09-14', situation: 'Célibataire', entite: 'Direction Juridique', telephone: '0612345678', email: 's.alaoui@srm-ms.ma' },
    { id: 7, matricule: 'AGT-007', nom: 'Idrissi', prenom: 'Karim', cin: 'BK223344', dateNaissance: '1980-12-25', situation: 'Marié', entite: 'Direction Financière', telephone: '0688990011', email: 'k.idrissi@srm-ms.ma' },
    { id: 8, matricule: 'AGT-008', nom: 'Bouazza', prenom: 'Khadija', cin: 'BK445566', dateNaissance: '1988-06-30', situation: 'Mariée', entite: 'Direction RH', telephone: '0677665544', email: 'k.bouazza@srm-ms.ma' },
  ],

  // --- PROCHES ---
  proches: [
    { id: 1, agentId: 1, nom: 'Benali', prenom: 'Nadia', type: 'Conjoint', cin: 'BK111222', dateNaissance: '1987-04-12' },
    { id: 2, agentId: 1, nom: 'Benali', prenom: 'Adam', type: 'Enfant', cin: '', dateNaissance: '2012-09-08' },
    { id: 3, agentId: 1, nom: 'Benali', prenom: 'Aya', type: 'Enfant', cin: '', dateNaissance: '2015-02-14' },
    { id: 4, agentId: 3, nom: 'Ouazzani', prenom: 'Laila', type: 'Conjoint', cin: 'BK333444', dateNaissance: '1980-08-20' },
    { id: 5, agentId: 3, nom: 'Ouazzani', prenom: 'Ilyas', type: 'Enfant', cin: '', dateNaissance: '2010-03-05' },
    { id: 6, agentId: 5, nom: 'Cherkaoui', prenom: 'Samira', type: 'Conjoint', cin: 'BK555666', dateNaissance: '1985-11-15' },
    { id: 7, agentId: 7, nom: 'Idrissi', prenom: 'Houda', type: 'Conjoint', cin: 'BK777888', dateNaissance: '1983-07-22' },
    { id: 8, agentId: 7, nom: 'Idrissi', prenom: 'Rayan', type: 'Enfant', cin: '', dateNaissance: '2018-01-10' },
  ],

  // --- ORDONNANCES ---
  ordonnances: [
    { id: 1, numero: 'ORD-2025-001', date: '2025-01-15', agentId: 1, beneficiaire: 'Youssef Benali', typePrestation: 'Médicament', montant: 450.00, montantRemboursable: 360.00, taux: 80, statut: 'Traité' },
    { id: 2, numero: 'ORD-2025-002', date: '2025-01-22', agentId: 2, beneficiaire: 'Fatima El Amrani', typePrestation: 'Analyse', montant: 800.00, montantRemboursable: 640.00, taux: 80, statut: 'Traité' },
    { id: 3, numero: 'ORD-2025-003', date: '2025-02-03', agentId: 3, beneficiaire: 'Laila Ouazzani', typePrestation: 'Radiologie', montant: 1200.00, montantRemboursable: 840.00, taux: 70, statut: 'En cours' },
    { id: 4, numero: 'ORD-2025-004', date: '2025-02-10', agentId: 1, beneficiaire: 'Adam Benali', typePrestation: 'Médicament', montant: 230.00, montantRemboursable: 184.00, taux: 80, statut: 'Traité' },
    { id: 5, numero: 'ORD-2025-005', date: '2025-02-18', agentId: 5, beneficiaire: 'Hassan Cherkaoui', typePrestation: 'Analyse', montant: 550.00, montantRemboursable: 440.00, taux: 80, statut: 'En attente' },
    { id: 6, numero: 'ORD-2025-006', date: '2025-03-01', agentId: 4, beneficiaire: 'Amina Tazi', typePrestation: 'Médicament', montant: 150.00, montantRemboursable: 120.00, taux: 80, statut: 'Traité' },
    { id: 7, numero: 'ORD-2025-007', date: '2025-03-05', agentId: 6, beneficiaire: 'Sara Alaoui', typePrestation: 'Radiologie', montant: 900.00, montantRemboursable: 630.00, taux: 70, statut: 'En cours' },
  ],

  // --- DEVIS ---
  devis: [
    { id: 1, numero: 'DEV-2025-001', type: 'Optique', date: '2025-01-20', agentId: 1, beneficiaire: 'Youssef Benali', montant: 2500.00, taux: 60, etat: 'Approuvé' },
    { id: 2, numero: 'DEV-2025-002', type: 'Dentaire', date: '2025-02-05', agentId: 3, beneficiaire: 'Ilyas Ouazzani', montant: 3800.00, taux: 50, etat: 'En attente' },
    { id: 3, numero: 'DEV-2025-003', type: 'Optique', date: '2025-02-14', agentId: 2, beneficiaire: 'Fatima El Amrani', montant: 1800.00, taux: 60, etat: 'Approuvé' },
    { id: 4, numero: 'DEV-2025-004', type: 'Dentaire', date: '2025-02-28', agentId: 5, beneficiaire: 'Samira Cherkaoui', montant: 5200.00, taux: 50, etat: 'Rejeté' },
    { id: 5, numero: 'DEV-2025-005', type: 'Optique', date: '2025-03-10', agentId: 7, beneficiaire: 'Houda Idrissi', montant: 2200.00, taux: 60, etat: 'En attente' },
  ],

  // --- REMBOURSEMENTS ---
  remboursements: [
    { id: 1, numero: 'RMB-2025-001', date: '2025-01-25', agentId: 1, beneficiaire: 'Youssef Benali', montantDemande: 360.00, montantValide: 360.00, statut: 'Traité' },
    { id: 2, numero: 'RMB-2025-002', date: '2025-02-01', agentId: 2, beneficiaire: 'Fatima El Amrani', montantDemande: 640.00, montantValide: 640.00, statut: 'Traité' },
    { id: 3, numero: 'RMB-2025-003', date: '2025-02-12', agentId: 3, beneficiaire: 'Laila Ouazzani', montantDemande: 840.00, montantValide: 0, statut: 'En cours' },
    { id: 4, numero: 'RMB-2025-004', date: '2025-02-20', agentId: 1, beneficiaire: 'Adam Benali', montantDemande: 184.00, montantValide: 184.00, statut: 'Traité' },
    { id: 5, numero: 'RMB-2025-005', date: '2025-03-02', agentId: 5, beneficiaire: 'Hassan Cherkaoui', montantDemande: 440.00, montantValide: 0, statut: 'En attente' },
    { id: 6, numero: 'RMB-2025-006', date: '2025-03-08', agentId: 1, beneficiaire: 'Nadia Benali', montantDemande: 1500.00, montantValide: 0, statut: 'En attente' },
  ],

  // --- PRISES EN CHARGE ---
  prisesEnCharge: [
    { id: 1, numero: 'PEC-2025-001', typePrestation: 'Hospitalisation', dateDebut: '2025-01-10', dateFin: '2025-01-15', agentId: 3, beneficiaire: 'Mohamed Ouazzani', etablissement: 'Clinique Al Farabi', statut: 'Clôturé' },
    { id: 2, numero: 'PEC-2025-002', typePrestation: 'Chirurgie', dateDebut: '2025-02-01', dateFin: '2025-02-03', agentId: 1, beneficiaire: 'Nadia Benali', etablissement: 'CHU Mohammed VI', statut: 'En cours' },
    { id: 3, numero: 'PEC-2025-003', typePrestation: 'Maternité', dateDebut: '2025-03-01', dateFin: '', agentId: 8, beneficiaire: 'Khadija Bouazza', etablissement: 'Clinique Atlas', statut: 'En attente' },
  ],

  // --- MALADIES SPECIALES ---
  maladiesSpeciales: [
    { id: 1, numero: 'MLD-2025-001', typeMaladie: 'Diabète', dateDeclaration: '2024-06-15', agentId: 3, beneficiaire: 'Mohamed Ouazzani', statut: 'Validé' },
    { id: 2, numero: 'MLD-2025-002', typeMaladie: 'Hypertension', dateDeclaration: '2024-09-20', agentId: 7, beneficiaire: 'Karim Idrissi', statut: 'Validé' },
    { id: 3, numero: 'MLD-2025-003', typeMaladie: 'Asthme', dateDeclaration: '2025-01-05', agentId: 1, beneficiaire: 'Adam Benali', statut: 'En cours' },
  ],

  // --- ETABLISSEMENTS MEDICAUX ---
  etablissements: [
    { id: 1, nom: 'CHU Mohammed VI', type: 'Hôpital', adresse: 'Bd Mohammed VI, Marrakech', telephone: '0524-123456', medecins: ['Dr. Rachidi', 'Dr. Benhima'] },
    { id: 2, nom: 'Clinique Al Farabi', type: 'Clinique', adresse: 'Rue Ibn Sina, Guéliz', telephone: '0524-654321', medecins: ['Dr. Tahiri', 'Dr. Amrani'] },
    { id: 3, nom: 'Clinique Atlas', type: 'Clinique', adresse: 'Avenue Hassan II, Marrakech', telephone: '0524-111222', medecins: ['Dr. Fassi', 'Dr. Ouahhabi'] },
    { id: 4, nom: 'Optique Vision Plus', type: 'Opticien', adresse: 'Bd Zerktouni, Guéliz', telephone: '0524-333444', medecins: [] },
    { id: 5, nom: 'Laboratoire BioMed', type: 'Laboratoire', adresse: 'Rue de Liberté, Marrakech', telephone: '0524-555666', medecins: ['Dr. Lahlou'] },
  ],

  // --- UTILISATEURS ---
  utilisateurs: [
    { id: 1, nom: 'AQADDAR Marieme', email: 'admin@srm-ms.ma', role: 'Administrateur', statut: 'Actif', dernierAcces: '2025-03-15 14:30' },
    { id: 2, nom: 'Youssef Benali', email: 'operateur@srm-ms.ma', role: 'Opérateur', statut: 'Actif', dernierAcces: '2025-03-15 10:15' },
    { id: 3, nom: 'Fatima Zahrae', email: 'consult@srm-ms.ma', role: 'Consultateur', statut: 'Actif', dernierAcces: '2025-03-14 16:45' },
    { id: 4, nom: 'Hassan Moussaoui', email: 'h.moussaoui@srm-ms.ma', role: 'Opérateur', statut: 'Inactif', dernierAcces: '2025-02-28 09:00' },
  ],

  // --- ENTITES ORGANISATIONNELLES ---
  entites: [
    { id: 1, code: 'DIR-FIN', nom: 'Direction Financière', type: 'Direction', parent: '—' },
    { id: 2, code: 'DIR-RH', nom: 'Direction RH', type: 'Direction', parent: '—' },
    { id: 3, code: 'DIR-SI', nom: 'Direction SI & Transformation Digitale', type: 'Direction', parent: '—' },
    { id: 4, code: 'DIR-TECH', nom: 'Direction Technique', type: 'Direction', parent: '—' },
    { id: 5, code: 'DIR-COM', nom: 'Direction Commerciale', type: 'Direction', parent: '—' },
    { id: 6, code: 'DIR-JUR', nom: 'Direction Juridique', type: 'Direction', parent: '—' },
    { id: 7, code: 'DEP-TD', nom: 'Département Transformation Digitale', type: 'Département', parent: 'Direction SI' },
    { id: 8, code: 'SRV-INT', nom: "Service d'Intégration SI", type: 'Service', parent: 'Département TD' },
    { id: 9, code: 'SRV-PAI', nom: 'Service Paie', type: 'Service', parent: 'Direction RH' },
    { id: 10, code: 'DIV-OS', nom: 'Division Œuvres Sociales', type: 'Division', parent: 'Direction RH' },
  ],

  // --- CHART DATA ---
  chartMonthlyCosts: [
    { month: 'Jan', value: 12500 },
    { month: 'Fév', value: 18200 },
    { month: 'Mar', value: 15800 },
    { month: 'Avr', value: 22100 },
    { month: 'Mai', value: 19500 },
    { month: 'Jun', value: 24800 },
    { month: 'Jul', value: 16300 },
    { month: 'Aoû', value: 11200 },
    { month: 'Sep', value: 20700 },
    { month: 'Oct', value: 23400 },
    { month: 'Nov', value: 17900 },
    { month: 'Déc', value: 28600 },
  ]
};
