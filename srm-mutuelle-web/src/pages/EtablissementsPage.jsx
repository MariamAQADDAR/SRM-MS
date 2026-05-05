import React, { useState } from 'react';
import SimData from '../data';
import Modal from '../components/Modal';
import FaIcon from '../components/FaIcon';

export default function EtablissementsPage({ setPageTitle, addToast, user }) {
  setPageTitle('Établissements médicaux','Référentiel');
  const isConsult = user.role==='Consultateur';
  const [filterType, setFilterType] = useState('');
  const [modal, setModal] = useState(null);

  let data = [...SimData.etablissements];
  if (filterType) data = data.filter(e=>e.type===filterType);

  const form = (
    <form onSubmit={e=>{e.preventDefault();setModal(null);addToast('success','Établissement ajouté !');}}>
      <div className="form-grid">
        <div className="form-group"><label>Nom</label><input className="form-control" required/></div>
        <div className="form-group"><label>Type</label>
          <select className="form-control"><option>Hôpital</option><option>Clinique</option><option>Opticien</option><option>Laboratoire</option></select></div>
        <div className="form-group"><label>Adresse</label><input className="form-control"/></div>
        <div className="form-group"><label>Téléphone</label><input className="form-control"/></div>
      </div>
      <div className="modal-footer" style={{padding:'16px 0 0'}}>
        <button type="button" className="btn btn-outline" onClick={()=>setModal(null)}>Annuler</button>
        <button type="submit" className="btn btn-primary"><FaIcon name="floppy-disk" className="fa-inline-icon" /> Enregistrer</button>
      </div>
    </form>
  );

  const typeFa = { Hôpital: 'hospital', Clinique: 'building', Opticien: 'glasses', Laboratoire: 'flask' };
  const typeBadgeClass = {Hôpital:'badge-danger',Clinique:'badge-primary',Opticien:'badge-info',Laboratoire:'badge-success'};

  return (
    <>
      {modal && <Modal title={modal.title} onClose={()=>setModal(null)}>{modal.content}</Modal>}
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="filter-group">
            <select value={filterType} onChange={e=>setFilterType(e.target.value)}>
              <option value="">Tous les types</option><option>Hôpital</option><option>Clinique</option><option>Opticien</option><option>Laboratoire</option>
            </select>
          </div>
        </div>
        <div className="toolbar-right">
          {!isConsult && <button className="btn btn-primary" onClick={()=>setModal({title:'Nouvel établissement',content:form})}><FaIcon name="plus" className="fa-inline-icon" /> Nouvel établissement</button>}
        </div>
      </div>
      <div className="detail-grid">
        {data.map(e=>(
          <div className="card" key={e.id} style={{overflow:'hidden'}}>
            <div className="card-header" style={{background:'linear-gradient(135deg, var(--primary-50), var(--gray-50))'}}>
              <h3 style={{fontSize:'15px',display:'flex',alignItems:'center',gap:'8px'}}><FaIcon name={typeFa[e.type]||'building'} /> {e.nom}</h3>
              <span className={`badge ${typeBadgeClass[e.type]||'badge-info'}`}>{e.type}</span>
            </div>
            <div className="card-body">
              <p style={{fontSize:'13px',color:'var(--gray-600)',marginBottom:'8px'}}><FaIcon name="location-dot" className="fa-inline-icon" />{e.adresse}</p>
              <p style={{fontSize:'13px',color:'var(--gray-600)',marginBottom:'12px'}}><FaIcon name="phone" className="fa-inline-icon" />{e.telephone}</p>
              {e.medecins && e.medecins.length > 0 && (
                <div>
                  <p style={{fontSize:'12px',fontWeight:'600',color:'var(--gray-500)',marginBottom:'6px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Médecins</p>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                    {e.medecins.map((m,i)=><span key={i} className="badge badge-primary" style={{fontSize:'11px'}}>{m}</span>)}
                  </div>
                </div>
              )}
              {!isConsult && (
                <div style={{marginTop:'16px',display:'flex',gap:'8px'}}>
                  <button className="btn btn-outline btn-sm" onClick={()=>setModal({title:`Modifier: ${e.nom}`,content:form})}><FaIcon name="pen-to-square" className="fa-inline-icon" /> Modifier</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
