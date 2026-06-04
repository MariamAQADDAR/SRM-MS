import React from 'react';
import FaIcon from './FaIcon';

export default function AdherentSimulationBanner({ agents, selectedAgentId, onChangeAgent }) {
  return (
    <div className="simulation-banner">
      <div className="sim-banner-content">
        <div className="sim-banner-left">
          <span className="sim-badge">
            <FaIcon name="circle-info" /> MODE SIMULATION
          </span>
          <span className="sim-text">
            Visualisation de l'espace adhérent (Simulation).
          </span>
        </div>
        <div className="sim-banner-right">
          <label htmlFor="sim-agent-select" className="sim-label">Choisir un agent :</label>
          <select
            id="sim-agent-select"
            className="form-control sim-select"
            value={selectedAgentId || ''}
            onChange={(e) => onChangeAgent(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— Aucun agent sélectionné —</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.matricule} — {a.nom} {a.prenom}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
