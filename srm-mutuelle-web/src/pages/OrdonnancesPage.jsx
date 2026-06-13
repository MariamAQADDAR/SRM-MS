import React, { useEffect, useMemo, useState } from 'react';
import { isConsultateurRole, canAdminDelete, canStaffMutate } from '../authUtils';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import SearchableSelect from '../components/SearchableSelect';
import TablePageShell from '../components/TablePageShell';
import ListPageToolbar from '../components/ListPageToolbar';
import TablePagination from '../components/TablePagination';
import { usePagination } from '../hooks/usePagination';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';
import { matchesSearch } from '../utils/filterSearch';
import AdminDeleteButton from '../components/AdminDeleteButton';
import DetailModalFooter from '../components/DetailModalFooter';
import DetailItem from '../components/DetailItem';
import { adminDeleteRecord } from '../utils/adminDelete';

const META_KEY = 'mutuelle_ordonnances_meta_v2';

function formatDate(d) {
  if (!d) return '—';
  const s = typeof d === 'string' ? d : '';
  if (!s) return '—';
  const [y, m, day] = s.split('-');
  return `${day}/${m}/${y}`;
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

function kindFromPrestation(typePrestation) {
  if (/analyse/i.test(String(typePrestation || ''))) return 'analyse';
  if (/radio/i.test(String(typePrestation || ''))) return 'radio';
  return 'ordonnance';
}

function typeForView(view, ordonnanceTypes) {
  if (view === 'analyse') return ordonnanceTypes.find((t) => /analyse/i.test(t)) || 'Analyse';
  if (view === 'radio') return ordonnanceTypes.find((t) => /radio/i.test(t)) || 'Radiologie';
  return ordonnanceTypes.find((t) => /m[ée]dicament/i.test(t)) || 'Médicament';
}

export default function OrdonnancesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Ordonnances', 'Gestion des ordonnances');
  const isConsult = isConsultateurRole(user);
  const canMutate = canStaffMutate(user);
  const canDelete = canAdminDelete(user);
  const [viewType, setViewType] = useState('analyse'); // analyse | ordonnance | radio
  const [searchQuery, setSearchQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [metaById, setMetaById] = useState(readMeta());
  const [loading, setLoading] = useState(true);
  const ordonnanceTypes = getTypeOptions('ordonnanceTypes');
  const radioTypes = getTypeOptions('radioTypes');

  const [formAgentId, setFormAgentId] = useState('');
  const [formBeneficiaries, setFormBeneficiaries] = useState([]);
  const [formBeneficiaryVal, setFormBeneficiaryVal] = useState('');

  useEffect(() => {
    if (!formAgentId) {
      setFormBeneficiaries([]);
      return;
    }
    let active = true;
    apiFetch(`/api/beneficiaries?agentId=${formAgentId}`)
      .then(parseJsonOrThrow)
      .then((data) => {
        if (active) setFormBeneficiaries(data);
      })
      .catch((err) => {
        console.error(err);
        if (active) setFormBeneficiaries([]);
      });
    return () => {
      active = false;
    };
  }, [formAgentId]);

  const selectedAgent = useMemo(() => {
    return agents.find((a) => String(a.id) === String(formAgentId));
  }, [agents, formAgentId]);

  const formBeneficiaryOptions = useMemo(() => {
    const opts = [];
    if (selectedAgent) {
      opts.push({
        value: `${selectedAgent.prenom} ${selectedAgent.nom}`,
        label: `${selectedAgent.prenom} ${selectedAgent.nom} (Titulaire)`,
      });
    }
    formBeneficiaries.forEach((b) => {
      opts.push({
        value: `${b.prenom} ${b.nom}`,
        label: `${b.prenom} ${b.nom} (${b.linkType})`,
      });
    });
    return opts;
  }, [selectedAgent, formBeneficiaries]);

  const reload = async () => {
    setLoading(true);
    try {
      const [oRes, aRes, dRes, fRes] = await Promise.all([
        apiFetch('/api/ordonnances'),
        apiFetch('/api/agents'),
        apiFetch('/api/contracted-doctors'),
        apiFetch('/api/medical-facilities'),
      ]);
      setRows(await parseJsonOrThrow(oRes));
      setAgents(await parseJsonOrThrow(aRes));
      setDoctors(await parseJsonOrThrow(dRes));
      setFacilities(await parseJsonOrThrow(fRes));
    } catch (e) {
      addToast('error', e.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const agentById = Object.fromEntries((agents || []).map((a) => [a.id, a]));
  const doctorById = Object.fromEntries((doctors || []).map((d) => [d.id, d]));
  const facilityById = Object.fromEntries((facilities || []).map((f) => [f.id, f]));

  const labOptions = facilities.filter((f) => /laboratoire/i.test(String(f.type || '')));
  const pharmacieOptions = facilities.filter((f) => /pharmacie/i.test(String(f.type || '')));
  const centreRadioOptions = facilities.filter((f) => /radio/i.test(String(f.type || '')) || /clinique/i.test(String(f.type || '')));

  const rowsView = rows.map((o) => {
    const meta = metaById[o.id] || {};
    const agent = agentById[o.agentId];
    const doctor = meta.doctorId ? doctorById[Number(meta.doctorId)] : null;
    const lab = meta.laboratoireId ? facilityById[Number(meta.laboratoireId)] : null;
    const pharm = meta.pharmacieId ? facilityById[Number(meta.pharmacieId)] : null;
    const centre = meta.centreRadiologieId ? facilityById[Number(meta.centreRadiologieId)] : null;
    return {
      ...o,
      matricule: agent?.matricule || '—',
      nomPrenomAgent: agent ? `${agent.nom} ${agent.prenom}` : o.beneficiaire,
      medecin: doctor?.fullName || meta.doctorId || '—',
      laboratoire: lab?.nom || meta.laboratoireId || '—',
      pharmacie: pharm?.nom || meta.pharmacieId || '—',
      centreRadiologie: centre?.nom || meta.centreRadiologieId || '—',
      dateAnalyse: meta.dateAnalyse || o.date,
      dateOrdonnance: meta.dateOrdonnance || o.date,
      dateRadio: meta.dateRadio || o.date,
      numInstance: meta.numInstance || o.numero,
      typeRadio: meta.typeRadio || '—',
      scanAnalyse: meta.scanAnalyse || '—',
      scanOrdonnance: meta.scanOrdonnance || '—',
      scanRadio: meta.scanRadio || '—',
      observation: meta.observation || '—',
    };
  });

  const wantedType = typeForView(viewType, ordonnanceTypes);
  const data = useMemo(() => {
    let list = rowsView.filter((x) => x.typePrestation === wantedType);
    if (searchQuery.trim()) {
      list = list.filter((o) => {
        const rawDate =
          viewType === 'analyse' ? o.dateAnalyse : viewType === 'ordonnance' ? o.dateOrdonnance : o.dateRadio;
        return matchesSearch(
          searchQuery,
          o.matricule,
          o.nomPrenomAgent,
          o.beneficiaire,
          o.medecin,
          o.laboratoire,
          o.pharmacie,
          o.centreRadiologie,
          o.typeRadio,
          o.numero,
          o.numInstance,
          o.statut,
          o.montant,
          o.observation,
          o.scanAnalyse,
          o.scanOrdonnance,
          o.scanRadio,
          rawDate,
          formatDate(rawDate),
        );
      });
    }
    return list;
  }, [rowsView, wantedType, viewType, searchQuery]);

  useEffect(() => {
    setSearchQuery('');
  }, [viewType]);

  const { pageData, page, setPage, totalPages } = usePagination(data, `${viewType}|${searchQuery}`);

  const exportColumns =
    viewType === 'analyse'
      ? [
          { key: 'matricule', label: 'Matricule' },
          { key: 'nomPrenomAgent', label: 'Agent' },
          { key: 'beneficiaire', label: 'Bénéficiaire' },
          { key: 'medecin', label: 'Médecin' },
          { key: 'laboratoire', label: 'Laboratoire' },
          { key: 'dateAnalyse', label: 'Date analyse' },
          { key: 'montant', label: 'Montant' },
          { key: 'statut', label: 'Statut' },
        ]
      : viewType === 'radio'
        ? [
            { key: 'matricule', label: 'Matricule' },
            { key: 'nomPrenomAgent', label: 'Agent' },
            { key: 'beneficiaire', label: 'Bénéficiaire' },
            { key: 'medecin', label: 'Médecin' },
            { key: 'centreRadiologie', label: 'Centre' },
            { key: 'dateRadio', label: 'Date' },
            { key: 'montant', label: 'Montant' },
            { key: 'typeRadio', label: 'Type radio' },
            { key: 'statut', label: 'Statut' },
          ]
        : [
            { key: 'matricule', label: 'Matricule' },
            { key: 'nomPrenomAgent', label: 'Agent' },
            { key: 'beneficiaire', label: 'Bénéficiaire' },
            { key: 'medecin', label: 'Médecin' },
            { key: 'pharmacie', label: 'Pharmacie' },
            { key: 'dateOrdonnance', label: 'Date' },
            { key: 'montant', label: 'Montant' },
            { key: 'statut', label: 'Statut' },
          ];

  const closeModal = () => setModal(null);

  const metaFromForm = (fd) => {
    const doctorLabel = String(fd.get('doctorId') || '').trim();
    const doc = doctors.find((d) => d.fullName === doctorLabel);
    const doctorIdVal = doc ? String(doc.id) : doctorLabel;

    const labLabel = String(fd.get('laboratoireId') || '').trim();
    const lab = labOptions.find((f) => f.nom === labLabel);
    const labIdVal = lab ? String(lab.id) : labLabel;

    const pharmLabel = String(fd.get('pharmacieId') || '').trim();
    const pharm = pharmacieOptions.find((f) => f.nom === pharmLabel);
    const pharmIdVal = pharm ? String(pharm.id) : pharmLabel;

    const centreLabel = String(fd.get('centreRadiologieId') || '').trim();
    const centre = centreRadioOptions.find((f) => f.nom === centreLabel);
    const centreIdVal = centre ? String(centre.id) : centreLabel;

    return {
      doctorId: doctorIdVal,
      laboratoireId: labIdVal,
      pharmacieId: pharmIdVal,
      centreRadiologieId: centreIdVal,
      dateAnalyse: String(fd.get('dateAnalyse') || '').trim(),
      dateOrdonnance: String(fd.get('dateOrdonnance') || '').trim(),
      dateRadio: String(fd.get('dateRadio') || '').trim(),
      numInstance: String(fd.get('numInstance') || '').trim(),
      typeRadio: String(fd.get('typeRadio') || '').trim(),
      scanAnalyse: String(fd.get('scanAnalyse') || '').trim(),
      scanOrdonnance: String(fd.get('scanOrdonnance') || '').trim(),
      scanRadio: String(fd.get('scanRadio') || '').trim(),
      observation: String(fd.get('observation') || '').trim(),
    };
  };

  const renderOrdonnanceFields = (kind, meta = {}) => {
    const docMatch = meta.doctorId ? (doctorById[Number(meta.doctorId)] || null) : null;
    const defaultValueDoctor = docMatch ? docMatch.fullName : (meta.doctorId || '');

    const labMatch = meta.laboratoireId ? (facilityById[Number(meta.laboratoireId)] || null) : null;
    const defaultValueLab = labMatch ? labMatch.nom : (meta.laboratoireId || '');

    const pharmMatch = meta.pharmacieId ? (facilityById[Number(meta.pharmacieId)] || null) : null;
    const defaultValuePharm = pharmMatch ? pharmMatch.nom : (meta.pharmacieId || '');

    const centreMatch = meta.centreRadiologieId ? (facilityById[Number(meta.centreRadiologieId)] || null) : null;
    const defaultValueCentre = centreMatch ? centreMatch.nom : (meta.centreRadiologieId || '');

    return (
      <>
        <SearchableSelect
          label="Porteur (Agent)"
          placeholder="Choisir un agent…"
          value={formAgentId}
          onChange={(val) => {
            setFormAgentId(val);
            setFormBeneficiaryVal('');
          }}
          required
          options={agents.map((a) => ({
            value: String(a.id),
            label: `${a.matricule} — ${a.prenom} ${a.nom}`,
          }))}
        />
        <input type="hidden" name="agentId" value={formAgentId} />

        <SearchableSelect
          label="Bénéficiaire"
          placeholder="Choisir un bénéficiaire…"
          value={formBeneficiaryVal}
          onChange={setFormBeneficiaryVal}
          required
          options={formBeneficiaryOptions}
          disabled={!formAgentId}
        />
        <input type="hidden" name="beneficiaire" value={formBeneficiaryVal} />
        <div className="form-group">
          <label>Médecin</label>
          <input
            name="doctorId"
            list="doctors-list"
            className="form-control"
            defaultValue={defaultValueDoctor}
            placeholder="Saisir ou rechercher un médecin..."
          />
          <datalist id="doctors-list">
            {doctors.map((d) => (
              <option key={d.id} value={d.fullName} />
            ))}
          </datalist>
        </div>
        {kind === 'analyse' && (
          <>
            <div className="form-group">
              <label>Laboratoire</label>
              <input
                name="laboratoireId"
                list="laboratoires-list"
                className="form-control"
                defaultValue={defaultValueLab}
                placeholder="Saisir ou rechercher un laboratoire..."
              />
              <datalist id="laboratoires-list">
                {labOptions.map((f) => (
                  <option key={f.id} value={f.nom} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>Date analyse</label>
              <input name="dateAnalyse" type="date" className="form-control" defaultValue={meta.dateAnalyse || ''} />
            </div>
            <div className="form-group">
              <label>Scan analyse</label>
              <input name="scanAnalyse" className="form-control" defaultValue={meta.scanAnalyse || ''} />
            </div>
          </>
        )}
        {kind === 'ordonnance' && (
          <>
            <div className="form-group">
              <label>Pharmacie</label>
              <input
                name="pharmacieId"
                list="pharmacies-list"
                className="form-control"
                defaultValue={defaultValuePharm}
                placeholder="Saisir ou rechercher une pharmacie..."
              />
              <datalist id="pharmacies-list">
                {pharmacieOptions.map((f) => (
                  <option key={f.id} value={f.nom} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>Date ordonnance</label>
              <input name="dateOrdonnance" type="date" className="form-control" defaultValue={meta.dateOrdonnance || ''} />
            </div>
            <div className="form-group">
              <label>Num instance</label>
              <input name="numInstance" className="form-control" defaultValue={meta.numInstance || ''} />
            </div>
            <div className="form-group">
              <label>Scan ordonnance</label>
              <input name="scanOrdonnance" className="form-control" defaultValue={meta.scanOrdonnance || ''} />
            </div>
          </>
        )}
        {kind === 'radio' && (
          <>
            <div className="form-group">
              <label>Centre radiologie</label>
              <input
                name="centreRadiologieId"
                list="centres-radio-list"
                className="form-control"
                defaultValue={defaultValueCentre}
                placeholder="Saisir ou rechercher un centre..."
              />
              <datalist id="centres-radio-list">
                {centreRadioOptions.map((f) => (
                  <option key={f.id} value={f.nom} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>Date radio</label>
              <input name="dateRadio" type="date" className="form-control" defaultValue={meta.dateRadio || ''} />
            </div>
            <div className="form-group">
              <label>Type radio</label>
              <input
                name="typeRadio"
                list="radio-types-list"
                className="form-control"
                defaultValue={meta.typeRadio || ''}
                placeholder="Saisir ou rechercher un type..."
              />
              <datalist id="radio-types-list">
                {radioTypes.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div className="form-group">
              <label>Scan Radio</label>
              <input name="scanRadio" className="form-control" defaultValue={meta.scanRadio || ''} />
            </div>
          </>
        )}
        <div className="form-group">
          <label>Date (API)</label>
          <input name="date" type="date" className="form-control" defaultValue={meta._date || new Date().toISOString().split('T')[0]} />
        </div>
        <div className="form-group">
          <label>Montant total (DH)</label>
          <input name="montant" type="number" step="0.01" className="form-control" defaultValue={meta._montant ?? ''} required />
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label>Observation</label>
          <textarea name="observation" className="form-control" rows={2} defaultValue={meta.observation || ''} />
        </div>
      </>
    );
  };

  const buildForm = () => {
    const kind = viewType;
    const submit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const selectedAgentIdVal = fd.get('agentId');
      const agent = agents.find((a) => String(a.id) === String(selectedAgentIdVal));
      if (!agent) {
        addToast('error', 'Agent invalide');
        return;
      }
      const montant = Number(fd.get('montant'));
      const taux = 80;
      const body = {
        date: fd.get('date') || new Date().toISOString().split('T')[0],
        agentId: agent.id,
        beneficiaire: fd.get('beneficiaire') || '',
        typePrestation: wantedType,
        montant,
        montantRemboursable: (montant * taux) / 100,
        taux,
        statut: 'En attente',
      };
      const meta = metaFromForm(fd);
      try {
        const created = await parseJsonOrThrow(await apiFetch('/api/ordonnances', { method: 'POST', body }));
        if (created?.id != null) {
          const next = { ...metaById, [created.id]: meta };
          setMetaById(next);
          writeMeta(next);
        }
        closeModal();
        addToast('success', 'Enregistrement effectué');
        reload();
      } catch (err) {
        addToast('error', err.message || 'Erreur');
      }
    };
    return (
      <form onSubmit={submit}>
        <div className="form-grid">{renderOrdonnanceFields(kind, {})}</div>
        <div className="modal-footer" style={{ padding: '16px 0 0' }}>
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary">
            <FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer
          </button>
        </div>
      </form>
    );
  };

  const buildEditForm = (o) => {
    const kind = kindFromPrestation(o.typePrestation);
    const meta = metaById[o.id] || {};
    const submit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const selectedAgentIdVal = fd.get('agentId');
      const agent = agents.find((a) => String(a.id) === String(selectedAgentIdVal));
      if (!agent) {
        addToast('error', 'Agent invalide');
        return;
      }
      const montant = Number(fd.get('montant'));
      const taux = 80;
      const body = {
        date: fd.get('date') || o.date,
        agentId: agent.id,
        beneficiaire: fd.get('beneficiaire') || '',
        typePrestation: o.typePrestation,
        montant,
        montantRemboursable: (montant * taux) / 100,
        taux,
        statut: fd.get('statut') || o.statut,
      };
      const nextMeta = metaFromForm(fd);
      try {
        await parseJsonOrThrow(await apiFetch(`/api/ordonnances/${o.id}`, { method: 'PUT', body }));
        const next = { ...metaById, [o.id]: nextMeta };
        setMetaById(next);
        writeMeta(next);
        closeModal();
        addToast('success', 'Dossier mis à jour');
        reload();
      } catch (err) {
        addToast('error', err.message || 'Erreur');
      }
    };
    const fieldMeta = {
      ...meta,
      _beneficiaire: o.beneficiaire,
      _date: o.date,
      _montant: o.montant,
      _taux: o.taux,
    };
    return (
      <form onSubmit={submit}>
        <div className="form-grid">
          {renderOrdonnanceFields(kind, fieldMeta)}
          <div className="form-group">
            <label>Statut</label>
            <select name="statut" className="form-control" defaultValue={o.statut}>
              <option>En attente</option>
              <option>Validé</option>
              <option>Rejeté</option>
            </select>
          </div>
        </div>
        <div className="modal-footer" style={{ padding: '16px 0 0' }}>
          <button type="button" className="btn btn-outline" onClick={closeModal}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary">
            <FaIcon name="floppy-disk" className="fa-inline-icon" /> Mettre à jour
          </button>
        </div>
      </form>
    );
  };

  const viewOrdonnance = (o) => {
    const kind = kindFromPrestation(o.typePrestation);
    return (
      <div className="detail-grid">
        <DetailItem label="Matricule">{o.matricule}</DetailItem>
        <DetailItem label="Agent">{o.nomPrenomAgent}</DetailItem>
        <DetailItem label="Bénéficiaire">{o.beneficiaire}</DetailItem>
        <DetailItem label="Médecin">{o.medecin}</DetailItem>
        {kind === 'analyse' && (
          <>
            <DetailItem label="Laboratoire">{o.laboratoire}</DetailItem>
            <DetailItem label="Date analyse">{formatDate(o.dateAnalyse)}</DetailItem>
            <DetailItem label="Scan analyse">{o.scanAnalyse}</DetailItem>
          </>
        )}
        {kind === 'ordonnance' && (
          <>
            <DetailItem label="Pharmacie">{o.pharmacie}</DetailItem>
            <DetailItem label="Date ordonnance">{formatDate(o.dateOrdonnance)}</DetailItem>
            <DetailItem label="N° instance">{o.numInstance}</DetailItem>
            <DetailItem label="Scan ordonnance">{o.scanOrdonnance}</DetailItem>
          </>
        )}
        {kind === 'radio' && (
          <>
            <DetailItem label="Centre radiologie">{o.centreRadiologie}</DetailItem>
            <DetailItem label="Date radio">{formatDate(o.dateRadio)}</DetailItem>
            <DetailItem label="Type radio">{o.typeRadio}</DetailItem>
            <DetailItem label="Scan radio">{o.scanRadio}</DetailItem>
          </>
        )}
        <DetailItem label="Montant">{Number(o.montant).toLocaleString('fr-FR')} DH</DetailItem>
        <DetailItem label="Statut">{o.statut}</DetailItem>
        <DetailItem label="Observation">{o.observation}</DetailItem>
        <DetailModalFooter
          onClose={closeModal}
          canEdit={canMutate}
          onEdit={() => {
            setFormAgentId(String(o.agentId));
            setFormBeneficiaryVal(o.beneficiaire);
            setModal({ title: `Modifier — ${o.numero || o.beneficiaire}`, mode: 'edit', ord: o });
          }}
        />
      </div>
    );
  };
  if (loading) {
    return <div className="card"><div className="card-body">Chargement…</div></div>;
  }

  return (
    <>
      {modal && (
        <Modal title={modal.title} onClose={closeModal}>
          {modal.mode === 'create' && buildForm()}
          {modal.mode === 'edit' && buildEditForm(modal.ord)}
          {modal.mode === 'view' && viewOrdonnance(modal.ord)}
        </Modal>
      )}

      <div className="toolbar" style={{ marginBottom: 8 }}>
        <div className="toolbar-left" style={{ display: 'flex', gap: 8 }}>
          <button type="button" className={`btn ${viewType === 'analyse' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewType('analyse')}>
            Analyse
          </button>
          <button type="button" className={`btn ${viewType === 'ordonnance' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewType('ordonnance')}>
            Ordonnance
          </button>
          <button type="button" className={`btn ${viewType === 'radio' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setViewType('radio')}>
            Radio
          </button>
        </div>
      </div>

      <TablePageShell
        title={
          viewType === 'analyse'
            ? 'Liste des analyses biologiques'
            : viewType === 'ordonnance'
              ? 'Liste des ordonnances'
              : 'Liste des examens radiologiques'
        }
        icon="file-prescription"
        toolbar={
          <ListPageToolbar
            searchValue={searchQuery}
            onSearchChange={(e) => setSearchQuery(e.target.value)}
            searchPlaceholder={
              viewType === 'analyse'
                ? 'Rechercher (matricule, agent, médecin, labo, date…)'
                : viewType === 'ordonnance'
                  ? 'Rechercher (matricule, agent, pharmacie, date…)'
                  : 'Rechercher (matricule, agent, centre radio, type…)'
            }
            exportColumns={exportColumns}
            exportRows={data}
            exportFilename={`ordonnances-${viewType}`}
            showNew={canMutate}
            newLabel="Créer"
            onNew={() => {
              setFormAgentId('');
              setFormBeneficiaryVal('');
              setModal({ title: 'Nouveau', mode: 'create' });
            }}
          />
        }
      >
        <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                {viewType === 'analyse' && (
                  <tr>
                    <th>Matricule</th>
                    <th>Nom et Prénom Agent</th>
                    <th>Bénéficiaire</th>
                    <th>Médecin</th>
                    <th>Laboratoire</th>
                    <th>Date_analyse</th>
                    <th>Montant total (DH)</th>
                    <th>Scan_analyse</th>
                    <th>Observation</th>
                    <th>Actions</th>
                  </tr>
                )}
                {viewType === 'ordonnance' && (
                  <tr>
                    <th>Matricule</th>
                    <th>Nom et Prénom Agent</th>
                    <th>Bénéficiaire</th>
                    <th>Médecin</th>
                    <th>Pharmacie</th>
                    <th>Date_ordonnance</th>
                    <th>Num_instance</th>
                    <th>Montant_total (DH)</th>
                    <th>Scan_ordonnance</th>
                    <th>Observation</th>
                    <th>Actions</th>
                  </tr>
                )}
                {viewType === 'radio' && (
                  <tr>
                    <th>Matricule</th>
                    <th>Nom et Prénom Agent</th>
                    <th>Bénéficiaire</th>
                    <th>Médecin</th>
                    <th>Centre radiologie</th>
                    <th>Date_radio</th>
                    <th>Montant_total (DH)</th>
                    <th>Type_radio</th>
                    <th>Scan Radio</th>
                    <th>Observation</th>
                    <th>Actions</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {pageData.map((o) => (
                  <tr key={o.id}>
                    <td>{o.matricule}</td>
                    <td>{o.nomPrenomAgent}</td>
                    <td>{o.beneficiaire}</td>
                    <td>{o.medecin}</td>
                    {viewType === 'analyse' && (
                      <>
                        <td>{o.laboratoire}</td>
                        <td>{formatDate(o.dateAnalyse)}</td>
                        <td>{Number(o.montant).toLocaleString('fr-FR')} DH</td>
                        <td>{o.scanAnalyse}</td>
                        <td>{o.observation}</td>
                      </>
                    )}
                    {viewType === 'ordonnance' && (
                      <>
                        <td>{o.pharmacie}</td>
                        <td>{formatDate(o.dateOrdonnance)}</td>
                        <td>{o.numInstance}</td>
                        <td>{Number(o.montant).toLocaleString('fr-FR')} DH</td>
                        <td>{o.scanOrdonnance}</td>
                        <td>{o.observation}</td>
                      </>
                    )}
                    {viewType === 'radio' && (
                      <>
                        <td>{o.centreRadiologie}</td>
                        <td>{formatDate(o.dateRadio)}</td>
                        <td>{Number(o.montant).toLocaleString('fr-FR')} DH</td>
                        <td>{o.typeRadio}</td>
                        <td>{o.scanRadio}</td>
                        <td>{o.observation}</td>
                      </>
                    )}
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view" title="Voir" type="button" onClick={() => setModal({ title: `Dossier ${o.numero || o.beneficiaire}`, mode: 'view', ord: o })}>
                        <FaIcon name="eye" />
                      </button>
                      {canMutate && (
                        <button
                          className="btn btn-icon btn-edit"
                          type="button"
                          title="Modifier"
                          onClick={() => {
                            setFormAgentId(String(o.agentId));
                            setFormBeneficiaryVal(o.beneficiaire);
                            setModal({ title: `Modifier — ${o.numero || o.beneficiaire}`, mode: 'edit', ord: o });
                          }}
                        >
                          <FaIcon name="pen-to-square" />
                        </button>
                      )}
                      {canDelete && (
                        <AdminDeleteButton
                          onClick={() =>
                            adminDeleteRecord({
                              url: `/api/ordonnances/${o.id}`,
                              label: o.numero || o.beneficiaire,
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
