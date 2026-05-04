// ============================================
// CRM MUTUELLE SRM-MS — Application Logic
// ============================================

(function() {
  'use strict';

  // --- State ---
  let currentUser = null;
  let currentPage = 'dashboard';

  // --- Init ---
  function init() {
    currentUser = JSON.parse(sessionStorage.getItem('mutuelle_user'));
    if (!currentUser) { window.location.href = 'index.html'; return; }
    renderSidebar();
    renderTopbar();
    bindNavigation();
    navigateTo('dashboard');
  }

  // --- Toast ---
  function toast(type, msg) {
    const c = document.getElementById('toastContainer');
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span><button class="toast-close" onclick="this.parentElement.classList.add('toast-exit');setTimeout(()=>this.parentElement.remove(),300)">✕</button>`;
    c.appendChild(t);
    setTimeout(() => { t.classList.add('toast-exit'); setTimeout(() => t.remove(), 300); }, 4000);
  }

  // ============================================
  // SIDEBAR
  // ============================================
  function renderSidebar() {
    const role = currentUser.role;
    const isAdmin = role === 'Administrateur' || role === 'admin';
    const isConsult = role === 'Consultateur' || role === 'consultateur';

    const navItems = [
      { section: 'Principal', items: [
        { id: 'dashboard', icon: '📊', label: 'Tableau de bord' },
      ]},
      { section: 'Gestion', items: [
        { id: 'beneficiaires', icon: '👥', label: 'Bénéficiaires', badge: SimData.agents.length },
        { id: 'ordonnances', icon: '📋', label: 'Ordonnances', badge: SimData.ordonnances.length },
        { id: 'devis', icon: '📄', label: 'Devis', badge: SimData.devis.length },
        { id: 'remboursements', icon: '💰', label: 'Remboursements', badge: SimData.remboursements.filter(r => r.statut === 'En attente').length },
        { id: 'prises-en-charge', icon: '🏥', label: 'Prises en charge' },
        { id: 'maladies', icon: '🩺', label: 'Maladies spéciales' },
      ]},
      { section: 'Référentiel', items: [
        { id: 'etablissements', icon: '🏢', label: 'Établissements' },
        { id: 'entites', icon: '🏛️', label: 'Entités org.' },
      ]},
    ];

    if (isAdmin) {
      navItems.push({ section: 'Administration', items: [
        { id: 'utilisateurs', icon: '🔐', label: 'Utilisateurs', badge: SimData.utilisateurs.length },
      ]});
    }

    let html = '';
    navItems.forEach(section => {
      html += `<div class="nav-section"><div class="nav-section-title">${section.section}</div>`;
      section.items.forEach(item => {
        html += `<div class="nav-item" data-page="${item.id}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
          ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
        </div>`;
      });
      html += '</div>';
    });

    document.getElementById('sidebarNav').innerHTML = html;

    // User footer
    const initials = (currentUser.name || 'U').split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();
    document.getElementById('sidebarUser').innerHTML = `
      <div class="user-avatar">${initials}</div>
      <div class="user-info">
        <div class="user-name">${currentUser.name || 'Utilisateur'}</div>
        <div class="user-role">${currentUser.role}</div>
      </div>
      <span class="logout-icon" id="logoutBtn" title="Déconnexion">🚪</span>
    `;

    document.getElementById('logoutBtn').addEventListener('click', () => {
      sessionStorage.removeItem('mutuelle_user');
      window.location.href = 'index.html';
    });
  }

  function bindNavigation() {
    document.getElementById('sidebarNav').addEventListener('click', function(e) {
      const item = e.target.closest('.nav-item');
      if (item) navigateTo(item.dataset.page);
    });
  }

  function navigateTo(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    const active = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (active) active.classList.add('active');
    renderPage(page);
  }

  // ============================================
  // TOPBAR
  // ============================================
  function renderTopbar() {
    // Already in HTML, just dynamic title
  }

  function setPageTitle(title, breadcrumb) {
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('breadcrumb').innerHTML = `
      <span>Accueil</span><span class="separator">›</span><span class="current">${breadcrumb || title}</span>
    `;
  }

  // ============================================
  // PAGE ROUTER
  // ============================================
  function renderPage(page) {
    const content = document.getElementById('pageContent');
    content.innerHTML = '<div style="text-align:center;padding:60px;"><div class="spinner" style="margin:0 auto;"></div></div>';
    
    // Simulate loading
    setTimeout(() => {
      switch(page) {
        case 'dashboard': renderDashboard(content); break;
        case 'beneficiaires': renderBeneficiaires(content); break;
        case 'ordonnances': renderOrdonnances(content); break;
        case 'devis': renderDevis(content); break;
        case 'remboursements': renderRemboursements(content); break;
        case 'prises-en-charge': renderPrisesEnCharge(content); break;
        case 'maladies': renderMaladies(content); break;
        case 'etablissements': renderEtablissements(content); break;
        case 'entites': renderEntites(content); break;
        case 'utilisateurs': renderUtilisateurs(content); break;
        default: content.innerHTML = '<div class="empty-state"><div class="empty-icon">🚧</div><h4>Page en construction</h4></div>';
      }
      content.style.animation = 'none';
      content.offsetHeight; // trigger reflow
      content.style.animation = 'fadeInPage 0.4s ease forwards';
    }, 300);
  }

  // ============================================
  // DASHBOARD
  // ============================================
  function renderDashboard(el) {
    setPageTitle('Tableau de bord', 'Accueil');
    const totalAgents = SimData.agents.length;
    const totalOrdonnances = SimData.ordonnances.length;
    const totalRemboursements = SimData.remboursements.length;
    const enAttente = SimData.remboursements.filter(r => r.statut === 'En attente').length;
    const totalMontant = SimData.remboursements.reduce((s,r) => s + r.montantValide, 0);
    const totalDevis = SimData.devis.length;

    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue">👥</div>
          <div class="stat-info">
            <h4>Bénéficiaires</h4>
            <div class="stat-value animate-count">${totalAgents + SimData.proches.length}</div>
            <span class="stat-change up">↑ ${totalAgents} agents</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green">📋</div>
          <div class="stat-info">
            <h4>Ordonnances</h4>
            <div class="stat-value animate-count">${totalOrdonnances}</div>
            <span class="stat-change up">↑ Ce mois</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orange">💰</div>
          <div class="stat-info">
            <h4>Remboursements traités</h4>
            <div class="stat-value animate-count">${totalMontant.toLocaleString('fr-FR')} <small style="font-size:14px;">DH</small></div>
            <span class="stat-change up">↑ 12%</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon red">⏳</div>
          <div class="stat-info">
            <h4>En attente</h4>
            <div class="stat-value animate-count">${enAttente}</div>
            <span class="stat-change down">↓ À traiter</span>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
        <div class="card">
          <div class="card-header"><h3>📈 Coûts mensuels (DH)</h3></div>
          <div class="card-body">
            <div class="chart-container" id="barChart"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>📊 Répartition par type</h3></div>
          <div class="card-body">
            <div style="space-y:12px;">
              ${buildDonutItem('Médicaments', 42, 'var(--primary-500)')}
              ${buildDonutItem('Analyses', 25, 'var(--accent-500)')}
              ${buildDonutItem('Radiologie', 18, 'var(--warning-500)')}
              ${buildDonutItem('Optique', 10, 'var(--info-500)')}
              ${buildDonutItem('Dentaire', 5, 'var(--danger-500)')}
            </div>
          </div>
        </div>
      </div>

      <div class="card mt-3">
        <div class="card-header">
          <h3>🕐 Dernières activités</h3>
          <button class="btn btn-outline btn-sm">Voir tout</button>
        </div>
        <div class="card-body" style="padding:0;">
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead><tr><th>N°</th><th>Type</th><th>Bénéficiaire</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
              <tbody>
                ${SimData.remboursements.slice(0,5).map(r => `
                  <tr>
                    <td>${r.numero}</td>
                    <td>Remboursement</td>
                    <td>${r.beneficiaire}</td>
                    <td>${r.montantDemande.toLocaleString('fr-FR')} DH</td>
                    <td>${statusBadge(r.statut)}</td>
                    <td>${formatDate(r.date)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Render bar chart
    renderBarChart();
  }

  function buildDonutItem(label, pct, color) {
    return `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:12px;height:12px;border-radius:3px;background:${color};flex-shrink:0;"></div>
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-size:13px;font-weight:600;color:var(--gray-700);">${label}</span>
            <span style="font-size:13px;font-weight:700;color:var(--gray-900);">${pct}%</span>
          </div>
          <div style="height:6px;background:var(--gray-100);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 1s ease;"></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderBarChart() {
    const container = document.getElementById('barChart');
    if (!container) return;
    const data = SimData.chartMonthlyCosts;
    const max = Math.max(...data.map(d => d.value));
    const colors = ['#818cf8','#6366f1','#4f46e5','#4338ca','#3730a3','#312e81','#818cf8','#6366f1','#4f46e5','#4338ca','#3730a3','#312e81'];
    
    container.innerHTML = data.map((d, i) => `
      <div class="chart-bar" style="height:${(d.value/max)*100}%;background:${colors[i]};">
        <div class="chart-tooltip">${d.value.toLocaleString('fr-FR')} DH</div>
        <div class="chart-label">${d.month}</div>
      </div>
    `).join('');
  }

  // ============================================
  // BENEFICIAIRES
  // ============================================
  function renderBeneficiaires(el) {
    setPageTitle('Bénéficiaires', 'Gestion des bénéficiaires');
    const isConsult = currentUser.role === 'Consultateur' || currentUser.role === 'consultateur';

    el.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="filter-group">
            <select id="filterEntite" onchange="window._filterAgents()">
              <option value="">Toutes les entités</option>
              ${[...new Set(SimData.agents.map(a=>a.entite))].map(e=>`<option value="${e}">${e}</option>`).join('')}
            </select>
            <select id="filterSituation" onchange="window._filterAgents()">
              <option value="">Toute situation</option>
              <option value="Marié">Marié(e)</option>
              <option value="Célibataire">Célibataire</option>
            </select>
          </div>
        </div>
        <div class="toolbar-right">
          ${!isConsult ? '<button class="btn btn-primary" onclick="window._openAddAgent()">➕ Nouvel agent</button>' : ''}
        </div>
      </div>

      <div class="tabs">
        <div class="tab-item active" data-tab="agents" onclick="window._switchBenefTab(this,'agents')">👤 Agents</div>
        <div class="tab-item" data-tab="proches" onclick="window._switchBenefTab(this,'proches')">👨‍👩‍👧‍👦 Proches</div>
      </div>

      <div class="card">
        <div class="card-body" style="padding:0;">
          <div class="data-table-wrapper">
            <table class="data-table" id="agentsTable"></table>
          </div>
        </div>
      </div>
    `;

    window._currentBenefTab = 'agents';
    window._filterAgents = () => renderAgentsTable();
    window._switchBenefTab = (tabEl, tab) => {
      document.querySelectorAll('.tab-item').forEach(t=>t.classList.remove('active'));
      tabEl.classList.add('active');
      window._currentBenefTab = tab;
      renderAgentsTable();
    };
    window._openAddAgent = () => openModal('Ajouter un agent', buildAgentForm());
    window._openAddProche = (agentId) => openModal('Ajouter un proche', buildProcheForm(agentId));
    window._viewAgent = (id) => {
      const a = SimData.agents.find(x=>x.id===id);
      const proches = SimData.proches.filter(p=>p.agentId===id);
      openModal(`Agent: ${a.prenom} ${a.nom}`, `
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">Matricule</div><div class="detail-value">${a.matricule}</div></div>
          <div class="detail-item"><div class="detail-label">CIN</div><div class="detail-value">${a.cin}</div></div>
          <div class="detail-item"><div class="detail-label">Date de naissance</div><div class="detail-value">${formatDate(a.dateNaissance)}</div></div>
          <div class="detail-item"><div class="detail-label">Situation</div><div class="detail-value">${a.situation}</div></div>
          <div class="detail-item"><div class="detail-label">Entité</div><div class="detail-value">${a.entite}</div></div>
          <div class="detail-item"><div class="detail-label">Téléphone</div><div class="detail-value">${a.telephone}</div></div>
        </div>
        ${proches.length ? `<h4 style="margin:20px 0 12px;font-size:15px;color:var(--gray-700);">👨‍👩‍👧 Proches (${proches.length})</h4>
        <table class="data-table" style="font-size:13px;">
          <thead><tr><th>Nom</th><th>Prénom</th><th>Type</th><th>Date naiss.</th></tr></thead>
          <tbody>${proches.map(p=>`<tr><td>${p.nom}</td><td>${p.prenom}</td><td><span class="badge badge-info">${p.type}</span></td><td>${formatDate(p.dateNaissance)}</td></tr>`).join('')}</tbody>
        </table>` : '<p style="margin-top:16px;color:var(--gray-400);font-size:14px;">Aucun proche enregistré.</p>'}
      `);
    };

    renderAgentsTable();
  }

  function renderAgentsTable() {
    const table = document.getElementById('agentsTable');
    const isConsult = currentUser.role === 'Consultateur' || currentUser.role === 'consultateur';
    const entiteFilter = document.getElementById('filterEntite')?.value || '';
    const sitFilter = document.getElementById('filterSituation')?.value || '';

    if (window._currentBenefTab === 'agents') {
      let data = SimData.agents;
      if (entiteFilter) data = data.filter(a => a.entite === entiteFilter);
      if (sitFilter) data = data.filter(a => a.situation.startsWith(sitFilter));

      table.innerHTML = `
        <thead><tr><th>Matricule</th><th>Nom</th><th>Prénom</th><th>CIN</th><th>Situation</th><th>Entité</th><th>Actions</th></tr></thead>
        <tbody>
          ${data.map(a => `
            <tr>
              <td>${a.matricule}</td><td>${a.nom}</td><td>${a.prenom}</td><td>${a.cin}</td>
              <td><span class="badge ${a.situation.startsWith('Marié')?'badge-success':'badge-info'}">${a.situation}</span></td>
              <td>${a.entite}</td>
              <td class="actions-cell">
                <button class="btn btn-icon btn-view" title="Voir" onclick="window._viewAgent(${a.id})">👁️</button>
                ${!isConsult ? `<button class="btn btn-icon btn-edit" title="Modifier" onclick="window._openAddAgent()">✏️</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      `;
    } else {
      table.innerHTML = `
        <thead><tr><th>Nom</th><th>Prénom</th><th>Type</th><th>Agent rattaché</th><th>Date naiss.</th><th>Actions</th></tr></thead>
        <tbody>
          ${SimData.proches.map(p => {
            const agent = SimData.agents.find(a=>a.id===p.agentId);
            return `<tr>
              <td>${p.nom}</td><td>${p.prenom}</td>
              <td><span class="badge badge-info">${p.type}</span></td>
              <td>${agent ? agent.prenom + ' ' + agent.nom : '—'}</td>
              <td>${formatDate(p.dateNaissance)}</td>
              <td class="actions-cell">
                <button class="btn btn-icon btn-view" title="Voir">👁️</button>
                ${!isConsult ? '<button class="btn btn-icon btn-edit" title="Modifier">✏️</button>':''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      `;
    }
  }

  function buildAgentForm() {
    return `
      <form onsubmit="event.preventDefault(); window._saveAgent();">
        <div class="form-grid">
          <div class="form-group"><label>Matricule <span class="required">*</span></label><input class="form-control" placeholder="AGT-XXX" required></div>
          <div class="form-group"><label>CIN <span class="required">*</span></label><input class="form-control" placeholder="BK000000" required></div>
          <div class="form-group"><label>Nom <span class="required">*</span></label><input class="form-control" required></div>
          <div class="form-group"><label>Prénom <span class="required">*</span></label><input class="form-control" required></div>
          <div class="form-group"><label>Date de naissance</label><input type="date" class="form-control"></div>
          <div class="form-group"><label>Situation familiale</label><select class="form-control"><option>Célibataire</option><option>Marié(e)</option></select></div>
          <div class="form-group"><label>Entité</label><select class="form-control">${SimData.entites.map(e=>`<option>${e.nom}</option>`).join('')}</select></div>
          <div class="form-group"><label>Téléphone</label><input class="form-control" placeholder="06XXXXXXXX"></div>
          <div class="form-group" style="grid-column:1/-1;"><label>Email</label><input type="email" class="form-control" placeholder="prenom.nom@srm-ms.ma"></div>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">💾 Enregistrer</button>
        </div>
      </form>
    `;
  }

  function buildProcheForm(agentId) {
    return `
      <form onsubmit="event.preventDefault(); window._saveProche();">
        <div class="form-grid">
          <div class="form-group"><label>Nom <span class="required">*</span></label><input class="form-control" required></div>
          <div class="form-group"><label>Prénom <span class="required">*</span></label><input class="form-control" required></div>
          <div class="form-group"><label>Type</label><select class="form-control"><option>Conjoint</option><option>Enfant</option></select></div>
          <div class="form-group"><label>Date de naissance</label><input type="date" class="form-control"></div>
          <div class="form-group"><label>CIN</label><input class="form-control" placeholder="Optionnel"></div>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Annuler</button>
          <button type="submit" class="btn btn-primary">💾 Enregistrer</button>
        </div>
      </form>
    `;
  }

  window._saveAgent = () => { closeModal(); toast('success', 'Agent enregistré avec succès !'); };
  window._saveProche = () => { closeModal(); toast('success', 'Proche enregistré avec succès !'); };

  // ============================================
  // ORDONNANCES
  // ============================================
  function renderOrdonnances(el) {
    setPageTitle('Ordonnances', 'Gestion des ordonnances');
    const isConsult = currentUser.role === 'Consultateur' || currentUser.role === 'consultateur';

    el.innerHTML = `
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="stat-card"><div class="stat-icon green">💊</div><div class="stat-info"><h4>Médicaments</h4><div class="stat-value">${SimData.ordonnances.filter(o=>o.typePrestation==='Médicament').length}</div></div></div>
        <div class="stat-card"><div class="stat-icon blue">🔬</div><div class="stat-info"><h4>Analyses</h4><div class="stat-value">${SimData.ordonnances.filter(o=>o.typePrestation==='Analyse').length}</div></div></div>
        <div class="stat-card"><div class="stat-icon orange">📡</div><div class="stat-info"><h4>Radiologies</h4><div class="stat-value">${SimData.ordonnances.filter(o=>o.typePrestation==='Radiologie').length}</div></div></div>
      </div>
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="filter-group">
            <select id="filterOrdType" onchange="window._filterOrd()">
              <option value="">Types de prestation</option>
              <option>Médicament</option><option>Analyse</option><option>Radiologie</option>
            </select>
            <select id="filterOrdStatut" onchange="window._filterOrd()">
              <option value="">Tous les statuts</option>
              <option>Traité</option><option>En cours</option><option>En attente</option>
            </select>
          </div>
        </div>
        <div class="toolbar-right">
          ${!isConsult ? '<button class="btn btn-primary" onclick="window._openAddOrd()">➕ Nouvelle ordonnance</button>' : ''}
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="padding:0;">
          <div class="data-table-wrapper"><table class="data-table" id="ordTable"></table></div>
        </div>
      </div>
    `;

    window._filterOrd = () => renderOrdTable();
    window._openAddOrd = () => openModal('Nouvelle ordonnance', buildOrdForm());
    renderOrdTable();
  }

  function renderOrdTable() {
    let data = [...SimData.ordonnances];
    const typeF = document.getElementById('filterOrdType')?.value;
    const statF = document.getElementById('filterOrdStatut')?.value;
    if (typeF) data = data.filter(o => o.typePrestation === typeF);
    if (statF) data = data.filter(o => o.statut === statF);

    document.getElementById('ordTable').innerHTML = `
      <thead><tr><th>N°</th><th>Date</th><th>Bénéficiaire</th><th>Type</th><th>Montant</th><th>Remboursable</th><th>Taux</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>${data.map(o => `<tr>
        <td>${o.numero}</td><td>${formatDate(o.date)}</td><td>${o.beneficiaire}</td>
        <td><span class="badge ${o.typePrestation==='Médicament'?'badge-success':o.typePrestation==='Analyse'?'badge-primary':'badge-warning'}">${o.typePrestation}</span></td>
        <td>${o.montant.toLocaleString('fr-FR')} DH</td>
        <td>${o.montantRemboursable.toLocaleString('fr-FR')} DH</td>
        <td>${o.taux}%</td>
        <td>${statusBadge(o.statut)}</td>
        <td class="actions-cell">
          <button class="btn btn-icon btn-view" title="Voir">👁️</button>
          <button class="btn btn-icon btn-edit" title="Modifier">✏️</button>
        </td>
      </tr>`).join('')}</tbody>
    `;
  }

  function buildOrdForm() {
    return `
      <form onsubmit="event.preventDefault(); closeModal(); toast('success','Ordonnance enregistrée !');">
        <div class="form-grid">
          <div class="form-group"><label>Bénéficiaire <span class="required">*</span></label>
            <select class="form-control">${SimData.agents.map(a=>`<option>${a.prenom} ${a.nom}</option>`).join('')}</select></div>
          <div class="form-group"><label>Date</label><input type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}"></div>
          <div class="form-group"><label>Type de prestation</label>
            <select class="form-control"><option>Médicament</option><option>Analyse</option><option>Radiologie</option></select></div>
          <div class="form-group"><label>Montant (DH)</label><input type="number" class="form-control" placeholder="0.00"></div>
          <div class="form-group"><label>Taux de remboursement (%)</label><input type="number" class="form-control" value="80" min="0" max="100"></div>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;"><button type="button" class="btn btn-outline" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">💾 Enregistrer</button></div>
      </form>
    `;
  }

  // ============================================
  // DEVIS
  // ============================================
  function renderDevis(el) {
    setPageTitle('Devis', 'Gestion des devis');
    const isConsult = currentUser.role === 'Consultateur' || currentUser.role === 'consultateur';

    el.innerHTML = `
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="stat-card"><div class="stat-icon cyan">👓</div><div class="stat-info"><h4>Devis Optique</h4><div class="stat-value">${SimData.devis.filter(d=>d.type==='Optique').length}</div></div></div>
        <div class="stat-card"><div class="stat-icon purple">🦷</div><div class="stat-info"><h4>Devis Dentaire</h4><div class="stat-value">${SimData.devis.filter(d=>d.type==='Dentaire').length}</div></div></div>
        <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><h4>Approuvés</h4><div class="stat-value">${SimData.devis.filter(d=>d.etat==='Approuvé').length}</div></div></div>
      </div>
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="filter-group">
            <select id="filterDevisType" onchange="window._filterDevis()"><option value="">Tous les types</option><option>Optique</option><option>Dentaire</option></select>
            <select id="filterDevisEtat" onchange="window._filterDevis()"><option value="">Tous les états</option><option>Approuvé</option><option>En attente</option><option>Rejeté</option></select>
          </div>
        </div>
        <div class="toolbar-right">
          ${!isConsult ? '<button class="btn btn-primary" onclick="window._openAddDevis()">➕ Nouveau devis</button>' : ''}
        </div>
      </div>
      <div class="card"><div class="card-body" style="padding:0;"><div class="data-table-wrapper"><table class="data-table" id="devisTable"></table></div></div></div>
    `;

    window._filterDevis = () => renderDevisTable();
    window._openAddDevis = () => openModal('Nouveau devis', buildDevisForm());
    renderDevisTable();
  }

  function renderDevisTable() {
    let data = [...SimData.devis];
    const typeF = document.getElementById('filterDevisType')?.value;
    const etatF = document.getElementById('filterDevisEtat')?.value;
    if (typeF) data = data.filter(d => d.type === typeF);
    if (etatF) data = data.filter(d => d.etat === etatF);

    document.getElementById('devisTable').innerHTML = `
      <thead><tr><th>N°</th><th>Type</th><th>Date</th><th>Bénéficiaire</th><th>Montant</th><th>Taux</th><th>État</th><th>Actions</th></tr></thead>
      <tbody>${data.map(d => `<tr>
        <td>${d.numero}</td>
        <td><span class="badge ${d.type==='Optique'?'badge-info':'badge-primary'}">${d.type}</span></td>
        <td>${formatDate(d.date)}</td><td>${d.beneficiaire}</td>
        <td>${d.montant.toLocaleString('fr-FR')} DH</td><td>${d.taux}%</td>
        <td>${statusBadge(d.etat)}</td>
        <td class="actions-cell">
          <button class="btn btn-icon btn-view">👁️</button>
          <button class="btn btn-icon btn-edit">✏️</button>
        </td>
      </tr>`).join('')}</tbody>
    `;
  }

  function buildDevisForm() {
    return `
      <form onsubmit="event.preventDefault(); closeModal(); toast('success','Devis enregistré !');">
        <div class="form-grid">
          <div class="form-group"><label>Type</label><select class="form-control"><option>Optique</option><option>Dentaire</option></select></div>
          <div class="form-group"><label>Bénéficiaire</label><select class="form-control">${SimData.agents.map(a=>`<option>${a.prenom} ${a.nom}</option>`).join('')}</select></div>
          <div class="form-group"><label>Date</label><input type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}"></div>
          <div class="form-group"><label>Montant (DH)</label><input type="number" class="form-control" placeholder="0.00"></div>
          <div class="form-group"><label>Taux (%)</label><input type="number" class="form-control" value="60"></div>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;"><button type="button" class="btn btn-outline" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">💾 Enregistrer</button></div>
      </form>
    `;
  }

  // ============================================
  // REMBOURSEMENTS
  // ============================================
  function renderRemboursements(el) {
    setPageTitle('Remboursements', 'Gestion des remboursements');
    const isConsult = currentUser.role === 'Consultateur' || currentUser.role === 'consultateur';
    const traites = SimData.remboursements.filter(r=>r.statut==='Traité');
    const enCours = SimData.remboursements.filter(r=>r.statut==='En cours');
    const enAttente = SimData.remboursements.filter(r=>r.statut==='En attente');

    el.innerHTML = `
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="stat-card"><div class="stat-icon green">✅</div><div class="stat-info"><h4>Traités</h4><div class="stat-value">${traites.length}</div></div></div>
        <div class="stat-card"><div class="stat-icon orange">🔄</div><div class="stat-info"><h4>En cours</h4><div class="stat-value">${enCours.length}</div></div></div>
        <div class="stat-card"><div class="stat-icon red">⏳</div><div class="stat-info"><h4>En attente</h4><div class="stat-value">${enAttente.length}</div></div></div>
      </div>
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="filter-group">
            <select id="filterRmbStatut" onchange="window._filterRmb()"><option value="">Tous les statuts</option><option>Traité</option><option>En cours</option><option>En attente</option></select>
          </div>
        </div>
        <div class="toolbar-right">
          ${!isConsult ? '<button class="btn btn-primary" onclick="window._openAddRmb()">➕ Nouvelle demande</button>':''}
        </div>
      </div>
      <div class="card"><div class="card-body" style="padding:0;"><div class="data-table-wrapper"><table class="data-table" id="rmbTable"></table></div></div></div>
    `;

    window._filterRmb = () => renderRmbTable();
    window._openAddRmb = () => openModal('Nouvelle demande de remboursement', `
      <form onsubmit="event.preventDefault(); closeModal(); toast('success','Demande enregistrée !');">
        <div class="form-grid">
          <div class="form-group"><label>Bénéficiaire</label><select class="form-control">${SimData.agents.map(a=>`<option>${a.prenom} ${a.nom}</option>`).join('')}</select></div>
          <div class="form-group"><label>Date</label><input type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}"></div>
          <div class="form-group"><label>Montant demandé (DH)</label><input type="number" class="form-control" placeholder="0.00"></div>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;"><button type="button" class="btn btn-outline" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">💾 Enregistrer</button></div>
      </form>
    `);
    renderRmbTable();
  }

  function renderRmbTable() {
    let data = [...SimData.remboursements];
    const statF = document.getElementById('filterRmbStatut')?.value;
    if (statF) data = data.filter(r => r.statut === statF);

    document.getElementById('rmbTable').innerHTML = `
      <thead><tr><th>N°</th><th>Date</th><th>Bénéficiaire</th><th>Montant demandé</th><th>Montant validé</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>${data.map(r => `<tr>
        <td>${r.numero}</td><td>${formatDate(r.date)}</td><td>${r.beneficiaire}</td>
        <td>${r.montantDemande.toLocaleString('fr-FR')} DH</td>
        <td>${r.montantValide > 0 ? r.montantValide.toLocaleString('fr-FR') + ' DH' : '—'}</td>
        <td>${statusBadge(r.statut)}</td>
        <td class="actions-cell">
          <button class="btn btn-icon btn-view">👁️</button>
          <button class="btn btn-icon btn-edit">✏️</button>
        </td>
      </tr>`).join('')}</tbody>
    `;
  }

  // ============================================
  // PRISES EN CHARGE
  // ============================================
  function renderPrisesEnCharge(el) {
    setPageTitle('Prises en charge', 'Gestion des prises en charge');
    const isConsult = currentUser.role === 'Consultateur' || currentUser.role === 'consultateur';

    el.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left"><h4 style="color:var(--gray-700);">📋 ${SimData.prisesEnCharge.length} prises en charge enregistrées</h4></div>
        <div class="toolbar-right">${!isConsult ? '<button class="btn btn-primary" onclick="window._openAddPEC()">➕ Nouvelle PEC</button>':''}</div>
      </div>
      <div class="card"><div class="card-body" style="padding:0;"><div class="data-table-wrapper">
        <table class="data-table">
          <thead><tr><th>N°</th><th>Type</th><th>Début</th><th>Fin</th><th>Bénéficiaire</th><th>Établissement</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>${SimData.prisesEnCharge.map(p => `<tr>
            <td>${p.numero}</td>
            <td><span class="badge badge-primary">${p.typePrestation}</span></td>
            <td>${formatDate(p.dateDebut)}</td><td>${p.dateFin ? formatDate(p.dateFin) : '—'}</td>
            <td>${p.beneficiaire}</td><td>${p.etablissement}</td>
            <td>${statusBadge(p.statut)}</td>
            <td class="actions-cell">
              <button class="btn btn-icon btn-view">👁️</button>
              <button class="btn btn-icon btn-edit">✏️</button>
            </td>
          </tr>`).join('')}</tbody>
        </table>
      </div></div></div>
    `;

    window._openAddPEC = () => openModal('Nouvelle prise en charge', `
      <form onsubmit="event.preventDefault(); closeModal(); toast('success','PEC enregistrée !');">
        <div class="form-grid">
          <div class="form-group"><label>Type de prestation</label><select class="form-control"><option>Hospitalisation</option><option>Chirurgie</option><option>Maternité</option><option>Autre</option></select></div>
          <div class="form-group"><label>Bénéficiaire</label><select class="form-control">${SimData.agents.map(a=>`<option>${a.prenom} ${a.nom}</option>`).join('')}</select></div>
          <div class="form-group"><label>Date début</label><input type="date" class="form-control"></div>
          <div class="form-group"><label>Date fin</label><input type="date" class="form-control"></div>
          <div class="form-group"><label>Établissement</label><select class="form-control">${SimData.etablissements.map(e=>`<option>${e.nom}</option>`).join('')}</select></div>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;"><button type="button" class="btn btn-outline" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">💾 Enregistrer</button></div>
      </form>
    `);
  }

  // ============================================
  // MALADIES SPECIALES
  // ============================================
  function renderMaladies(el) {
    setPageTitle('Maladies spéciales', 'Gestion des maladies spéciales');
    const isConsult = currentUser.role === 'Consultateur' || currentUser.role === 'consultateur';

    el.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left"><h4 style="color:var(--gray-700);">🩺 ${SimData.maladiesSpeciales.length} dossiers enregistrés</h4></div>
        <div class="toolbar-right">${!isConsult ? '<button class="btn btn-primary" onclick="window._openAddMLD()">➕ Nouveau dossier</button>':''}</div>
      </div>
      <div class="card"><div class="card-body" style="padding:0;"><div class="data-table-wrapper">
        <table class="data-table">
          <thead><tr><th>N°</th><th>Type maladie</th><th>Date déclaration</th><th>Bénéficiaire</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>${SimData.maladiesSpeciales.map(m => `<tr>
            <td>${m.numero}</td>
            <td><span class="badge badge-warning">${m.typeMaladie}</span></td>
            <td>${formatDate(m.dateDeclaration)}</td>
            <td>${m.beneficiaire}</td>
            <td>${statusBadge(m.statut)}</td>
            <td class="actions-cell">
              <button class="btn btn-icon btn-view">👁️</button>
              <button class="btn btn-icon btn-edit">✏️</button>
            </td>
          </tr>`).join('')}</tbody>
        </table>
      </div></div></div>
    `;

    window._openAddMLD = () => openModal('Nouveau dossier maladie spéciale', `
      <form onsubmit="event.preventDefault(); closeModal(); toast('success','Dossier créé !');">
        <div class="form-grid">
          <div class="form-group"><label>Bénéficiaire</label><select class="form-control">${SimData.agents.map(a=>`<option>${a.prenom} ${a.nom}</option>`).join('')}</select></div>
          <div class="form-group"><label>Type de maladie</label><input class="form-control" placeholder="Ex: Diabète, Hypertension..."></div>
          <div class="form-group"><label>Date de déclaration</label><input type="date" class="form-control" value="${new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;"><button type="button" class="btn btn-outline" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">💾 Enregistrer</button></div>
      </form>
    `);
  }

  // ============================================
  // ETABLISSEMENTS MEDICAUX
  // ============================================
  function renderEtablissements(el) {
    setPageTitle('Établissements médicaux', 'Référentiel');
    const isConsult = currentUser.role === 'Consultateur' || currentUser.role === 'consultateur';

    el.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="filter-group">
            <select id="filterEtabType" onchange="window._filterEtab()"><option value="">Tous les types</option><option>Hôpital</option><option>Clinique</option><option>Opticien</option><option>Laboratoire</option></select>
          </div>
        </div>
        <div class="toolbar-right">${!isConsult ? '<button class="btn btn-primary" onclick="window._openAddEtab()">➕ Nouvel établissement</button>':''}</div>
      </div>
      <div class="detail-grid" id="etabGrid"></div>
    `;

    window._filterEtab = () => renderEtabGrid();
    window._openAddEtab = () => openModal('Nouvel établissement', `
      <form onsubmit="event.preventDefault(); closeModal(); toast('success','Établissement ajouté !');">
        <div class="form-grid">
          <div class="form-group"><label>Nom</label><input class="form-control" required></div>
          <div class="form-group"><label>Type</label><select class="form-control"><option>Hôpital</option><option>Clinique</option><option>Opticien</option><option>Laboratoire</option></select></div>
          <div class="form-group"><label>Adresse</label><input class="form-control"></div>
          <div class="form-group"><label>Téléphone</label><input class="form-control"></div>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;"><button type="button" class="btn btn-outline" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">💾 Enregistrer</button></div>
      </form>
    `);
    renderEtabGrid();
  }

  function renderEtabGrid() {
    let data = [...SimData.etablissements];
    const typeF = document.getElementById('filterEtabType')?.value;
    if (typeF) data = data.filter(e => e.type === typeF);

    document.getElementById('etabGrid').innerHTML = data.map(e => `
      <div class="card" style="overflow:hidden;">
        <div class="card-header" style="background:linear-gradient(135deg, var(--primary-50), var(--gray-50));">
          <h3 style="font-size:15px;">🏢 ${e.nom}</h3>
          <span class="badge badge-info">${e.type}</span>
        </div>
        <div class="card-body">
          <p style="font-size:13px;color:var(--gray-600);margin-bottom:8px;">📍 ${e.adresse}</p>
          <p style="font-size:13px;color:var(--gray-600);margin-bottom:12px;">📞 ${e.telephone}</p>
          ${e.medecins.length ? `<div style="margin-top:8px;">
            <span style="font-size:12px;font-weight:600;color:var(--gray-500);text-transform:uppercase;">Médecins</span>
            <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;">
              ${e.medecins.map(m => `<span class="badge badge-neutral">${m}</span>`).join('')}
            </div>
          </div>` : ''}
        </div>
      </div>
    `).join('');
  }

  // ============================================
  // ENTITES ORGANISATIONNELLES
  // ============================================
  function renderEntites(el) {
    setPageTitle('Entités organisationnelles', 'Référentiel');
    const isConsult = currentUser.role === 'Consultateur' || currentUser.role === 'consultateur';

    el.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="filter-group">
            <select id="filterEntType" onchange="window._filterEnt()"><option value="">Tous les types</option><option>Direction</option><option>Département</option><option>Division</option><option>Service</option></select>
          </div>
        </div>
        <div class="toolbar-right">${!isConsult ? '<button class="btn btn-primary" onclick="window._openAddEnt()">➕ Nouvelle entité</button>':''}</div>
      </div>
      <div class="card"><div class="card-body" style="padding:0;"><div class="data-table-wrapper"><table class="data-table" id="entTable"></table></div></div></div>
    `;

    window._filterEnt = () => renderEntTable();
    window._openAddEnt = () => openModal('Nouvelle entité', `
      <form onsubmit="event.preventDefault(); closeModal(); toast('success','Entité ajoutée !');">
        <div class="form-grid">
          <div class="form-group"><label>Code</label><input class="form-control" placeholder="DIR-XXX" required></div>
          <div class="form-group"><label>Nom</label><input class="form-control" required></div>
          <div class="form-group"><label>Type</label><select class="form-control"><option>Direction</option><option>Département</option><option>Division</option><option>Service</option></select></div>
          <div class="form-group"><label>Entité parent</label><select class="form-control"><option>—</option>${SimData.entites.map(e=>`<option>${e.nom}</option>`).join('')}</select></div>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;"><button type="button" class="btn btn-outline" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">💾 Enregistrer</button></div>
      </form>
    `);
    renderEntTable();
  }

  function renderEntTable() {
    let data = [...SimData.entites];
    const typeF = document.getElementById('filterEntType')?.value;
    if (typeF) data = data.filter(e => e.type === typeF);

    const typeBadge = (t) => {
      const m = { Direction:'badge-primary', Département:'badge-info', Division:'badge-warning', Service:'badge-success' };
      return `<span class="badge ${m[t]||'badge-neutral'}">${t}</span>`;
    };

    document.getElementById('entTable').innerHTML = `
      <thead><tr><th>Code</th><th>Nom</th><th>Type</th><th>Parent</th><th>Actions</th></tr></thead>
      <tbody>${data.map(e => `<tr>
        <td>${e.code}</td><td>${e.nom}</td>
        <td>${typeBadge(e.type)}</td><td>${e.parent}</td>
        <td class="actions-cell">
          <button class="btn btn-icon btn-view">👁️</button>
          <button class="btn btn-icon btn-edit">✏️</button>
        </td>
      </tr>`).join('')}</tbody>
    `;
  }

  // ============================================
  // UTILISATEURS (Admin only)
  // ============================================
  function renderUtilisateurs(el) {
    setPageTitle('Gestion des utilisateurs', 'Administration');

    el.innerHTML = `
      <div class="toolbar">
        <div class="toolbar-left"><h4 style="color:var(--gray-700);">🔐 ${SimData.utilisateurs.length} utilisateurs</h4></div>
        <div class="toolbar-right"><button class="btn btn-primary" onclick="window._openAddUser()">➕ Nouvel utilisateur</button></div>
      </div>
      <div class="card"><div class="card-body" style="padding:0;"><div class="data-table-wrapper">
        <table class="data-table">
          <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th><th>Dernier accès</th><th>Actions</th></tr></thead>
          <tbody>${SimData.utilisateurs.map(u => `<tr>
            <td>${u.nom}</td><td>${u.email}</td>
            <td><span class="badge ${u.role==='Administrateur'?'badge-danger':u.role==='Opérateur'?'badge-primary':'badge-info'}">${u.role}</span></td>
            <td><span class="badge ${u.statut==='Actif'?'badge-success':'badge-warning'}">${u.statut}</span></td>
            <td>${u.dernierAcces}</td>
            <td class="actions-cell">
              <button class="btn btn-icon btn-edit">✏️</button>
              <button class="btn btn-icon btn-delete">🗑️</button>
            </td>
          </tr>`).join('')}</tbody>
        </table>
      </div></div></div>
    `;

    window._openAddUser = () => openModal('Nouvel utilisateur', `
      <form onsubmit="event.preventDefault(); closeModal(); toast('success','Utilisateur créé !');">
        <div class="form-grid">
          <div class="form-group"><label>Nom complet</label><input class="form-control" required></div>
          <div class="form-group"><label>Email</label><input type="email" class="form-control" required></div>
          <div class="form-group"><label>Mot de passe</label><input type="password" class="form-control" required></div>
          <div class="form-group"><label>Rôle</label><select class="form-control"><option>Administrateur</option><option>Opérateur</option><option>Consultateur</option></select></div>
        </div>
        <div class="modal-footer" style="padding:16px 0 0;"><button type="button" class="btn btn-outline" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">💾 Enregistrer</button></div>
      </form>
    `);
  }

  // ============================================
  // MODAL SYSTEM
  // ============================================
  window.openModal = function(title, bodyHtml) {
    const overlay = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeModal = function() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
  };

  // Close modal on overlay click
  document.getElementById('modalOverlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // ============================================
  // HELPERS
  // ============================================
  function statusBadge(status) {
    const map = {
      'Traité': 'badge-success', 'Approuvé': 'badge-success', 'Validé': 'badge-success', 'Clôturé': 'badge-success', 'Actif': 'badge-success',
      'En cours': 'badge-warning',
      'En attente': 'badge-info',
      'Rejeté': 'badge-danger', 'Inactif': 'badge-danger',
    };
    return `<span class="badge ${map[status] || 'badge-neutral'}">${status}</span>`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Expose toast globally
  window.toast = toast;

  // --- Start app ---
  document.addEventListener('DOMContentLoaded', init);
})();
