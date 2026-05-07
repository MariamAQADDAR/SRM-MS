import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FaIcon from './FaIcon';
import { apiLogin } from '../api/client';

function sessionUserFromLoginResponse(data) {
  const u = data.user || {};
  return {
    token: data.accessToken,
    id: u.id ?? null,
    email: u.email,
    name: u.fullName,
    role: u.roleLabel || u.role,
    roleCode: u.role,
    agentId: u.agentId ?? null,
  };
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      const payload = sessionUserFromLoginResponse(data);
      if (!payload.token) {
        throw new Error('Réponse serveur invalide');
      }
      sessionStorage.setItem('mutuelle_user', JSON.stringify(payload));
      navigate('/app');
    } catch (err) {
      setError(err.message || 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">
          <img
            src="/srm-brand-logo.png"
            alt="SRM-MS — Société Régionale Multiservices Marrakech-Safi"
            className="login-brand-img"
          />
          <p className="login-tagline">Espace professionnel</p>
        </div>

        {error ? (
          <div className="form-group" style={{ color: '#c0392b', fontSize: '0.9rem' }}>
            {error}
          </div>
        ) : null}

        <form className="login-form" onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label htmlFor="loginEmail">Adresse email</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="loginEmail"
                placeholder="votre.email@srm-ms.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="input-icon"><FaIcon name="envelope" /></span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="loginPassword">Mot de passe</label>
            <div className="input-wrapper">
              <input
                type="password"
                id="loginPassword"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="input-icon"><FaIcon name="lock" /></span>
            </div>
          </div>

          <div className="login-remember">
            <label>
              <input type="checkbox" id="rememberMe" /> Se souvenir de moi
            </label>
            <a href="#">Mot de passe oublié?</a>
          </div>

          <button type="submit" className="btn-login" disabled={!!loading}>
            {loading ? (
              <span
                className="spinner"
                style={{ width: '20px', height: '20px', borderWidth: '2px', margin: '0 auto' }}
              ></span>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2025 SRM-MS — Direction SI & Transformation Digitale</p>
        </div>
      </div>
    </div>
  );
}
