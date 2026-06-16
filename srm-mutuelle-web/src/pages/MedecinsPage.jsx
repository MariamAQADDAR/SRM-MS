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
import { adminDeleteRecord } from '../utils/adminDelete';

const EXPORT_COLS = [
  { key: 'fullName', label: 'Nom Complet' },
  { key: 'facilityName', label: 'Établissement Rattaché' },
];

export default function MedecinsPage({ setPageTitle, addToast, user }) {
  setPageTitle('Médecins conventionnés', 'Référentiel');
  const canMutate = canStaffMutate(user);
  const canDelete = canAdminDelete(user);
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const [docRes, facRes] = await Promise.all([
        apiFetch('/api/contracted-doctors'),
        apiFetch('/api/medical-facilities'),
      ]);
      setDoctors(await parseJsonOrThrow(docRes));
      setFacilities(await parseJsonOrThrow(facRes));
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

  const facilityMap = useMemo(() => {
    return Object.fromEntries(facilities.map((f) => [f.id, f]));
  }, [facilities]);

  const enrichedDoctors = useMemo(() => {
    return doctors.map((d) => {
      const fac = facilityMap[d.medicalFacilityId];
      return {
        ...d,
        facilityName: fac ? fac.nom : '—',
        facilityType: fac ? fac.type : '',
        facilityAddress: fac ? fac.adresse : '',
        facilityPhone: fac ? fac.telephone : '',
      };
    });
  }, [doctors, facilityMap]);

  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return enrichedDoctors;
    return enrichedDoctors.filter((d) =>
      matchesSearch(searchQuery, d.fullName, d.facilityName, d.facilityType)
    );
  }, [enrichedDoctors, searchQuery]);

  const { pageData, page, setPage, totalPages } = usePagination(filteredDoctors, searchQuery);

  const DoctorForm = ({ doctor = null, onClose }) => {
    const isEdit = !!doctor;
    const initialFacility = doctor?.medicalFacilityId ? facilities.find(f => f.id === doctor.medicalFacilityId) : null;
    const [facilitySearch, setFacilitySearch] = useState(initialFacility ? `${initialFacility.nom} (${initialFacility.type})` : '');
    const [medicalFacilityId, setMedicalFacilityId] = useState(doctor?.medicalFacilityId != null ? String(doctor.medicalFacilityId) : '');

    const submit = async (e) => {
      e.preventDefault();
      const body = {
        fullName: e.target.fullName.value,
        medicalFacilityId: Number(medicalFacilityId),
      };
      if (!medicalFacilityId) {
        addToast('error', 'Veuillez sélectionner un établissement rattaché existant dans la liste.');
        return;
      }
      try {
        const url = isEdit ? `/api/contracted-doctors/${doctor.id}` : '/api/contracted-doctors';
        const method = isEdit ? 'PUT' : 'POST';
        await parseJsonOrThrow(await apiFetch(url, { method, body }));
        onClose();
        addToast('success', isEdit ? 'Médecin mis à jour' : 'Médecin ajouté');
        reload();
      } catch (err) {
        addToast('error', err.message || 'Erreur');
      }
    };

    return (
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Nom complet</label>
            <input name="fullName" className="form-control" defaultValue={doctor?.fullName ?? ''} placeholder="Dr. ..." required />
          </div>
          <div className="form-group">
            <label>Établissement rattaché</label>
            <input
              list="doctor-facilities-list"
              className="form-control"
              placeholder="Écrire pour rechercher et sélectionner..."
              value={facilitySearch}
              onChange={(e) => {
                const val = e.target.value;
                setFacilitySearch(val);
                const matched = facilities.find(f => `${f.nom} (${f.type})` === val || f.nom === val);
                setMedicalFacilityId(matched ? String(matched.id) : '');
              }}
              required
            />
            <input type="hidden" name="medicalFacilityId" value={medicalFacilityId} />
            <datalist id="doctor-facilities-list">
              {facilities.map((f) => (
                <option key={f.id} value={`${f.nom} (${f.type})`} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '16px 0 0' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary">
            <FaIcon name="floppy-disk" className="fa-inline-icon" /> {isEdit ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </div>
      </form>
    );
  };

  const viewDoctor = (d) => {
    setModal({
      title: d.fullName,
      content: (
        <div>
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-label">Nom complet</div>
              <div className="detail-value">{d.fullName}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Établissement rattaché</div>
              <div className="detail-value">{d.facilityName}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Type d'établissement</div>
              <div className="detail-value">
                {d.facilityType ? <span className="badge badge-info">{d.facilityType}</span> : '—'}
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Adresse établissement</div>
              <div className="detail-value">{d.facilityAddress || '—'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">Téléphone établissement</div>
              <div className="detail-value">{d.facilityPhone || '—'}</div>
            </div>
          </div>
          <div className="modal-footer" style={{ padding: '16px 0 0', marginTop: '16px' }}>
            <button type="button" className="btn btn-outline" onClick={closeModal}>
              Fermer
            </button>
            {canMutate && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setModal({ title: `Modifier — ${d.fullName}`, content: <DoctorForm doctor={d} onClose={closeModal} /> })}
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
        title="Liste des médecins conventionnés"
        icon="user-doctor"
        toolbar={
          <ListPageToolbar
            searchValue={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            searchPlaceholder="Rechercher (nom, établissement, type…)"
            searchAriaLabel="Rechercher un médecin"
            exportColumns={EXPORT_COLS}
            exportRows={enrichedDoctors}
            exportFilename="medecins"
            showNew={canMutate}
            newLabel="Nouveau médecin"
            onNew={() => setModal({ title: 'Nouveau médecin', content: <DoctorForm doctor={null} onClose={closeModal} /> })}
          />
        }
      >
        <div className="detail-grid facility-cards-grid">
          {pageData.map((d) => (
            <div className="card" key={d.id} style={{ overflow: 'hidden' }}>
              <div className="card-header" style={{ background: 'linear-gradient(135deg, var(--primary-50), var(--gray-50))' }}>
                <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <FaIcon name="user-doctor" /> {d.fullName}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button className="btn btn-icon btn-view" type="button" title="Voir" onClick={() => viewDoctor(d)}>
                    <FaIcon name="eye" />
                  </button>
                  {canMutate && (
                    <button
                      className="btn btn-icon btn-edit"
                      type="button"
                      title="Modifier"
                      onClick={() => setModal({ title: `Modifier — ${d.fullName}`, content: <DoctorForm doctor={d} onClose={closeModal} /> })}
                    >
                      <FaIcon name="pen-to-square" />
                    </button>
                  )}
                  {canDelete && (
                    <AdminDeleteButton
                      onClick={() =>
                        adminDeleteRecord({
                          url: `/api/contracted-doctors/${d.id}`,
                          label: d.fullName,
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
                  <FaIcon name="building" className="fa-inline-icon" /> <strong>{d.facilityName}</strong>
                </p>
                {d.facilityType && (
                  <p style={{ fontSize: '12px', margin: 0 }}>
                    <span className="badge badge-secondary">{d.facilityType}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        {filteredDoctors.length === 0 && (
          <p style={{ padding: '24px 20px', color: 'var(--gray-500)', textAlign: 'center' }}>
            Aucun médecin ne correspond à votre recherche.
          </p>
        )}
        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </TablePageShell>
    </>
  );
}
