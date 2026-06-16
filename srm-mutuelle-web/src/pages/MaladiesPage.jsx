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
import SearchableSelect from '../components/SearchableSelect';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';
import { adminDeleteRecord } from '../utils/adminDelete';

const META_KEY = 'mutuelle_maladies_meta_v1';

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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

function renderScanLink(scanVal) {
  if (!scanVal || scanVal === '—') return '—';
  if (scanVal.startsWith('data:')) {
    const isPdf = scanVal.startsWith('data:application/pdf');
    return (
      <a
        href={scanVal}
        download={isPdf ? "scan-dossier-maladie.pdf" : "scan-dossier-maladie"}
        target="_blank"
        rel="noreferrer"
        className="btn btn-sm btn-outline"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', fontSize: '11px', textDecoration: 'none' }}
      >
        <FaIcon name="download" /> Télécharger
      </a>
    );
  }
  return scanVal;
}

function readMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta || {}));
}

function DiseaseForm({ record, agents, maladieTypes, onSave, onCancel, addToast }) {
  const [selectedAgentId, setSelectedAgentId] = useState(record ? String(record.agentId || '') : '');
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(record ? record.beneficiaire : '');
  const [scanFile, setScanFile] = useState(null);

  const isCustomType = record && record.typeMaladie && !maladieTypes.includes(record.typeMaladie);
  const [selectedType, setSelectedType] = useState(isCustomType ? 'Autre' : (record?.typeMaladie ?? maladieTypes[0]));
  const [customType, setCustomType] = useState(isCustomType ? record.typeMaladie : '');

  useEffect(() => {
    if (!selectedAgentId) {
      setBeneficiaries([]);
      return;
    }
    let active = true;
    apiFetch(`/api/beneficiaries?agentId=${selectedAgentId}`)
      .then(parseJsonOrThrow)
      .then((data) => {
        if (active) setBeneficiaries(data);
      })
      .catch((err) => {
        console.error(err);
        if (active) setBeneficiaries([]);
      });
    return () => {
      active = false;
    };
  }, [selectedAgentId]);

  const selectedAgent = useMemo(() => {
    return agents.find((a) => String(a.id) === String(selectedAgentId));
  }, [agents, selectedAgentId]);

  const beneficiaryOptions = useMemo(() => {
    const opts = [];
    if (selectedAgent) {
      opts.push({
        value: `${selectedAgent.prenom} ${selectedAgent.nom}`,
        label: `${selectedAgent.prenom} ${selectedAgent.nom} (Titulaire)`,
      });
    }
    (beneficiaries || []).forEach((b) => {
      opts.push({
        value: `${b.prenom} ${b.nom}`,
        label: `${b.prenom} ${b.nom} (${b.linkType || b.type})`,
      });
    });
    return opts;
  }, [selectedAgent, beneficiaries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAgentId) {
      addToast('error', 'Veuillez sélectionner un agent.');
      return;
    }
    if (!selectedBeneficiary) {
      addToast('error', 'Veuillez sélectionner un bénéficiaire.');
      return;
    }
    
    const finalType = selectedType === 'Autre' ? customType : selectedType;
    if (!finalType || !finalType.trim()) {
      addToast('error', 'Veuillez préciser le type de maladie.');
      return;
    }

    let fileBase64 = '';
    if (scanFile) {
      try {
        fileBase64 = await fileToBase64(scanFile);
      } catch (err) {
        console.error(err);
      }
    }
    onSave({
      agentId: Number(selectedAgentId),
      beneficiaire: selectedBeneficiary,
      typeMaladie: finalType.trim(),
      dateDeclaration: e.target.dateDeclaration.value,
      statut: e.target.statut?.value || record?.statut || 'En attente',
      scanFile: fileBase64,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <SearchableSelect
          label="Porteur (Agent)"
          placeholder="Choisir un agent…"
          value={selectedAgentId}
          onChange={(val) => {
            setSelectedAgentId(val);
            setSelectedBeneficiary('');
          }}
          required
          options={agents.map((a) => ({
            value: String(a.id),
            label: `${a.matricule} — ${a.prenom} ${a.nom}`,
          }))}
        />

        <SearchableSelect
          label="Bénéficiaire"
          placeholder="Choisir un bénéficiaire…"
          value={selectedBeneficiary}
          onChange={setSelectedBeneficiary}
          required
          options={beneficiaryOptions}
          disabled={!selectedAgentId}
        />

        <div className="form-group">
          <label>Type de maladie</label>
          <select
            name="typeMaladieSelect"
            className="form-control"
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              if (e.target.value !== 'Autre') {
                setCustomType('');
              }
            }}
            required
          >
            {maladieTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {selectedType === 'Autre' && (
          <div className="form-group">
            <label>Préciser le type de maladie</label>
            <input
              type="text"
              className="form-control"
              placeholder="Saisir le type de maladie..."
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              required
            />
          </div>
        )}

        <div className="form-group">
          <label>Date de déclaration</label>
          <input
            name="dateDeclaration"
            type="date"
            className="form-control"
            defaultValue={record?.dateDeclaration ?? new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        {record && (
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
          <label>Scan du dossier de maladie (PDF ou Image)</label>
          <input
            type="file"
            accept="application/pdf,image/*"
            className="form-control"
            onChange={(ev) => setScanFile(ev.target.files?.[0] || null)}
          />
        </div>
      </div>
      <div className="modal-footer" style={{ padding: '16px 0 0' }}>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn btn-primary">
          <FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer
        </button>
      </div>
    </form>
  );
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
  const [metaById, setMetaById] = useState(readMeta());
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

  const handleSaveDisease = async (formData, record = null) => {
    const isEdit = !!record;
    const body = {
      numero: record?.numero,
      typeMaladie: formData.typeMaladie,
      dateDeclaration: formData.dateDeclaration,
      agentId: formData.agentId,
      beneficiaire: formData.beneficiaire,
      statut: formData.statut,
    };
    try {
      const url = isEdit ? `/api/special-diseases/${record.id}` : '/api/special-diseases';
      const saved = await parseJsonOrThrow(await apiFetch(url, { method: isEdit ? 'PUT' : 'POST', body }));
      
      const recordId = isEdit ? record.id : saved.id;
      if (recordId != null) {
        const nextMeta = { ...metaById };
        if (formData.scanFile) {
          nextMeta[recordId] = { scanFile: formData.scanFile };
        } else if (isEdit && metaById[recordId]) {
          nextMeta[recordId] = metaById[recordId];
        }
        setMetaById(nextMeta);
        writeMeta(nextMeta);
      }

      closeModal();
      addToast('success', isEdit ? 'Dossier mis à jour' : 'Dossier créé !');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const viewRecord = (m) => {
    const meta = metaById[m.id] || {};
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
          <DetailItem label="Scan">{meta.scanFile ? renderScanLink(meta.scanFile) : '—'}</DetailItem>
          <DetailItem label="Statut">{statusBadge(m.statut)}</DetailItem>
          <DetailModalFooter
            onClose={closeModal}
            canEdit={canMutate}
            onEdit={() => setModal({ title: `Modifier — ${m.numero}`, content: (
              <DiseaseForm
                record={m}
                agents={agents}
                maladieTypes={maladieTypes}
                onSave={(data) => handleSaveDisease(data, m)}
                onCancel={closeModal}
                addToast={addToast}
              />
            ) })}
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
        <Modal title={modal.title} onClose={closeModal}>
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
            onNew={() => setModal({ title: 'Nouveau dossier maladie spéciale', content: (
              <DiseaseForm
                agents={agents}
                maladieTypes={maladieTypes}
                onSave={(data) => handleSaveDisease(data, null)}
                onCancel={closeModal}
                addToast={addToast}
              />
            ) })}
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
                  <th>Scan</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((m) => {
                  const meta = metaById[m.id] || {};
                  return (
                    <tr key={m.id}>
                      <td>{m.numero}</td>
                      <td>
                        <span className="badge badge-warning">{m.typeMaladie}</span>
                      </td>
                      <td>{formatDate(m.dateDeclaration)}</td>
                      <td>{m.beneficiaire}</td>
                      <td>{meta.scanFile ? renderScanLink(meta.scanFile) : '—'}</td>
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
                            onClick={() => setModal({ title: `Modifier — ${m.numero}`, content: (
                              <DiseaseForm
                                record={m}
                                agents={agents}
                                maladieTypes={maladieTypes}
                                onSave={(data) => handleSaveDisease(data, m)}
                                onCancel={closeModal}
                                addToast={addToast}
                              />
                            ) })}
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
                  );
                })}
              </tbody>
            </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </TablePageShell>
    </>
  );
}
