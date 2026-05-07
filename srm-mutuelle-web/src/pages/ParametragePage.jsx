import React, { useState } from 'react';
import FaIcon from '../components/FaIcon';
import { DEFAULT_TYPE_CONFIG, readTypeConfig, resetTypeConfig, writeTypeConfig } from '../config/typeConfig';

const LABELS = {
  quoteTypes: 'Types de devis',
  ordonnanceTypes: "Types d'ordonnance",
  radioTypes: 'Types radio',
  careTypes: 'Types de prise en charge',
  facilityTypes: "Types d'établissement",
  entityTypes: "Types d'entité organisationnelle",
  maladieTypes: 'Types de maladie spéciale',
};

export default function ParametragePage({ setPageTitle, addToast }) {
  setPageTitle('Paramétrage', 'Configuration des types');
  const [config, setConfig] = useState(readTypeConfig());
  const [drafts, setDrafts] = useState({});

  const addValue = (key) => {
    const value = String(drafts[key] || '').trim();
    if (!value) return;
    if ((config[key] || []).includes(value)) {
      addToast('warning', 'Valeur déjà existante');
      return;
    }
    setConfig((prev) => ({ ...prev, [key]: [...(prev[key] || []), value] }));
    setDrafts((prev) => ({ ...prev, [key]: '' }));
  };

  const removeValue = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: (prev[key] || []).filter((x) => x !== value) }));
  };

  const save = () => {
    writeTypeConfig(config);
    addToast('success', 'Paramétrage sauvegardé');
  };

  const restore = () => {
    setConfig(resetTypeConfig());
    addToast('info', 'Valeurs par défaut restaurées');
  };

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>
          <FaIcon name="sliders" className="fa-inline-icon" /> Paramètres des types
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={restore}>
            Restaurer défaut
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save}>
            Enregistrer
          </button>
        </div>
      </div>

      <div className="card-body">
        {Object.keys(DEFAULT_TYPE_CONFIG).map((key) => (
          <div key={key} style={{ marginBottom: 20, borderBottom: '1px solid var(--gray-100)', paddingBottom: 16 }}>
            <h4 style={{ marginBottom: 8 }}>{LABELS[key]}</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {(config[key] || []).map((v) => (
                <span key={v} className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {v}
                  <button
                    type="button"
                    style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'inherit' }}
                    onClick={() => removeValue(key, v)}
                    title="Supprimer"
                  >
                    <FaIcon name="xmark" />
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="form-control"
                placeholder="Nouvelle valeur"
                value={drafts[key] || ''}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
              />
              <button type="button" className="btn btn-outline" onClick={() => addValue(key)}>
                Ajouter
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
