import React, { useEffect, useState } from 'react';
import { isConsultateurRole } from '../authUtils';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';

export default function EntitesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Entités organisationnelles', 'Référentiel');
  const isConsult = isConsultateurRole(user);
  const [modal, setModal] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const entityTypes = getTypeOptions('entityTypes');

  const reload = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/organizational-entities');
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

  const parentName = (parentId) => {
    if (parentId == null) return '—';
    const p = rows.find((x) => x.id === parentId);
    return p ? p.nom : '—';
  };

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const parentRaw = fd.get('parentId');
    const parentId = parentRaw && String(parentRaw).trim() !== '' ? Number(parentRaw) : null;
    const body = {
      code: fd.get('code'),
      nom: fd.get('nom'),
      type: fd.get('type'),
      parentId,
    };
    try {
      await parseJsonOrThrow(await apiFetch('/api/organizational-entities', { method: 'POST', body }));
      setModal(null);
      addToast('success', 'Entité enregistrée !');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const form = (
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="form-group">
          <label>
            Code entité <span className="required">*</span>
          </label>
          <input name="code" className="form-control" placeholder="DIR-XXX" required />
        </div>
        <div className="form-group">
          <label>
            Nom entité <span className="required">*</span>
          </label>
          <input name="nom" className="form-control" required />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select name="type" className="form-control" required>
            {entityTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Entité parente</label>
          <select name="parentId" className="form-control">
            <option value="">— Aucune —</option>
            {rows.map((ent) => (
              <option key={ent.id} value={String(ent.id)}>
                {ent.nom}
              </option>
            ))}
          </select>
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

  const typeColors = { Direction: 'badge-primary', Département: 'badge-info', Service: 'badge-success', Division: 'badge-warning' };

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
        title="Liste des entités organisationnelles"
        icon="landmark"
        toolbar={
          <div className="table-page-toolbar-row">
            <span style={{ color: 'var(--gray-600)', fontSize: '14px' }}>{rows.length} entité{rows.length !== 1 ? 's' : ''}</span>
            <span className="toolbar-spacer" />
            {!isConsult && (
              <button type="button" className="btn btn-primary" onClick={() => setModal({ title: 'Nouvelle entité', content: form })}>
                <FaIcon name="plus" className="fa-inline-icon" /> Nouvelle entité
              </button>
            )}
          </div>
        }
      >
        <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Nom</th>
                  <th>Type</th>
                  <th>Entité parente</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--primary-600)', fontSize: '13px' }}>{e.code}</span>
                    </td>
                    <td style={{ fontWeight: '500' }}>{e.nom}</td>
                    <td>
                      <span className={`badge ${typeColors[e.type] || 'badge-info'}`}>{e.type}</span>
                    </td>
                    <td style={{ color: 'var(--gray-500)' }}>{parentName(e.parentId)}</td>
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view" type="button">
                        <FaIcon name="eye" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
      </TablePageShell>
    </>
  );
}
