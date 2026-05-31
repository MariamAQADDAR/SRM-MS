import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FaIcon from './FaIcon';
import { apiFetch } from '../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: { email }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Erreur lors de la demande de réinitialisation');
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Demande impossible');
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
          <h2 className="login-split-heading">Mot de passe oublié</h2>
          
          <div className="login-split-card">
            {success ? (
              <div className="login-split-alert" role="alert" style={{backgroundColor: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0'}}>
                <FaIcon name="envelope-circle-check" className="fa-inline-icon" /> 
                Un e-mail contenant les instructions pour réinitialiser votre mot de passe vous a été envoyé.
              </div>
            ) : (
              <>
                <p className="login-split-lead" style={{marginBottom: '20px', fontSize: '0.95rem'}}>
                  Entrez votre adresse e-mail pour recevoir un lien de récupération.
                </p>
                {error && (
                  <div className="login-split-alert" role="alert">
                    {error}
                  </div>
                )}
                <form className="login-split-form" onSubmit={handleSubmit} autoComplete="off">
                  <div className="login-split-field">
                    <label htmlFor="resetEmail">
                      Adresse email <span className="login-split-required">*</span>
                    </label>
                    <input
                      type="email"
                      id="resetEmail"
                      className="login-split-input"
                      placeholder="vous@exemple.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      "Envoyer le lien"
                    )}
                  </button>
                </form>
              </>
            )}

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={() => navigate('/')}
                style={{width: '100%'}}
              >
                <FaIcon name="arrow-left" className="fa-inline-icon" /> Retour à la connexion
              </button>
            </div>
          </div>

          <p className="login-split-copy">© {new Date().getFullYear()} SRM-MS — Direction SI & Transformation Digitale</p>
        </div>
      </main>
    </div>
  );
}
