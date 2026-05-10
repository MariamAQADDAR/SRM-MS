import { useEffect, useState } from 'react';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import { DEFAULT_TYPE_CONFIG, mergeWithDefaultsForState, prefetchTypeConfig, saveTypeConfigKey } from '../config/typeConfig';
import { confirmDelete, promptText } from '../utils/swal';

const LABELS = {
  quoteTypes: 'Devis',
  ordonnanceTypes: 'Ordonnances',
  radioTypes: 'Radios',
  careTypes: 'Prises en charge',
  facilityTypes: 'Établissements',
  entityTypes: 'Entités organisationnelles',
  maladieTypes: 'Maladies spéciales',
};

export default function ParametragePage({ setPageTitle, addToast }) {
  setPageTitle('Paramétrage', 'Administration');
  const [config, setConfig] = useState(() => mergeWithDefaultsForState({}));
  const [activeKey, setActiveKey] = useState(Object.keys(DEFAULT_TYPE_CONFIG)[0]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await prefetchTypeConfig();
        if (!cancelled) setConfig({ ...data });
      } catch (e) {
        if (!cancelled) addToast('error', e.message || 'Chargement impossible');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addToast]);

  const addValue = async (key) => {
    const value = await promptText({
      title: 'Ajouter une valeur',
      text: `Catégorie : ${LABELS[key]}`,
      inputLabel: 'Libellé',
      placeholder: 'Saisir le libellé…',
      confirmButtonText: 'Ajouter',
    });
    if (!value) return;
    if ((config[key] || []).includes(value)) {
      addToast('warning', 'Cette valeur existe déjà dans la liste.');
      return;
    }
    const next = [...(config[key] || []), value];
    try {
      const updated = await saveTypeConfigKey(key, next);
      setConfig(mergeWithDefaultsForState(updated));
      addToast('success', 'Valeur ajoutée et enregistrée.');
    } catch (e) {
      addToast('error', e.message || 'Enregistrement impossible');
    }
  };

  const editValue = async (key, oldValue) => {
    const newValue = await promptText({
      title: 'Modifier la valeur',
      text: `Catégorie : ${LABELS[key]}`,
      inputLabel: 'Nouveau libellé',
      inputValue: oldValue,
      confirmButtonText: 'Enregistrer',
    });
    if (!newValue || newValue === oldValue) return;
    const list = config[key] || [];
    if (list.includes(newValue)) {
      addToast('warning', 'Cette valeur existe déjà dans la liste.');
      return;
    }
    const next = list.map((x) => (x === oldValue ? newValue : x));
    try {
      const updated = await saveTypeConfigKey(key, next);
      setConfig(mergeWithDefaultsForState(updated));
      addToast('success', 'Valeur modifiée et enregistrée.');
    } catch (e) {
      addToast('error', e.message || 'Enregistrement impossible');
    }
  };

  const removeValue = async (key, value) => {
    const ok = await confirmDelete({
      itemLabel: value,
      text: `La valeur « ${value} » sera retirée de la liste « ${LABELS[key]} ». Vous pourrez la rajouter plus tard si besoin.`,
    });
    if (!ok) return;
    const next = (config[key] || []).filter((x) => x !== value);
    try {
      const updated = await saveTypeConfigKey(key, next);
      setConfig(mergeWithDefaultsForState(updated));
      addToast('success', 'Valeur supprimée et liste enregistrée.');
    } catch (e) {
      addToast('error', e.message || 'Enregistrement impossible');
    }
  };

  const rows = (config[activeKey] || []).filter((v) => v.toLowerCase().includes(query.trim().toLowerCase()));

  if (loading) {
    return (
      <div className="card param-card">
        <div className="card-body">Chargement…</div>
      </div>
    );
  }

  return (
    <div className="card param-card">
      <div className="card-body">
        <div className="tabs param-tabs">
          {Object.keys(DEFAULT_TYPE_CONFIG).map((key) => (
            <div
              key={key}
              className={`tab-item${activeKey === key ? ' active' : ''}`}
              onClick={() => {
                setActiveKey(key);
                setQuery('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && setActiveKey(key)}
              role="button"
              tabIndex={0}
            >
              {LABELS[key]} <span className="param-tab-count">{(config[key] || []).length}</span>
            </div>
          ))}
        </div>

        <TablePageShell
          title={LABELS[activeKey]}
          icon="sliders"
          toolbar={
            <div className="table-page-toolbar-row" style={{ alignItems: 'stretch' }}>
              <div className="table-search-wrap">
                <span className="table-search-icon-btn" aria-hidden>
                  <FaIcon name="magnifying-glass" />
                </span>
                <input
                  type="search"
                  className="form-control table-search-input"
                  placeholder={`Rechercher ${LABELS[activeKey]}…`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <button type="button" className="btn btn-primary" onClick={() => addValue(activeKey)}>
                <FaIcon name="plus" className="fa-inline-icon" /> Ajouter
              </button>
            </div>
          }
        >
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>NOM</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v}>
                    <td>{v}</td>
                    <td>
                      <div className="actions-cell" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn-icon btn-edit"
                          title="Modifier"
                          onClick={() => editValue(activeKey, v)}
                        >
                          <FaIcon name="pen-to-square" />
                        </button>
                        <button
                          type="button"
                          className="btn-icon btn-delete"
                          title="Supprimer"
                          onClick={() => removeValue(activeKey, v)}
                        >
                          <FaIcon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TablePageShell>
      </div>
    </div>
  );
}
