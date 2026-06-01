/** Workflow adhérent — devis (3 étapes). */
export const DEVIS_WORKFLOW_STEPS = [
  { step: 1, label: 'Dépôt', hint: 'Devis enregistré' },
  { step: 2, label: 'Transmission', hint: 'Envoyé à la mutuelle' },
  { step: 3, label: 'Décision', hint: 'Instruction mutuelle' },
];

/** Workflow adhérent — remboursement (3 étapes). */
export const REMBOURSEMENT_WORKFLOW_STEPS = [
  { step: 1, label: 'Dépôt', hint: 'Demande enregistrée' },
  { step: 2, label: 'Instruction', hint: 'Analyse mutuelle' },
  { step: 3, label: 'Décision', hint: 'Validation / clôture' },
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

export function devisWorkflowSummary(item) {
  const wf = resolveDevisWorkflow(item.etat, !!item.scanned);
  if (wf.terminal) {
    const extra =
      item.etat === 'Approuvé' && item.montantPrisEnCharge != null && Number(item.montantPrisEnCharge) > 0
        ? ` — ${Number(item.montantPrisEnCharge).toLocaleString('fr-FR')} DH`
        : '';
    return `${wf.terminalLabel}${extra}`;
  }
  return `Étape ${wf.activeStep}/3 — ${wf.steps[wf.activeStep - 1].label}`;
}

export function resolveRemboursementWorkflow(statut) {
  const terminal = statut === 'Traité' || statut === 'Clôturé' || statut === 'Rejeté';
  let activeStep = 1;
  if (terminal) activeStep = 3;
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

export function remboursementWorkflowSummary(item) {
  const wf = resolveRemboursementWorkflow(item.statut);
  if (wf.terminal) {
    const extra =
      item.statut === 'Traité' && Number(item.montantValide) > 0 ? ` — ${Number(item.montantValide).toLocaleString('fr-FR')} DH` : '';
    return `${wf.terminalLabel}${extra}`;
  }
  return `Étape ${wf.activeStep}/3 — ${wf.steps[wf.activeStep - 1].label}`;
}

export function pecWorkflowSummary(item) {
  const wf = resolvePecWorkflow(item.statut);
  if (wf.terminal) {
    const extra =
      item.statut === 'Approuvé' && item.montantPrisEnCharge != null && Number(item.montantPrisEnCharge) > 0
        ? ` — ${Number(item.montantPrisEnCharge).toLocaleString('fr-FR')} DH`
        : '';
    return `${wf.terminalLabel}${extra}`;
  }
  return `Étape ${wf.activeStep}/3 — ${wf.steps[wf.activeStep - 1].label}`;
}
