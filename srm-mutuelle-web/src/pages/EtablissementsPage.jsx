import { useEffect, useMemo, useState } from 'react';
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
  { key: 'nom', label: 'Nom' },
  { key: 'type', label: 'Type' },
  { key: 'adresse', label: 'Adresse' },
  { key: 'telephone', label: 'Téléphone' },
  { key: 'medecins', label: 'Médecins', value: (r) => (r.medecins || []).join(', ') },
];

const TYPE_FA = { Hôpital: 'hospital', Clinique: 'building', Opticien: 'glasses', Laboratoire: 'flask' };
const TYPE_BADGE = { Hôpital: 'badge-danger', Clinique: 'badge-primary', Opticien: 'badge-info', Laboratoire: 'badge-success' };

export default function EtablissementsPage({ setPageTitle, addToast, user }) {
  setPageTitle('Établissements médicaux', 'Référentiel');
  const canMutate = canStaffMutate(user);
  const canDelete = canAdminDelete(user);
  const [searchQuery, setSearchQuery] = useState('');
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

  const closeModal = () => setModal(null);

  const data = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    return rows.filter((e) =>
      matchesSearch(searchQuery, e.nom, e.type, e.adresse, e.telephone, ...(e.medecins || [])),
    );
  }, [rows, searchQuery]);

  const { pageData, page, setPage, totalPages } = usePagination(data, searchQuery);

  const buildForm = (facility = null) => {
    const isEdit = !!facility;

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
        const url = isEdit ? `/api/medical-facilities/${facility.id}` : '/api/medical-facilities';
        const method = isEdit ? 'PUT' : 'POST';
        await parseJsonOrThrow(await apiFetch(url, { method, body }));
        closeModal();
        addToast('success', isEdit ? 'Établissement mis à jour' : 'Établissement ajouté');
        reload();
      } catch (err) {
        addToast('error', err.message || 'Erreur');
      }
    };

    return (
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Nom</label>
            <input name="nom" className="form-control" defaultValue={facility?.nom ?? ''} required />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select name="type" className="form-control" defaultValue={facility?.type ?? facilityTypes[0]} required>
              {facilityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Adresse</label>
            <input name="adresse" className="form-control" defaultValue={facility?.adresse ?? ''} />
          </div>
          <div className="form-group">
            <label>Téléphone</label>
            <input name="telephone" className="form-control" defaultValue={facility?.telephone ?? ''} />
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

  const viewFacility = (facility) => {
    setModal({
      title: facility.nom,
      content: (
        <div>
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">Type</div>
              <div className="detail-value">
                <span className={`badge ${TYPE_BADGE[facility.type] || 'badge-info'}`}>{facility.type}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Adresse</div>
              <div className="detail-value">{facility.adresse || '—'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Téléphone</div>
              <div className="detail-value">{facility.telephone || '—'}</div>
            </div>
          </div>
          {facility.medecins?.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-500)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Médecins conventionnés
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {facility.medecins.map((m, i) => (
                  <span key={i} className="badge badge-primary" style={{ fontSize: '11px' }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="modal-footer" style={{ padding: '16px 0 0', marginTop: '16px' }}>
            <button type="button" className="btn btn-outline" onClick={closeModal}>
              Fermer
            </button>
            {canMutate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setModal({ title: `Modifier — ${facility.nom}`, content: buildForm(facility) })}
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
        title="Liste des établissements médicaux"
        icon="building"
        toolbar={
          <ListPageToolbar
            searchValue={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            searchPlaceholder="Rechercher (nom, type, adresse, téléphone, médecin…)"
            searchAriaLabel="Rechercher un établissement"
            exportColumns={EXPORT_COLS}
            exportRows={data}
            exportFilename="etablissements"
            showNew={canMutate}
            newLabel="Nouvel établissement"
            onNew={() => setModal({ title: 'Nouvel établissement', content: buildForm() })}
          />
        }
      >
        <div className="detail-grid facility-cards-grid">
          {pageData.map((e) => (
            <div className="card" key={e.id} style={{ overflow: 'hidden' }}>
              <div className="card-header" style={{ background: 'linear-gradient(135deg, var(--primary-50), var(--gray-50))' }}>
                <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <FaIcon name={TYPE_FA[e.type] || 'building'} /> {e.nom}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span className={`badge ${TYPE_BADGE[e.type] || 'badge-info'}`}>{e.type}</span>
                  <button className="btn btn-icon btn-view" type="button" title="Voir" onClick={() => viewFacility(e)}>
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
                          url: `/api/medical-facilities/${e.id}`,
                          label: e.nom,
                          addToast,
                          onSuccess: reload,
                        })
                      }
                    />
                  )}
                </div>
              </div>
              <div className="card-body">
                <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '8px' }}>
                  <FaIcon name="location-dot" className="fa-inline-icon" /> {e.adresse || '—'}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '12px' }}>
                  <FaIcon name="phone" className="fa-inline-icon" /> {e.telephone || '—'}
                </p>
                {e.medecins && e.medecins.length > 0 && (
                  <div>
                    <p
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--gray-500)',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
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
        {data.length === 0 && (
          <p style={{ padding: '24px 20px', color: 'var(--gray-500)', textAlign: 'center' }}>
            Aucun établissement ne correspond à votre recherche.
          </p>
        )}
        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </TablePageShell>
    </>
  );
}
