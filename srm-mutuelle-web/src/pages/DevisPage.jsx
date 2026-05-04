import React, { useState } from 'react';
import SimData from '../data';
import Modal from '../components/Modal';

function statusBadge(statut) {
  const map = {'Approuvé':'badge-success','En attente':'badge-warning','Rejeté':'badge-danger'};
  return <span className={`badge ${map[statut]||'badge-info'}`}>{statut}</span>;
}
function formatDate(d) { if(!d)return'—'; const[y,m,day]=d.split('-'); return`${day}/${m}/${y}`; }

export default function DevisPage({ setPageTitle, addToast, user }) {
  setPageTitle('Devis','Gestion des devis');
  const isConsult = user.role==='Consultateur';
  const [filterType, setFilterType] = useState('');
  const [filterEtat, setFilterEtat] = useState('');
  const [modal, setModal] = useState(null);

  let data = [...SimData.devis];
  if (filterType) data = data.filter(d=>d.type===filterType);
  if (filterEtat) data = data.filter(d=>d.etat===filterEtat);

  const form = (
    <form onSubmit={e=>{e.preventDefault();setModal(null);addToast('success','Devis enregistré !');}}>
      <div className="form-grid">
        <div className="form-group"><label>Type</label>
          <select className="form-control"><option>Optique</option><option>Dentaire</option></select></div>
        <div className="form-group"><label>Bénéficiaire</label>
          <select className="form-control">{SimData.agents.map(a=><option key={a.id}>{a.prenom} {a.nom}</option>)}</select></div>
        <div className="form-group"><label>Date</label><input type="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]}/></div>
        <div className="form-group"><label>Montant (DH)</label><input type="number" className="form-control" placeholder="0.00"/></div>
        <div className="form-group"><label>Taux (%)</label><input type="number" className="form-control" defaultValue="60"/></div>
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
        <div className="stat-card"><div className="stat-icon cyan">👓</div><div className="stat-info"><h4>Devis Optique</h4><div className="stat-value">{SimData.devis.filter(d=>d.type==='Optique').length}</div></div></div>
        <div className="stat-card"><div className="stat-icon purple">🦷</div><div className="stat-info"><h4>Devis Dentaire</h4><div className="stat-value">{SimData.devis.filter(d=>d.type==='Dentaire').length}</div></div></div>
        <div className="stat-card"><div className="stat-icon green">✅</div><div className="stat-info"><h4>Approuvés</h4><div className="stat-value">{SimData.devis.filter(d=>d.etat==='Approuvé').length}</div></div></div>
      </div>
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="filter-group">
            <select value={filterType} onChange={e=>setFilterType(e.target.value)}>
              <option value="">Tous les types</option><option>Optique</option><option>Dentaire</option>
            </select>
            <select value={filterEtat} onChange={e=>setFilterEtat(e.target.value)}>
              <option value="">Tous les états</option><option>Approuvé</option><option>En attente</option><option>Rejeté</option>
            </select>
          </div>
        </div>
        <div className="toolbar-right">
          {!isConsult && <button className="btn btn-primary" onClick={()=>setModal({title:'Nouveau devis',content:form})}>➕ Nouveau devis</button>}
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{padding:0}}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>N°</th><th>Type</th><th>Date</th><th>Bénéficiaire</th><th>Montant</th><th>Taux</th><th>État</th><th>Actions</th></tr></thead>
              <tbody>
                {data.map(d=>(
                  <tr key={d.id}>
                    <td>{d.numero}</td>
                    <td><span className={`badge ${d.type==='Optique'?'badge-info':'badge-primary'}`}>{d.type}</span></td>
                    <td>{formatDate(d.date)}</td><td>{d.beneficiaire}</td>
                    <td>{d.montant.toLocaleString('fr-FR')} DH</td><td>{d.taux}%</td>
                    <td>{statusBadge(d.etat)}</td>
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view">👁️</button>
                      {!isConsult && <button className="btn btn-icon btn-edit" onClick={()=>setModal({title:'Modifier devis',content:form})}>✏️</button>}
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
