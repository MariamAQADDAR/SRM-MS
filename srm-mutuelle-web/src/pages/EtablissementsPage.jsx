import { useEffect, useState } from 'react';
import { isConsultateurRole } from '../authUtils';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';

export default function EtablissementsPage({ setPageTitle, addToast, user }) {
  setPageTitle('Établissements médicaux', 'Référentiel');
  const isConsult = isConsultateurRole(user);
  const [filterType, setFilterType] = useState('');
  const [modal, setModal] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const facilityTypes = getTypeOptions('facilityTypes');

  const reload = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/medical-facilities');
      setRows(await parseJsonOrThrow(res));
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  let data = [...rows];
  if (filterType) data = data.filter((e) => e.type === filterType);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      nom: fd.get('nom'),
      type: fd.get('type'),
      adresse: fd.get('adresse') || '',
      telephone: fd.get('telephone') || '',
    };
    try {
      await parseJsonOrThrow(await apiFetch('/api/medical-facilities', { method: 'POST', body }));
      setModal(null);
      addToast('success', 'Établissement ajouté !');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const form = (
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="form-group">
          <label>Nom</label>
          <input name="nom" className="form-control" required />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select name="type" className="form-control" required>
            {facilityTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Adresse</label>
          <input name="adresse" className="form-control" />
        </div>
        <div className="form-group">
          <label>Téléphone</label>
          <input name="telephone" className="form-control" />
        </div>
      </div>
      <div className="modal-footer" style={{ padding: '16px 0 0' }}>
        <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary">
          <FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer
        </button>
      </div>
    </form>
  );

  const typeFa = { Hôpital: 'hospital', Clinique: 'building', Opticien: 'glasses', Laboratoire: 'flask' };
  const typeBadgeClass = { Hôpital: 'badge-danger', Clinique: 'badge-primary', Opticien: 'badge-info', Laboratoire: 'badge-success' };

  if (loading) {
    return <div className="card"><div className="card-body">Chargement…</div></div>;
  }

  return (
    <>
      {modal && (
        <Modal title={modal.title} onClose={() => setModal(null)}>
          {modal.content}
        </Modal>
      )}
      <TablePageShell
        title="Liste des établissements médicaux"
        icon="building"
        toolbar={
          <div className="table-page-toolbar-row">
            <div className="filter-group">
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="form-control" aria-label="Filtrer par type">
                <option value="">Tous les types</option>
                {facilityTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <span style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
              {data.length} établissement{data.length !== 1 ? 's' : ''}
            </span>
            <span className="toolbar-spacer" />
            {!isConsult && (
              <button type="button" className="btn btn-primary" onClick={() => setModal({ title: 'Nouvel établissement', content: form })}>
                <FaIcon name="plus" className="fa-inline-icon" /> Nouvel établissement
              </button>
            )}
          </div>
        }
      >
        <div className="detail-grid">
          {data.map((e) => (
            <div className="card" key={e.id} style={{ overflow: 'hidden' }}>
              <div className="card-header" style={{ background: 'linear-gradient(135deg, var(--primary-50), var(--gray-50))' }}>
                <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaIcon name={typeFa[e.type] || 'building'} /> {e.nom}
                </h3>
                <span className={`badge ${typeBadgeClass[e.type] || 'badge-info'}`}>{e.type}</span>
              </div>
              <div className="card-body">
                <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '8px' }}>
                  <FaIcon name="location-dot" className="fa-inline-icon" />
                  {e.adresse || '—'}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '12px' }}>
                  <FaIcon name="phone" className="fa-inline-icon" />
                  {e.telephone || '—'}
                </p>
                {e.medecins && e.medecins.length > 0 && (
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Médecins
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {e.medecins.map((m, i) => (
                        <span key={i} className="badge badge-primary" style={{ fontSize: '11px' }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </TablePageShell>
    </>
  );
}
