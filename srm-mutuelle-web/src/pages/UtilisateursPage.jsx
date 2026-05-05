import React, { useState } from 'react';
import SimData from '../data';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';

export default function UtilisateursPage({ setPageTitle, addToast, user }) {
  setPageTitle('Utilisateurs','Administration');
  const [modal, setModal] = useState(null);

  const roleColors = {'Administrateur':'badge-danger','Opérateur':'badge-primary','Consultateur':'badge-info'};
  const statutColors = {'Actif':'badge-success','Inactif':'badge-warning'};

  const form = (
    <form onSubmit={e=>{e.preventDefault();setModal(null);addToast('success','Utilisateur enregistré !');}}>
      <div className="form-grid">
        <div className="form-group"><label>Nom complet <span className="required">*</span></label><input className="form-control" required/></div>
        <div className="form-group"><label>Email <span className="required">*</span></label><input type="email" className="form-control" placeholder="prenom.nom@srm-ms.ma" required/></div>
        <div className="form-group"><label>Mot de passe <span className="required">*</span></label><input type="password" className="form-control" required/></div>
        <div className="form-group"><label>Rôle</label>
          <select className="form-control"><option>Administrateur</option><option>Opérateur</option><option>Consultateur</option></select></div>
        <div className="form-group"><label>Statut</label>
          <select className="form-control"><option>Actif</option><option>Inactif</option></select></div>
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
        <div className="stat-card"><div className="stat-icon red"><FaIcon name="user-shield" /></div><div className="stat-info"><h4>Total utilisateurs</h4><div className="stat-value">{SimData.utilisateurs.length}</div></div></div>
        <div className="stat-card"><div className="stat-icon green"><FaIcon name="circle-check" /></div><div className="stat-info"><h4>Actifs</h4><div className="stat-value">{SimData.utilisateurs.filter(u=>u.statut==='Actif').length}</div></div></div>
        <div className="stat-card"><div className="stat-icon orange"><FaIcon name="triangle-exclamation" /></div><div className="stat-info"><h4>Inactifs</h4><div className="stat-value">{SimData.utilisateurs.filter(u=>u.statut==='Inactif').length}</div></div></div>
      </div>
      <div className="toolbar">
        <div className="toolbar-left"><h4 style={{color:'var(--gray-700)'}}><FaIcon name="user-shield" className="fa-inline-icon" /> Gestion des accès utilisateurs</h4></div>
        <div className="toolbar-right">
          <button className="btn btn-primary" onClick={()=>setModal({title:'Nouvel utilisateur',content:form})}><FaIcon name="plus" className="fa-inline-icon" /> Nouvel utilisateur</button>
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{padding:0}}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Dernier accès</th><th>Actions</th></tr></thead>
              <tbody>
                {SimData.utilisateurs.map(u=>(
                  <tr key={u.id}>
                    <td style={{fontWeight:'600'}}>{u.nom}</td>
                    <td style={{color:'var(--gray-500)',fontSize:'13px'}}>{u.email}</td>
                    <td><span className={`badge ${roleColors[u.role]||'badge-info'}`}>{u.role}</span></td>
                    <td><span className={`badge ${statutColors[u.statut]||'badge-info'}`}>{u.statut}</span></td>
                    <td style={{fontSize:'13px',color:'var(--gray-500)'}}>{u.dernierAcces}</td>
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view"><FaIcon name="eye" /></button>
                      <button className="btn btn-icon btn-edit" onClick={()=>setModal({title:`Modifier: ${u.nom}`,content:form})}><FaIcon name="pen-to-square" /></button>
                      <button className="btn btn-icon btn-delete" title="Supprimer" onClick={()=>addToast('warning','Suppression désactivée en mode démo.')}><FaIcon name="trash" /></button>
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
