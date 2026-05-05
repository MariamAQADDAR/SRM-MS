import React, { useState } from 'react';
import SimData from '../data';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';

export default function EntitesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Entités organisationnelles','Référentiel');
  const isConsult = user.role==='Consultateur';
  const [modal, setModal] = useState(null);

  const typeColors = {Direction:'badge-primary',Département:'badge-info',Service:'badge-success',Division:'badge-warning'};

  const form = (
    <form onSubmit={e=>{e.preventDefault();setModal(null);addToast('success','Entité enregistrée !');}}>
      <div className="form-grid">
        <div className="form-group"><label>Code entité <span className="required">*</span></label><input className="form-control" placeholder="DIR-XXX" required/></div>
        <div className="form-group"><label>Nom entité <span className="required">*</span></label><input className="form-control" required/></div>
        <div className="form-group"><label>Type</label>
          <select className="form-control"><option>Direction</option><option>Département</option><option>Service</option><option>Division</option></select></div>
        <div className="form-group"><label>Entité parente</label>
          <select className="form-control"><option value="">— Aucune —</option>{SimData.entites.map(e=><option key={e.id}>{e.nom}</option>)}</select></div>
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
      <div className="toolbar">
        <div className="toolbar-left"><h4 style={{color:'var(--gray-700)'}}><FaIcon name="landmark" className="fa-inline-icon" /> {SimData.entites.length} entités organisationnelles</h4></div>
        <div className="toolbar-right">
          {!isConsult && <button className="btn btn-primary" onClick={()=>setModal({title:'Nouvelle entité',content:form})}><FaIcon name="plus" className="fa-inline-icon" /> Nouvelle entité</button>}
        </div>
      </div>
      <div className="card">
        <div className="card-body" style={{padding:0}}>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead><tr><th>Code</th><th>Nom</th><th>Type</th><th>Entité parente</th><th>Actions</th></tr></thead>
              <tbody>
                {SimData.entites.map(e=>(
                  <tr key={e.id}>
                    <td><span style={{fontFamily:'monospace',fontWeight:'600',color:'var(--primary-600)',fontSize:'13px'}}>{e.code}</span></td>
                    <td style={{fontWeight:'500'}}>{e.nom}</td>
                    <td><span className={`badge ${typeColors[e.type]||'badge-info'}`}>{e.type}</span></td>
                    <td style={{color:'var(--gray-500)'}}>{e.parent}</td>
                    <td className="actions-cell">
                      <button className="btn btn-icon btn-view"><FaIcon name="eye" /></button>
                      {!isConsult && <button className="btn btn-icon btn-edit" onClick={()=>setModal({title:`Modifier: ${e.nom}`,content:form})}><FaIcon name="pen-to-square" /></button>}
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
