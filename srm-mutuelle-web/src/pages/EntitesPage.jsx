import React, { useEffect, useMemo, useState } from 'react';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { canAdminDelete, canStaffMutate } from '../authUtils';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import { matchesSearch } from '../utils/filterSearch';
import AdminDeleteButton from '../components/AdminDeleteButton';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';
import { adminDeleteRecord } from '../utils/adminDelete';

const EXPORT_COLS = [
  { key: 'code', label: 'Code' },
  { key: 'nom', label: 'Nom' },
  { key: 'type', label: 'Type' },
  { key: 'parentLabel', label: 'Entité parente' },
];

const TYPE_COLORS = {
  'Direction générale': 'badge-primary',
  Direction: 'badge-primary',
  Département: 'badge-info',
  Division: 'badge-warning',
  Service: 'badge-success',
};

export default function EntitesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Entités organisationnelles', 'Référentiel');
  const canMutate = canStaffMutate(user);
  const canDelete = canAdminDelete(user);
  const [modal, setModal] = useState(null);
  const [rows, setRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    return rows.filter((e) => matchesSearch(searchQuery, e.code, e.nom, e.type, parentName(e.parentId)));
  }, [rows, searchQuery]);

  const { pageData, page, setPage, totalPages } = usePagination(filteredRows);

  const closeModal = () => setModal(null);

  const buildForm = (entity = null) => {
    const isEdit = !!entity;
    const parentOptions = rows.filter((ent) => !entity || ent.id !== entity.id);

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
        const url = isEdit ? `/api/organizational-entities/${entity.id}` : '/api/organizational-entities';
        const method = isEdit ? 'PUT' : 'POST';
        await parseJsonOrThrow(await apiFetch(url, { method, body }));
        closeModal();
        addToast('success', isEdit ? 'Entité mise à jour' : 'Entité enregistrée');
        reload();
      } catch (err) {
        addToast('error', err.message || 'Erreur');
      }
    };

    return (
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-group">
            <label>
              Code entité <span className="required">*</span>
            </label>
            <input name="code" className="form-control" placeholder="DIR-XXX" defaultValue={entity?.code ?? ''} required />
          </div>
          <div className="form-group">
            <label>
              Nom entité <span className="required">*</span>
            </label>
            <input name="nom" className="form-control" defaultValue={entity?.nom ?? ''} required />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select name="type" className="form-control" defaultValue={entity?.type ?? entityTypes[0]} required>
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Entité parente</label>
            <select name="parentId" className="form-control" defaultValue={entity?.parentId != null ? String(entity.parentId) : ''}>
              <option value="">— Aucune —</option>
              {parentOptions.map((ent) => (
                <option key={ent.id} value={String(ent.id)}>
                  {ent.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '16px 0 0' }}>
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary">
            <FaIcon name="floppy-disk" className="fa-inline-icon" /> {isEdit ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </div>
      </form>
    );
  };

  const viewEntity = (entity) => {
    setModal({
      title: entity.nom,
      content: (
        <div className="detail-grid">
          <div className="detail-item">
            <div className="detail-label">Code</div>
            <div className="detail-value" style={{ fontFamily: 'monospace' }}>
              {entity.code}
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Type</div>
            <div className="detail-value">
              <span className={`badge ${TYPE_COLORS[entity.type] || 'badge-info'}`}>{entity.type}</span>
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Entité parente</div>
            <div className="detail-value">{parentName(entity.parentId)}</div>
          </div>
          <div className="modal-footer" style={{ padding: '16px 0 0', gridColumn: '1 / -1' }}>
            <button type="button" className="btn btn-outline" onClick={closeModal}>
              Fermer
            </button>
            {canMutate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setModal({ title: `Modifier — ${entity.nom}`, content: buildForm(entity) })}
              >
                <FaIcon name="pen-to-square" className="fa-inline-icon" /> Modifier
              </button>
            )}
          </div>
        </div>
      ),
    });
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">Chargement…</div>
      </div>
    );
  }

  return (
    <>
      {modal && (
        <Modal title={modal.title} onClose={closeModal}>
          {modal.content}
        </Modal>
      )}
      <TablePageShell
        title="Liste des entités organisationnelles"
        icon="landmark"
        toolbar={
          <ListPageToolbar
            searchValue={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            searchPlaceholder="Rechercher (code, nom, type…)"
            exportColumns={EXPORT_COLS}
            exportRows={filteredRows.map((e) => ({ ...e, parentLabel: parentName(e.parentId) }))}
            exportFilename="entites"
            showNew={canMutate}
            newLabel="Nouvelle entité"
            onNew={() => setModal({ title: 'Nouvelle entité', content: buildForm() })}
          />
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
              {pageData.map((e) => (
                <tr key={e.id}>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--primary-600)', fontSize: '13px' }}>
                      {e.code}
                    </span>
                  </td>
                  <td style={{ fontWeight: '500' }}>{e.nom}</td>
                  <td>
                    <span className={`badge ${TYPE_COLORS[e.type] || 'badge-info'}`}>{e.type}</span>
                  </td>
                  <td style={{ color: 'var(--gray-500)' }}>{parentName(e.parentId)}</td>
                  <td className="actions-cell">
                    <button className="btn btn-icon btn-view" type="button" title="Voir" onClick={() => viewEntity(e)}>
                      <FaIcon name="eye" />
                    </button>
                    {canMutate && (
                      <button
                        className="btn btn-icon btn-edit"
                        type="button"
                        title="Modifier"
                        onClick={() => setModal({ title: `Modifier — ${e.nom}`, content: buildForm(e) })}
                      >
                        <FaIcon name="pen-to-square" />
                      </button>
                    )}
                    {canDelete && (
                      <AdminDeleteButton
                        onClick={() =>
                          adminDeleteRecord({
                            url: `/api/organizational-entities/${e.id}`,
                            label: e.nom,
                            addToast,
                            onSuccess: reload,
                          })
                        }
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </TablePageShell>
    </>
  );
}
