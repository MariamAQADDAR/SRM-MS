import React, { useEffect, useMemo, useState } from 'react';
import { usePagination } from '../hooks/usePagination';
import TablePagination from '../components/TablePagination';
import { isAdherentRole, canAdminDelete, canStaffMutate } from '../authUtils';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import { matchesSearch } from '../utils/filterSearch';
import AdminDeleteButton from '../components/AdminDeleteButton';
import DetailModalFooter from '../components/DetailModalFooter';
import DetailItem from '../components/DetailItem';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';
import { adminDeleteRecord } from '../utils/adminDelete';

const EXPORT_COLS = [
  { key: 'numero', label: 'N°' },
  { key: 'typeMaladie', label: 'Type maladie' },
  { key: 'dateDeclaration', label: 'Date déclaration' },
  { key: 'beneficiaire', label: 'Bénéficiaire' },
  { key: 'statut', label: 'Statut' },
];

function statusBadge(statut) {
  const map = { Validé: 'badge-success', 'En cours': 'badge-primary', 'En attente': 'badge-warning' };
  return <span className={`badge ${map[statut] || 'badge-info'}`}>{statut}</span>;
}

function formatDate(d) {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : '';
  if (!s) return '—';
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
}

export default function MaladiesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Maladies spéciales', 'Gestion des maladies spéciales');
  const canMutate = canStaffMutate(user);
  const canDelete = canAdminDelete(user);
  const adherent = isAdherentRole(user);
  const [modal, setModal] = useState(null);
  const [diseases, setDiseases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const maladieTypes = getTypeOptions('maladieTypes');
  const filteredDiseases = useMemo(() => {
    if (!searchQuery.trim()) return diseases;
    return diseases.filter((d) =>
      matchesSearch(searchQuery, d.numero, d.typeMaladie, d.beneficiaire, d.statut),
    );
  }, [diseases, searchQuery]);

  const { pageData, page, setPage, totalPages } = usePagination(filteredDiseases);

  const reload = async () => {
    setLoading(true);
    try {
      const dRes = await apiFetch('/api/special-diseases');
      setDiseases(await parseJsonOrThrow(dRes));
      if (adherent) {
        const mRes = await apiFetch('/api/medicines');
        setMedicines(await parseJsonOrThrow(mRes));
      } else if (canMutate) {
        const aRes = await apiFetch('/api/agents');
        setAgents(await parseJsonOrThrow(aRes));
      }
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [adherent, canMutate]);

  const closeModal = () => setModal(null);

  const buildForm = (record = null) => {
    const isEdit = !!record;
    const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const agentLabel = fd.get('beneficiaire');
    const agent = agents.find((a) => `${a.prenom} ${a.nom}` === agentLabel);
    if (!agent) {
      addToast('error', 'Agent invalide');
      return;
    }
    const body = {
      numero: record?.numero,
      typeMaladie: fd.get('typeMaladie'),
      dateDeclaration: fd.get('dateDeclaration'),
      agentId: agent.id,
      beneficiaire: agentLabel,
      statut: fd.get('statut') || record?.statut || 'En attente',
    };
    try {
      const url = isEdit ? `/api/special-diseases/${record.id}` : '/api/special-diseases';
      await parseJsonOrThrow(await apiFetch(url, { method: isEdit ? 'PUT' : 'POST', body }));
      closeModal();
      addToast('success', isEdit ? 'Dossier mis à jour' : 'Dossier créé !');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
    };

    return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="form-group">
          <label>Bénéficiaire</label>
          <select name="beneficiaire" className="form-control" defaultValue={record?.beneficiaire ?? ''} required>
            {agents.map((a) => (
              <option key={a.id} value={`${a.prenom} ${a.nom}`}>
                {a.prenom} {a.nom}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Type de maladie</label>
          <select name="typeMaladie" className="form-control" defaultValue={record?.typeMaladie ?? maladieTypes[0]} required>
            {maladieTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {isEdit && (
          <div className="form-group">
            <label>Statut</label>
            <select name="statut" className="form-control" defaultValue={record.statut}>
              <option>En attente</option>
              <option>En cours</option>
              <option>Validé</option>
            </select>
          </div>
        )}
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label>Date de déclaration</label>
          <input
            name="dateDeclaration"
            type="date"
            className="form-control"
            defaultValue={record?.dateDeclaration ?? new Date().toISOString().split('T')[0]}
            required
          />
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

  const viewRecord = (m) => {
    setModal({
      title: `Dossier ${m.numero}`,
      content: (
        <div className="detail-grid">
          <DetailItem label="N°">{m.numero}</DetailItem>
          <DetailItem label="Type">
            <span className="badge badge-warning">{m.typeMaladie}</span>
          </DetailItem>
          <DetailItem label="Date déclaration">{formatDate(m.dateDeclaration)}</DetailItem>
          <DetailItem label="Bénéficiaire">{m.beneficiaire}</DetailItem>
          <DetailItem label="Statut">{statusBadge(m.statut)}</DetailItem>
          <DetailModalFooter
            onClose={closeModal}
            canEdit={canMutate}
            onEdit={() => setModal({ title: `Modifier — ${m.numero}`, content: buildForm(m) })}
          />
        </div>
      ),
    });
  };

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
      {adherent && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="card-header">
            <h3>
              <FaIcon name="pills" className="fa-inline-icon" /> Médicaments (référentiel)
            </h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {medicines.slice(0, 40).map((m) => (
                <span key={m.id} className={`badge ${m.reimbursed ? 'badge-success' : 'badge-info'}`}>
                  {m.name}
                </span>
              ))}
              {medicines.length === 0 && <span style={{ color: 'var(--gray-500)' }}>Aucune entrée.</span>}
            </div>
          </div>
        </div>
      )}

      <TablePageShell
        title="Liste des maladies spéciales"
        icon="stethoscope"
        toolbar={
          <ListPageToolbar
            searchValue={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            searchPlaceholder="Rechercher (n°, type, bénéficiaire…)"
            exportColumns={EXPORT_COLS}
            exportRows={filteredDiseases}
            exportFilename="maladies-speciales"
            showNew={canMutate && !adherent}
            newLabel="Nouveau dossier"
            onNew={() => setModal({ title: 'Nouveau dossier maladie spéciale', content: buildForm() })}
          />
        }
      >
        <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Type maladie</th>
                  <th>Date déclaration</th>
                  <th>Bénéficiaire</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((m) => (
                  <tr key={m.id}>
                    <td>{m.numero}</td>
                    <td>
                      <span className="badge badge-warning">{m.typeMaladie}</span>
                    </td>
                    <td>{formatDate(m.dateDeclaration)}</td>
                    <td>{m.beneficiaire}</td>
                    <td>{statusBadge(m.statut)}</td>
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view" type="button" title="Voir" onClick={() => viewRecord(m)}>
                        <FaIcon name="eye" />
                      </button>
                      {canMutate && (
                        <button
                          className="btn btn-icon btn-edit"
                          type="button"
                          title="Modifier"
                          onClick={() => setModal({ title: `Modifier — ${m.numero}`, content: buildForm(m) })}
                        >
                          <FaIcon name="pen-to-square" />
                        </button>
                      )}
                      {canDelete && (
                        <AdminDeleteButton
                          onClick={() =>
                            adminDeleteRecord({
                              url: `/api/special-diseases/${m.id}`,
                              label: m.numero,
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
