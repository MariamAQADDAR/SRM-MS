import React, { useState } from 'react';
import SimData from '../data';
import Modal from '../components/Modal';

function statusBadge(statut) {
  const map = {'Traité':'badge-success','En cours':'badge-primary','En attente':'badge-warning'};
  return <span className={`badge ${map[statut]||'badge-info'}`}>{statut}</span>;
}
function formatDate(d) { if(!d)return'—'; const[y,m,day]=d.split('-'); return`${day}/${m}/${y}`; }

export default function RemboursementsPage({ setPageTitle, addToast, user }) {
  setPageTitle('Remboursements','Gestion des remboursements');
  const isConsult = user.role==='Consultateur';
  const [filterStatut, setFilterStatut] = useState('');
  const [modal, setModal] = useState(null);

  let data = [...SimData.remboursements];
  if (filterStatut) data = data.filter(r=>r.statut===filterStatut);

  const form = (
    <form onSubmit={e=>{e.preventDefault();setModal(null);addToast('success','Demande enregistrée !');}}>
      <div className="form-grid">
        <div className="form-group"><label>Bénéficiaire</label>
          <select className="form-control">{SimData.agents.map(a=><option key={a.id}>{a.prenom} {a.nom}</option>)}</select></div>
        <div className="form-group"><label>Date</label><input type="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]}/></div>
        <div className="form-group" style={{gridColumn:'1/-1'}}><label>Montant demandé (DH)</label><input type="number" className="form-control" placeholder="0.00"/></div>
      </div>
      <div className="modal-footer" style={{padding:'16px 0 0'}}>
        <button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Annuler</button>
        <button type="submit" className="btn btn-primary">💾 Enregistrer</button>
      </div>
    </form>
  );

  return (
    <>
      {modal && <Modal title={modal.title} onClose={()=>setModal(null)}>{modal.content}</Modal>}
      <div className="stats-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        <div className="stat-card"><div className="stat-icon green">✅</div><div className="stat-info"><h4>Traités</h4><div className="stat-value">{SimData.remboursements.filter(r=>r.statut==='Traité').length}</div></div></div>
        <div className="stat-card"><div className="stat-icon orange">🔄</div><div className="stat-info"><h4>En cours</h4><div className="stat-value">{SimData.remboursements.filter(r=>r.statut==='En cours').length}</div></div></div>
        <div className="stat-card"><div className="stat-icon red">⏳</div><div className="stat-info"><h4>En attente</h4><div className="stat-value">{SimData.remboursements.filter(r=>r.statut==='En attente').length}</div></div></div>
      </div>
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="filter-group">
            <select value={filterStatut} onChange={e=>setFilterStatut(e.target.value)}>
              <option value="">Tous les statuts</option><option>Traité</option><option>En cours</option><option>En attente</option>
            </select>
          </div>
        </div>
        <div className="toolbar-right">
          {!isConsult && <button className="btn btn-primary" onClick={()=>setModal({title:'Nouvelle demande de remboursement',content:form})}>➕ Nouvelle demande</button>}
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{padding:0}}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>N°</th><th>Date</th><th>Bénéficiaire</th><th>Montant demandé</th><th>Montant validé</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {data.map(r=>(
                  <tr key={r.id}>
                    <td>{r.numero}</td><td>{formatDate(r.date)}</td><td>{r.beneficiaire}</td>
                    <td>{r.montantDemande.toLocaleString('fr-FR')} DH</td>
                    <td>{r.montantValide>0 ? r.montantValide.toLocaleString('fr-FR')+' DH' : '—'}</td>
                    <td>{statusBadge(r.statut)}</td>
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view">👁️</button>
                      {!isConsult && <button className="btn btn-icon btn-edit" onClick={()=>setModal({title:'Modifier remboursement',content:form})}>✏️</button>}
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
