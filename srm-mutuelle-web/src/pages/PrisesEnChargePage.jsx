import React, { useState } from 'react';
import SimData from '../data';
import Modal from '../components/Modal';

function statusBadge(statut) {
  const map = {'Clôturé':'badge-success','En cours':'badge-primary','En attente':'badge-warning'};
  return <span className={`badge ${map[statut]||'badge-info'}`}>{statut}</span>;
}
function formatDate(d) { if(!d)return'—'; const[y,m,day]=d.split('-'); return`${day}/${m}/${y}`; }

export default function PrisesEnChargePage({ setPageTitle, addToast, user }) {
  setPageTitle('Prises en charge','Gestion des prises en charge');
  const isConsult = user.role==='Consultateur';
  const [modal, setModal] = useState(null);

  const form = (
    <form onSubmit={e=>{e.preventDefault();setModal(null);addToast('success','PEC enregistrée !');}}>
      <div className="form-grid">
        <div className="form-group"><label>Type de prestation</label>
          <select className="form-control"><option>Hospitalisation</option><option>Chirurgie</option><option>Maternité</option><option>Autre</option></select></div>
        <div className="form-group"><label>Bénéficiaire</label>
          <select className="form-control">{SimData.agents.map(a=><option key={a.id}>{a.prenom} {a.nom}</option>)}</select></div>
        <div className="form-group"><label>Date début</label><input type="date" className="form-control"/></div>
        <div className="form-group"><label>Date fin</label><input type="date" className="form-control"/></div>
        <div className="form-group" style={{gridColumn:'1/-1'}}><label>Établissement</label>
          <select className="form-control">{SimData.etablissements.map(e=><option key={e.id}>{e.nom}</option>)}</select></div>
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
      <div className="toolbar">
        <div className="toolbar-left"><h4 style={{color:'var(--gray-700)'}}>📋 {SimData.prisesEnCharge.length} prises en charge enregistrées</h4></div>
        <div className="toolbar-right">
          {!isConsult && <button className="btn btn-primary" onClick={()=>setModal({title:'Nouvelle prise en charge',content:form})}>➕ Nouvelle PEC</button>}
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{padding:0}}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>N°</th><th>Type</th><th>Début</th><th>Fin</th><th>Bénéficiaire</th><th>Établissement</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {SimData.prisesEnCharge.map(p=>(
                  <tr key={p.id}>
                    <td>{p.numero}</td>
                    <td><span className="badge badge-primary">{p.typePrestation}</span></td>
                    <td>{formatDate(p.dateDebut)}</td><td>{p.dateFin ? formatDate(p.dateFin) : '—'}</td>
                    <td>{p.beneficiaire}</td><td>{p.etablissement}</td>
                    <td>{statusBadge(p.statut)}</td>
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view">👁️</button>
                      {!isConsult && <button className="btn btn-icon btn-edit" onClick={()=>setModal({title:'Modifier PEC',content:form})}>✏️</button>}
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
