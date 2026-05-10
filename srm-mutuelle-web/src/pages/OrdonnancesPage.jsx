import React, { useEffect, useMemo, useState } from 'react';
import { isConsultateurRole } from '../authUtils';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';
import TablePageShell from '../components/TablePageShell';
import { apiFetch, parseJsonOrThrow } from '../api/client';
import { getTypeOptions } from '../config/typeConfig';

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

function typeForView(view, ordonnanceTypes) {
  if (view === 'analyse') return ordonnanceTypes.find((t) => /analyse/i.test(t)) || 'Analyse';
  if (view === 'radio') return ordonnanceTypes.find((t) => /radio/i.test(t)) || 'Radiologie';
  return ordonnanceTypes.find((t) => /m[ée]dicament/i.test(t)) || 'Médicament';
}

export default function OrdonnancesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Ordonnances', 'Gestion des ordonnances');
  const isConsult = isConsultateurRole(user);
  const [viewType, setViewType] = useState('analyse'); // analyse | ordonnance | radio
  const [filterMatricule, setFilterMatricule] = useState('');
  const [filterNom, setFilterNom] = useState('');
  const [filterDateDebut, setFilterDateDebut] = useState('');
  const [filterDateFin, setFilterDateFin] = useState('');
  const [filterMedecin, setFilterMedecin] = useState('');
  const [filterFacility, setFilterFacility] = useState('');
  const [filterRadioType, setFilterRadioType] = useState('');
  const [modal, setModal] = useState(null);
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [metaById, setMetaById] = useState(readMeta());
  const [loading, setLoading] = useState(true);
  const ordonnanceTypes = getTypeOptions('ordonnanceTypes');
  const radioTypes = getTypeOptions('radioTypes');

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
      medecin: doctor?.fullName || '—',
      laboratoire: lab?.nom || '—',
      pharmacie: pharm?.nom || '—',
      centreRadiologie: centre?.nom || '—',
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
  let data = rowsView.filter((x) => x.typePrestation === wantedType);
  if (filterMatricule) data = data.filter((o) => o.matricule.toLowerCase().includes(filterMatricule.toLowerCase()));
  if (filterNom) data = data.filter((o) => o.nomPrenomAgent.toLowerCase().includes(filterNom.toLowerCase()));
  if (filterMedecin) data = data.filter((o) => o.medecin === filterMedecin);
  if (filterDateDebut) {
    data = data.filter((o) => {
      const v = viewType === 'analyse' ? o.dateAnalyse : viewType === 'ordonnance' ? o.dateOrdonnance : o.dateRadio;
      return String(v || '') >= filterDateDebut;
    });
  }
  if (filterDateFin) {
    data = data.filter((o) => {
      const v = viewType === 'analyse' ? o.dateAnalyse : viewType === 'ordonnance' ? o.dateOrdonnance : o.dateRadio;
      return String(v || '') <= filterDateFin;
    });
  }
  if (viewType === 'analyse' && filterFacility) data = data.filter((o) => o.laboratoire === filterFacility);
  if (viewType === 'ordonnance' && filterFacility) data = data.filter((o) => o.pharmacie === filterFacility);
  if (viewType === 'radio' && filterFacility) data = data.filter((o) => o.centreRadiologie === filterFacility);
  if (viewType === 'radio' && filterRadioType) data = data.filter((o) => o.typeRadio === filterRadioType);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const agentLabel = fd.get('beneficiaire');
    const agent = agents.find((a) => `${a.prenom} ${a.nom}` === agentLabel);
    if (!agent) {
      addToast('error', 'Agent invalide');
      return;
    }
    const montant = Number(fd.get('montant'));
    const taux = Number(fd.get('taux') || 80);
    const body = {
      date: fd.get('date') || new Date().toISOString().split('T')[0],
      agentId: agent.id,
      beneficiaire: agentLabel,
      typePrestation: wantedType,
      montant,
      montantRemboursable: (montant * taux) / 100,
      taux,
      statut: 'En attente',
    };
    const meta = {
      doctorId: String(fd.get('doctorId') || '').trim(),
      laboratoireId: String(fd.get('laboratoireId') || '').trim(),
      pharmacieId: String(fd.get('pharmacieId') || '').trim(),
      centreRadiologieId: String(fd.get('centreRadiologieId') || '').trim(),
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
    try {
      const created = await parseJsonOrThrow(await apiFetch('/api/ordonnances', { method: 'POST', body }));
      if (created?.id != null) {
        const next = { ...metaById, [created.id]: meta };
        setMetaById(next);
        writeMeta(next);
      }
      setModal(null);
      addToast('success', 'Enregistrement effectué');
      reload();
    } catch (err) {
      addToast('error', err.message || 'Erreur');
    }
  };

  const form = (
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="form-group">
          <label>Bénéficiaire</label>
          <select name="beneficiaire" className="form-control" required>
            {agents.map((a) => (
              <option key={a.id} value={`${a.prenom} ${a.nom}`}>
                {a.prenom} {a.nom}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Médecin</label>
          <select name="doctorId" className="form-control">
            <option value="">Select One</option>
            {doctors.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.fullName}
              </option>
            ))}
          </select>
        </div>
        {viewType === 'analyse' && (
          <>
            <div className="form-group">
              <label>Laboratoire</label>
              <select name="laboratoireId" className="form-control">
                <option value="">Select One</option>
                {labOptions.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date analyse</label>
              <input name="dateAnalyse" type="date" className="form-control" />
            </div>
            <div className="form-group">
              <label>Scan analyse</label>
              <input name="scanAnalyse" className="form-control" />
            </div>
          </>
        )}
        {viewType === 'ordonnance' && (
          <>
            <div className="form-group">
              <label>Pharmacie</label>
              <select name="pharmacieId" className="form-control">
                <option value="">Select One</option>
                {pharmacieOptions.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date ordonnance</label>
              <input name="dateOrdonnance" type="date" className="form-control" />
            </div>
            <div className="form-group">
              <label>Num instance</label>
              <input name="numInstance" className="form-control" />
            </div>
            <div className="form-group">
              <label>Scan ordonnance</label>
              <input name="scanOrdonnance" className="form-control" />
            </div>
          </>
        )}
        {viewType === 'radio' && (
          <>
            <div className="form-group">
              <label>Centre radiologie</label>
              <select name="centreRadiologieId" className="form-control">
                <option value="">Select One</option>
                {centreRadioOptions.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Date radio</label>
              <input name="dateRadio" type="date" className="form-control" />
            </div>
            <div className="form-group">
              <label>Type_radio</label>
              <select name="typeRadio" className="form-control">
                <option value="">Select One</option>
                {radioTypes.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Scan Radio</label>
              <input name="scanRadio" className="form-control" />
            </div>
          </>
        )}
        <div className="form-group">
          <label>Date (API)</label>
          <input name="date" type="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]} />
        </div>
        <div className="form-group">
          <label>Montant total (DH)</label>
          <input name="montant" type="number" step="0.01" className="form-control" required />
        </div>
        <div className="form-group">
          <label>Taux (%)</label>
          <input name="taux" type="number" className="form-control" defaultValue="80" />
        </div>
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label>Observation</label>
          <textarea name="observation" className="form-control" rows={2} />
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

  const facilityFilterOptions = useMemo(() => {
    if (viewType === 'analyse') return labOptions.map((x) => x.nom);
    if (viewType === 'ordonnance') return pharmacieOptions.map((x) => x.nom);
    return centreRadioOptions.map((x) => x.nom);
  }, [viewType, labOptions, pharmacieOptions, centreRadioOptions]);

  if (loading) {
    return <div className="card"><div className="card-body">Chargement…</div></div>;
  }

  return (
    <>
      {modal && (
        <Modal title={`Nouveau dossier ${viewType}`} onClose={() => setModal(null)}>
          {modal.content}
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
          <>
            <div className="table-page-toolbar-filters">
              <div className="filter-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                <input className="form-control" placeholder="Matricule" value={filterMatricule} onChange={(e) => setFilterMatricule(e.target.value)} />
                <input className="form-control" placeholder="Nom Agent" value={filterNom} onChange={(e) => setFilterNom(e.target.value)} />
                <input className="form-control" type="date" value={filterDateDebut} onChange={(e) => setFilterDateDebut(e.target.value)} />
                <input className="form-control" type="date" value={filterDateFin} onChange={(e) => setFilterDateFin(e.target.value)} />
                <select className="form-control" value={filterMedecin} onChange={(e) => setFilterMedecin(e.target.value)}>
                  <option value="">Médecin</option>
                  {doctors.map((d) => (
                    <option key={d.id}>{d.fullName}</option>
                  ))}
                </select>
                <select className="form-control" value={filterFacility} onChange={(e) => setFilterFacility(e.target.value)}>
                  <option value="">{viewType === 'ordonnance' ? 'Pharmacie' : viewType === 'radio' ? 'Centre radiologie' : 'Laboratoire'}</option>
                  {facilityFilterOptions.map((n) => (
                    <option key={n}>{n}</option>
                  ))}
                </select>
                {viewType === 'radio' ? (
                  <select className="form-control" value={filterRadioType} onChange={(e) => setFilterRadioType(e.target.value)}>
                    <option value="">Type_radio</option>
                    {radioTypes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                ) : null}
              </div>
            </div>
            <div className="table-page-toolbar-row">
              <span className="toolbar-spacer" />
              {!isConsult && (
                <button type="button" className="btn btn-primary" onClick={() => setModal({ title: 'Nouveau', content: form })}>
                  <FaIcon name="plus" className="fa-inline-icon" /> Créer
                </button>
              )}
            </div>
          </>
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
                {data.map((o) => (
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
                      <button className="btn btn-icon btn-view" title="Voir" type="button">
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
