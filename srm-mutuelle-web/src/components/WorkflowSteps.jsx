import React from 'react';
import FaIcon from './FaIcon';

/**
 * Affiche 3 étapes horizontales (dépôt → transmission/instruction → décision).
 */
export default function WorkflowSteps({ steps, activeStep, terminal, terminalLabel }) {
  return (
    <div className="workflow-steps-wrap">
      <div className="workflow-steps" role="list" aria-label="Avancement du dossier">
        {steps.map((s) => {
          const done = terminal ? s.step <= activeStep : s.step < activeStep;
          const current = !terminal && s.step === activeStep;
          const state = done ? 'done' : current ? 'current' : 'pending';
          return (
            <div key={s.step} className={`workflow-step workflow-step--${state}`} role="listitem">
              <div className="workflow-step-marker">{done ? <FaIcon name="check" /> : s.step}</div>
              <div className="workflow-step-text">
                <span className="workflow-step-label">{s.label}</span>
                {s.hint ? <span className="workflow-step-hint">{s.hint}</span> : null}
              </div>
              {s.step < steps.length ? <div className="workflow-step-connector" aria-hidden /> : null}
            </div>
          );
        })}
      </div>
      {terminal && terminalLabel ? (
        <p className="workflow-terminal">
          Décision : <strong>{terminalLabel}</strong>
        </p>
      ) : null}
    </div>
  );
}
