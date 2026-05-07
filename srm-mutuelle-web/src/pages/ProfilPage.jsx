import React, { useState } from 'react';
import FaIcon from '../components/FaIcon';
import { apiChangePassword } from '../api/client';

export default function ProfilPage({ setPageTitle, addToast, user }) {
  setPageTitle('Mon profil', 'Compte');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const currentPassword = fd.get('currentPassword');
    const newPassword = fd.get('newPassword');
    const confirm = fd.get('confirmPassword');
    if (newPassword !== confirm) {
      addToast('error', 'Les mots de passe ne correspondent pas');
      return;
    }
    setBusy(true);
    try {
      await apiChangePassword(currentPassword, newPassword);
      e.target.reset();
      addToast('success', 'Mot de passe mis à jour');
    } catch (ex) {
      addToast('error', ex.message || 'Échec du changement');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '520px' }}>
      <div className="card-header">
        <h3>
          <FaIcon name="user" className="fa-inline-icon" /> Informations
        </h3>
      </div>
      <div className="card-body">
        <p style={{ marginBottom: '8px' }}>
          <strong>Nom :</strong> {user?.name || '—'}
        </p>
        <p style={{ marginBottom: '24px' }}>
          <strong>Email :</strong> {user?.email || '—'}
        </p>
        <h4 style={{ marginBottom: '12px' }}>Changer le mot de passe</h4>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Mot de passe actuel</label>
            <input name="currentPassword" type="password" className="form-control" autoComplete="current-password" required disabled={busy} />
          </div>
          <div className="form-group">
            <label>Nouveau mot de passe</label>
            <input name="newPassword" type="password" className="form-control" autoComplete="new-password" required disabled={busy} />
          </div>
          <div className="form-group">
            <label>Confirmer</label>
            <input name="confirmPassword" type="password" className="form-control" autoComplete="new-password" required disabled={busy} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? '…' : 'Mettre à jour'}
          </button>
        </form>
      </div>
    </div>
  );
}
