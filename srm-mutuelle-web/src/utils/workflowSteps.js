/** Workflow adhérent — devis dentaire (3 étapes + décision finale). */
export const DEVIS_WORKFLOW_STEPS = [
  { step: 1, label: 'Dépôt', hint: 'Devis enregistré' },
  { step: 2, label: 'Transmission', hint: 'Envoyé à la mutuelle' },
  { step: 3, label: 'Décision', hint: 'Instruction mutuelle' },
];

/** Workflow adhérent — remboursement (3 étapes). */
export const REMBOURSEMENT_WORKFLOW_STEPS = [
  { step: 1, label: 'Dépôt', hint: 'Demande enregistrée' },
  { step: 2, label: 'Transmission', hint: 'Envoyée à la mutuelle' },
  { step: 3, label: 'Décision', hint: 'Instruction mutuelle' },
];

/** Workflow adhérent — prise en charge (3 étapes). */
export const PEC_WORKFLOW_STEPS = [
  { step: 1, label: 'Dépôt', hint: 'Demande enregistrée' },
  { step: 2, label: 'Instruction', hint: 'Analyse mutuelle' },
  { step: 3, label: 'Décision', hint: 'Montant PEC et taux' },
];

export function resolveDevisWorkflow(etat, scanned) {
  const terminal = etat === 'Approuvé' || etat === 'Rejeté';
  let activeStep = 1;
  if (terminal) activeStep = 3;
  else if (scanned) activeStep = 3;
  else if (etat === 'Soumis') activeStep = 2;
  else activeStep = 1;

  return {
    steps: DEVIS_WORKFLOW_STEPS,
    activeStep,
    terminal,
    terminalLabel: terminal ? etat : null,
  };
}

export function resolveRemboursementWorkflow(statut, scanned) {
  const terminal = statut === 'Traité' || statut === 'Clôturé' || statut === 'Rejeté';
  let activeStep = 1;
  if (terminal) activeStep = 3;
  else if (scanned) activeStep = 3;
  else if (statut === 'En cours' || statut === 'Soumis') activeStep = 2;
  else activeStep = 1;

  return {
    steps: REMBOURSEMENT_WORKFLOW_STEPS,
    activeStep,
    terminal,
    terminalLabel: terminal ? statut : null,
  };
}

export function resolvePecWorkflow(statut) {
  const terminal = statut === 'Approuvé' || statut === 'Clôturé' || statut === 'Rejeté';
  let activeStep = 1;
  if (terminal) activeStep = 3;
  else if (statut === 'En cours') activeStep = 2;
  else activeStep = 1;

  return {
    steps: PEC_WORKFLOW_STEPS,
    activeStep,
    terminal,
    terminalLabel: terminal ? statut : null,
  };
}

/** Workflow agent — recrutement (3 étapes). */
export const AGENT_WORKFLOW_STEPS = [
  { step: 1, label: 'Enregistrement', hint: 'Fiche agent créée' },
  { step: 2, label: 'Vérification', hint: 'Instruction dossier' },
  { step: 3, label: 'Intégration', hint: 'Décision d\'activité' },
];

export function resolveAgentWorkflow(statut) {
  const terminal = statut === 'Actif' || statut === 'Suspendu';
  let activeStep = 1;
  if (statut === 'Actif' || statut === 'Suspendu') activeStep = 3;
  else if (statut === 'Inactif') activeStep = 2;
  else activeStep = 1;

  return {
    steps: AGENT_WORKFLOW_STEPS,
    activeStep,
    terminal,
    terminalLabel: terminal ? statut : null,
  };
}
