import React, { useState } from 'react';
import SimData from '../data';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';

function statusBadge(statut) {
  const map = {'Traité':'badge-success','En cours':'badge-primary','En attente':'badge-warning','Rejeté':'badge-danger'};
  return <span className={`badge ${map[statut]||'badge-info'}`}>{statut}</span>;
}
function formatDate(d) { if(!d)return'—'; const[y,m,day]=d.split('-'); return`${day}/${m}/${y}`; }

export default function OrdonnancesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Ordonnances','Gestion des ordonnances');
  const isConsult = user.role==='Consultateur';
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [modal, setModal] = useState(null);

  let data = [...SimData.ordonnances];
  if (filterType) data = data.filter(o=>o.typePrestation===filterType);
  if (filterStatut) data = data.filter(o=>o.statut===filterStatut);

  const form = (
    <form onSubmit={e=>{e.preventDefault();setModal(null);addToast('success','Ordonnance enregistrée !');}}>
      <div className="form-grid">
        <div className="form-group"><label>Bénéficiaire <span className="required">*</span></label>
          <select className="form-control">{SimData.agents.map(a=><option key={a.id}>{a.prenom} {a.nom}</option>)}</select></div>
        <div className="form-group"><label>Date</label><input type="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]}/></div>
        <div className="form-group"><label>Type de prestation</label>
          <select className="form-control"><option>Médicament</option><option>Analyse</option><option>Radiologie</option></select></div>
        <div className="form-group"><label>Montant (DH)</label><input type="number" className="form-control" placeholder="0.00"/></div>
        <div className="form-group"><label>Taux de remboursement (%)</label><input type="number" className="form-control" defaultValue="80" min="0" max="100"/></div>
      </div>
      <div className="modal-footer" style={{padding:'16px 0 0'}}>
        <button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Annuler</button>
        <button type="submit" className="btn btn-primary"><FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer</button>
      </div>
    </form>
  );

  return (
    <>
      {modal && <Modal title={modal.title} onClose={()=>setModal(null)}>{modal.content}</Modal>}
      <div className="stats-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className="stat-card"><div className="stat-icon green"><FaIcon name="pills" /></div><div className="stat-info"><h4>Médicaments</h4><div className="stat-value">{SimData.ordonnances.filter(o=>o.typePrestation==='Médicament').length}</div></div></div>
        <div className="stat-card"><div className="stat-icon blue"><FaIcon name="flask" /></div><div className="stat-info"><h4>Analyses</h4><div className="stat-value">{SimData.ordonnances.filter(o=>o.typePrestation==='Analyse').length}</div></div></div>
        <div className="stat-card"><div className="stat-icon orange"><FaIcon name="x-ray" /></div><div className="stat-info"><h4>Radiologies</h4><div className="stat-value">{SimData.ordonnances.filter(o=>o.typePrestation==='Radiologie').length}</div></div></div>
      </div>
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="filter-group">
            <select value={filterType} onChange={e=>setFilterType(e.target.value)}>
              <option value="">Types de prestation</option>
              <option>Médicament</option><option>Analyse</option><option>Radiologie</option>
            </select>
            <select value={filterStatut} onChange={e=>setFilterStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              <option>Traité</option><option>En cours</option><option>En attente</option>
            </select>
          </div>
        </div>
        <div className="toolbar-right">
          {!isConsult && <button className="btn btn-primary" onClick={()=>setModal({title:'Nouvelle ordonnance',content:form})}><FaIcon name="plus" className="fa-inline-icon" /> Nouvelle ordonnance</button>}
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{padding:0}}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>N°</th><th>Date</th><th>Bénéficiaire</th><th>Type</th><th>Montant</th><th>Remboursable</th><th>Taux</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {data.map(o=>(
                  <tr key={o.id}>
                    <td>{o.numero}</td><td>{formatDate(o.date)}</td><td>{o.beneficiaire}</td>
                    <td><span className={`badge ${o.typePrestation==='Médicament'?'badge-success':o.typePrestation==='Analyse'?'badge-primary':'badge-warning'}`}>{o.typePrestation}</span></td>
                    <td>{o.montant.toLocaleString('fr-FR')} DH</td>
                    <td>{o.montantRemboursable.toLocaleString('fr-FR')} DH</td>
                    <td>{o.taux}%</td>
                    <td>{statusBadge(o.statut)}</td>
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view" title="Voir"><FaIcon name="eye" /></button>
                      {!isConsult && <button className="btn btn-icon btn-edit" title="Modifier" onClick={()=>setModal({title:'Modifier ordonnance',content:form})}><FaIcon name="pen-to-square" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
