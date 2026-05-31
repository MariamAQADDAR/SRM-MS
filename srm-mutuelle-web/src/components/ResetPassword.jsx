import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import FaIcon from './FaIcon';
import { apiFetch } from '../api/client';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError("Le lien de réinitialisation est invalide ou manquant.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mot de passe trop court (6 caractères minimum)');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: { token, newPassword }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Erreur lors de la réinitialisation');
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Réinitialisation impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-split login-split--dark" dir="ltr">
      <aside className="login-split-brand" aria-label="SRM-MS">
        <div className="login-split-brand-inner">
          <div className="login-split-logo-ring">
            <img
              src="/srm-company-logo.png"
              alt=""
              className="login-split-brand-img"
            />
          </div>
          <h1 className="login-split-brand-title">SRM-MS</h1>
          <p className="login-split-brand-kicker">Mutuelle</p>
          <p className="login-split-brand-sub">Marrakech-Safi</p>
          <p className="login-split-brand-line">Gestion de la mutuelle — espace professionnel</p>
        </div>
      </aside>

      <main className="login-split-main" dir="ltr" lang="fr">
        <header className="login-split-topbar">
          <div className="login-split-topbar-spacer" />
        </header>

        <div className="login-split-content">
          <h2 className="login-split-heading">Nouveau mot de passe</h2>
          
          <div className="login-split-card">
            {success ? (
              <>
                <div className="login-split-alert" role="alert" style={{backgroundColor: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0'}}>
                  <FaIcon name="check-circle" className="fa-inline-icon" /> 
                  Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
                </div>
                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => navigate('/')}
                    style={{width: '100%'}}
                  >
                    Se connecter
                  </button>
                </div>
              </>
            ) : (
              <>
                {error && (
                  <div className="login-split-alert" role="alert">
                    {error}
                  </div>
                )}
                {!token ? (
                   <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <button 
                      type="button" 
                      className="btn btn-outline" 
                      onClick={() => navigate('/forgot-password')}
                      style={{width: '100%'}}
                    >
                      Demander un nouveau lien
                    </button>
                  </div>
                ) : (
                  <form className="login-split-form" onSubmit={handleSubmit} autoComplete="off">
                    <div className="login-split-field">
                      <label htmlFor="newPassword">
                        Nouveau mot de passe <span className="login-split-required">*</span>
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        className="login-split-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div className="login-split-field">
                      <label htmlFor="confirmPassword">
                        Confirmer le mot de passe <span className="login-split-required">*</span>
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        className="login-split-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="login-split-submit" disabled={!!loading}>
                      {loading ? (
                        <span
                          className="spinner"
                          style={{ width: '20px', height: '20px', borderWidth: '2px', margin: '0 auto' }}
                        />
                      ) : (
                        "Mettre à jour le mot de passe"
                      )}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>

          <p className="login-split-copy">© {new Date().getFullYear()} SRM-MS — Direction SI & Transformation Digitale</p>
        </div>
      </main>
    </div>
  );
}
