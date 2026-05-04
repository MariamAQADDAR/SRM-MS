import React, { useState } from 'react';
import SimData from '../data';
import Modal from '../components/Modal';

function statusBadge(statut) {
  const map = {
    'Traité':'badge-success','Validé':'badge-success','Approuvé':'badge-success','Clôturé':'badge-success',
    'En cours':'badge-primary','En attente':'badge-warning','Rejeté':'badge-danger','Actif':'badge-success','Inactif':'badge-danger'
  };
  return <span className={`badge ${map[statut]||'badge-info'}`}>{statut}</span>;
}
function formatDate(d) { if(!d)return'—'; const[y,m,day]=d.split('-'); return`${day}/${m}/${y}`; }

export default function BeneficiairesPage({ setPageTitle, addToast, user }) {
  setPageTitle('Bénéficiaires','Gestion des bénéficiaires');
  const isConsult = user.role==='Consultateur'||user.role==='consultateur';
  const [tab, setTab] = useState('agents');
  const [filterEntite, setFilterEntite] = useState('');
  const [filterSituation, setFilterSituation] = useState('');
  const [modal, setModal] = useState(null);

  const entites = [...new Set(SimData.agents.map(a=>a.entite))];

  let agents = [...SimData.agents];
  if (filterEntite) agents = agents.filter(a=>a.entite===filterEntite);
  if (filterSituation) agents = agents.filter(a=>a.situation.startsWith(filterSituation));

  const viewAgent = (a) => {
    const proches = SimData.proches.filter(p=>p.agentId===a.id);
    setModal({
      title: `Agent: ${a.prenom} ${a.nom}`,
      content: (
        <div>
          <div className="detail-grid">
            <div className="detail-item"><div className="detail-label">Matricule</div><div className="detail-value">{a.matricule}</div></div>
            <div className="detail-item"><div className="detail-label">CIN</div><div className="detail-value">{a.cin}</div></div>
            <div className="detail-item"><div className="detail-label">Date de naissance</div><div className="detail-value">{formatDate(a.dateNaissance)}</div></div>
            <div className="detail-item"><div className="detail-label">Situation</div><div className="detail-value">{a.situation}</div></div>
            <div className="detail-item"><div className="detail-label">Entité</div><div className="detail-value">{a.entite}</div></div>
            <div className="detail-item"><div className="detail-label">Téléphone</div><div className="detail-value">{a.telephone}</div></div>
          </div>
          {proches.length > 0 && (
            <>
              <h4 style={{margin:'20px 0 12px',fontSize:'15px',color:'var(--gray-700)'}}>👨‍👩‍👧 Proches ({proches.length})</h4>
              <table className="data-table" style={{fontSize:'13px'}}>
                <thead><tr><th>Nom</th><th>Prénom</th><th>Type</th><th>Date naiss.</th></tr></thead>
                <tbody>{proches.map(p=><tr key={p.id}><td>{p.nom}</td><td>{p.prenom}</td><td><span className="badge badge-info">{p.type}</span></td><td>{formatDate(p.dateNaissance)}</td></tr>)}</tbody>
              </table>
            </>
          )}
        </div>
      )
    });
  };

  const agentForm = (
    <form onSubmit={e=>{e.preventDefault();setModal(null);addToast('success','Agent enregistré avec succès !');}}>
      <div className="form-grid">
        <div className="form-group"><label>Matricule <span className="required">*</span></label><input className="form-control" placeholder="AGT-XXX" required/></div>
        <div className="form-group"><label>CIN <span className="required">*</span></label><input className="form-control" placeholder="BK000000" required/></div>
        <div className="form-group"><label>Nom <span className="required">*</span></label><input className="form-control" required/></div>
        <div className="form-group"><label>Prénom <span className="required">*</span></label><input className="form-control" required/></div>
        <div className="form-group"><label>Date de naissance</label><input type="date" className="form-control"/></div>
        <div className="form-group"><label>Situation familiale</label><select className="form-control"><option>Célibataire</option><option>Marié(e)</option></select></div>
        <div className="form-group"><label>Entité</label><select className="form-control">{SimData.entites.map(e=><option key={e.id}>{e.nom}</option>)}</select></div>
        <div className="form-group"><label>Téléphone</label><input className="form-control" placeholder="06XXXXXXXX"/></div>
        <div className="form-group" style={{gridColumn:'1/-1'}}><label>Email</label><input type="email" className="form-control" placeholder="prenom.nom@srm-ms.ma"/></div>
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
        <div className="toolbar-left">
          <div className="filter-group">
            <select value={filterEntite} onChange={e=>setFilterEntite(e.target.value)}>
              <option value="">Toutes les entités</option>
              {entites.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
            <select value={filterSituation} onChange={e=>setFilterSituation(e.target.value)}>
              <option value="">Toute situation</option>
              <option value="Marié">Marié(e)</option>
              <option value="Célibataire">Célibataire</option>
            </select>
          </div>
        </div>
        <div className="toolbar-right">
          {!isConsult && <button className="btn btn-primary" onClick={()=>setModal({title:'Ajouter un agent',content:agentForm})}>➕ Nouvel agent</button>}
        </div>
      </div>
      <div className="tabs">
        <div className={`tab-item${tab==='agents'?' active':''}`} onClick={()=>setTab('agents')}>👤 Agents</div>
        <div className={`tab-item${tab==='proches'?' active':''}`} onClick={()=>setTab('proches')}>👨‍👩‍👧‍👦 Proches</div>
      </div>
      <div className="card">
        <div className="card-body" style={{padding:0}}>
          <div className="data-table-wrapper">
            {tab==='agents' ? (
              <table className="data-table">
                <thead><tr><th>Matricule</th><th>Nom</th><th>Prénom</th><th>CIN</th><th>Situation</th><th>Entité</th><th>Actions</th></tr></thead>
                <tbody>
                  {agents.map(a=>(
                    <tr key={a.id}>
                      <td>{a.matricule}</td><td>{a.nom}</td><td>{a.prenom}</td><td>{a.cin}</td>
                      <td><span className={`badge ${a.situation.startsWith('Marié')?'badge-success':'badge-info'}`}>{a.situation}</span></td>
                      <td>{a.entite}</td>
                      <td className="actions-cell">
                        <button className="btn btn-icon btn-view" title="Voir" onClick={()=>viewAgent(a)}>👁️</button>
                        {!isConsult && <button className="btn btn-icon btn-edit" title="Modifier" onClick={()=>setModal({title:`Modifier: ${a.prenom} ${a.nom}`,content:agentForm})}>✏️</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="data-table">
                <thead><tr><th>Nom</th><th>Prénom</th><th>Type</th><th>Agent rattaché</th><th>Date naiss.</th><th>Actions</th></tr></thead>
                <tbody>
                  {SimData.proches.map(p=>{
                    const agent = SimData.agents.find(a=>a.id===p.agentId);
                    return (
                      <tr key={p.id}>
                        <td>{p.nom}</td><td>{p.prenom}</td>
                        <td><span className="badge badge-info">{p.type}</span></td>
                        <td>{agent ? `${agent.prenom} ${agent.nom}` : '—'}</td>
                        <td>{formatDate(p.dateNaissance)}</td>
                        <td className="actions-cell">
                          <button className="btn btn-icon btn-view" title="Voir">👁️</button>
                          {!isConsult && <button className="btn btn-icon btn-edit" title="Modifier">✏️</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
