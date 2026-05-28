import React from 'react';

export default function RecapStep({ agentInfo, beneficiaries, onBack, onConfirm }) {
  return (
    <div className="recap-step">
      <h2 className="text-xl font-semibold mb-4">Récapitulatif</h2>
      <div className="mb-4">
        <h3 className="font-medium">Informations de l'agent</h3>
        <ul className="list-disc list-inside">
          {Object.entries(agentInfo).map(([key, value]) => (
            <li key={key}>
              <strong>{key}:</strong> {String(value)}
            </li>
          ))}
        </ul>
      </div>
      <div className="mb-4">
        <h3 className="font-medium">Bénéficiaires</h3>
        {beneficiaries && beneficiaries.length > 0 ? (
          <ul className="list-disc list-inside">
            {beneficiaries.map((b, idx) => (
              <li key={idx}>
                {Object.entries(b).map(([k, v]) => (
                  <span key={k}>
                    <strong>{k}:</strong> {String(v)}{' '}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p>Aucun bénéficiaire ajouté.</p>
        )}
      </div>
      <div className="flex justify-between mt-6">
        <button type="button" className="btn btn-outline" onClick={onBack}>
          Retour
        </button>
        <button type="button" className="btn btn-primary" onClick={onConfirm}>
          Confirmer et créer l'agent
        </button>
      </div>
    </div>
  );
}
