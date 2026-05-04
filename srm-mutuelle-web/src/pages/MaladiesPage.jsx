import React, { useState } from 'react';
import SimData from '../data';
import Modal from '../components/Modal';

function statusBadge(statut) {
  const map = {'Validé':'badge-success','En cours':'badge-primary','En attente':'badge-warning'};
  return <span className={`badge ${map[statut]||'badge-info'}`}>{statut}</span>;
}
function formatDate(d) { if(!d)return'—'; const[y,m,day]=d.split('-'); return`${day}/${m}/${y}`; }

export default function MaladiesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Maladies spéciales','Gestion des maladies spéciales');
  const isConsult = user.role==='Consultateur';
  const [modal, setModal] = useState(null);

  const form = (
    <form onSubmit={e=>{e.preventDefault();setModal(null);addToast('success','Dossier créé !');}}>
      <div className="form-grid">
        <div className="form-group"><label>Bénéficiaire</label>
          <select className="form-control">{SimData.agents.map(a=><option key={a.id}>{a.prenom} {a.nom}</option>)}</select></div>
        <div className="form-group"><label>Type de maladie</label><input className="form-control" placeholder="Ex: Diabète, Hypertension..."/></div>
        <div className="form-group" style={{gridColumn:'1/-1'}}><label>Date de déclaration</label><input type="date" className="form-control" defaultValue={new Date().toISOString().split('T')[0]}/></div>
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
        <div className="toolbar-left"><h4 style={{color:'var(--gray-700)'}}>🩺 {SimData.maladiesSpeciales.length} dossiers enregistrés</h4></div>
        <div className="toolbar-right">
          {!isConsult && <button className="btn btn-primary" onClick={()=>setModal({title:'Nouveau dossier maladie spéciale',content:form})}>➕ Nouveau dossier</button>}
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{padding:0}}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>N°</th><th>Type maladie</th><th>Date déclaration</th><th>Bénéficiaire</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {SimData.maladiesSpeciales.map(m=>(
                  <tr key={m.id}>
                    <td>{m.numero}</td>
                    <td><span className="badge badge-warning">{m.typeMaladie}</span></td>
                    <td>{formatDate(m.dateDeclaration)}</td>
                    <td>{m.beneficiaire}</td>
                    <td>{statusBadge(m.statut)}</td>
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view">👁️</button>
                      {!isConsult && <button className="btn btn-icon btn-edit" onClick={()=>setModal({title:'Modifier dossier',content:form})}>✏️</button>}
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
