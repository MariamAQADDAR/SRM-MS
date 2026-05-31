import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FaIcon from './FaIcon';
import { apiLogin } from '../api/client';

const COPY = {
  fr: {
    title: 'Se connecter',
    subtitle: 'Accédez à votre compte pour continuer la gestion de la mutuelle.',
    email: 'Adresse email',
    password: 'Mot de passe',
    emailPh: 'vous@exemple.com',
    passwordPh: 'Votre mot de passe',
    submit: 'Se connecter',
    tagline: 'Chaque dossier compte, chaque bénéficiaire a son importance.',
    brandSub: 'Marrakech-Safi',
    brandLine: 'Gestion de la mutuelle — espace professionnel',
    copyright: 'SRM-MS — Direction SI & Transformation Digitale',
  },
  ar: {
    title: 'تسجيل الدخول',
    subtitle: 'سجّل الدخول إلى حسابك لمتابعة إدارة التأمين الصحي.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    emailPh: 'you@example.com',
    passwordPh: 'كلمة المرور',
    submit: 'دخول',
    tagline: 'كل ملف مهم، وكل مستفيد له أهميته.',
    brandSub: 'مراكش آسفي',
    brandLine: 'إدارة التأمين — فضاء مهني',
    copyright: 'SRM-MS — قسم الأنظمة المعلوماتية',
  },
};

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
  const [showPassword, setShowPassword] = useState(false);
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState('fr');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();
  const t = COPY[lang] || COPY.fr;

  useEffect(() => {
    document.body.classList.add('login-route-active');
    return () => document.body.classList.remove('login-route-active');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      if (data.forcePasswordChange) {
        setMustChangePassword(true);
        setLoading(false);
        return;
      }
      const payload = sessionUserFromLoginResponse(data);
      if (!payload.token) {
        throw new Error('Réponse serveur invalide');
      }
      sessionStorage.setItem('mutuelle_user', JSON.stringify(payload));
      navigate('/app');
    } catch (err) {
      setError(err.message || 'Connexion impossible');
    } finally {
      if (!mustChangePassword) setLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
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
      // Pour changer le mot de passe, on doit d'abord se connecter pour obtenir un token.
      // Mais forcePasswordChange nous a empêché d'enregistrer le token ?
      // En fait, on a besoin du token temporaire pour appeler /api/auth/change-password
      const data = await apiLogin(email, password);
      const payload = sessionUserFromLoginResponse(data);
      
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${payload.token}`
        },
        body: JSON.stringify({
          currentPassword: password,
          newPassword: newPassword
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Erreur lors du changement de mot de passe');
      }
      
      sessionStorage.setItem('mutuelle_user', JSON.stringify(payload));
      navigate('/app');
    } catch (err) {
      setError(err.message || 'Changement de mot de passe impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`login-split ${dark ? 'login-split--dark' : ''}`} dir="ltr">
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
          <p className="login-split-brand-sub">{t.brandSub}</p>
          <p className="login-split-brand-line">{t.brandLine}</p>
        </div>
        <p className="login-split-brand-slogan">{t.tagline}</p>
      </aside>

      <main className="login-split-main" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
        <header className="login-split-topbar">
          <div className="login-split-topbar-spacer" />
          <div className="login-split-topbar-actions">
            <button
              type="button"
              className="login-split-icon-btn"
              onClick={() => setDark((d) => !d)}
              aria-pressed={dark}
              title={dark ? 'Mode clair' : 'Mode sombre'}
            >
              <FaIcon name={dark ? 'sun' : 'moon'} />
            </button>
            <label className="login-split-lang">
              <span className="sr-only">Langue</span>
              <span className="login-split-lang-flag" aria-hidden>
                {lang === 'fr' ? '🇫🇷' : '🇲🇦'}
              </span>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="login-split-lang-select"
              >
                <option value="fr">FR</option>
                <option value="ar">AR</option>
              </select>
            </label>
          </div>
        </header>

        <div className="login-split-content">
          <h2 className="login-split-heading">{t.title}</h2>
          <p className="login-split-lead">{t.subtitle}</p>

          <div className="login-split-card">
            {error ? (
              <div className="login-split-alert" role="alert">
                {error}
              </div>
            ) : null}

            {mustChangePassword ? (
              <form className="login-split-form" onSubmit={handleChangePasswordSubmit} autoComplete="off">
                <div className="login-split-alert" role="alert" style={{backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd'}}>
                  <FaIcon name="shield-halved" className="fa-inline-icon" /> Pour des raisons de sécurité, veuillez modifier votre mot de passe pour votre première connexion.
                </div>
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
                    "Mettre à jour et se connecter"
                  )}
                </button>
              </form>
            ) : (
              <form className="login-split-form" onSubmit={handleSubmit} autoComplete="off">
                <div className="login-split-field">
                  <label htmlFor="loginEmail">
                    {t.email} <span className="login-split-required">*</span>
                  </label>
                  <input
                    type="email"
                    id="loginEmail"
                    className="login-split-input"
                    placeholder={t.emailPh}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="login-split-field">
                  <label htmlFor="loginPassword">
                    {t.password} <span className="login-split-required">*</span>
                  </label>
                  <div className="login-split-password-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="loginPassword"
                      className="login-split-input login-split-input--password"
                      placeholder={t.passwordPh}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="login-split-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      <FaIcon name={showPassword ? 'eye-slash' : 'eye'} />
                    </button>
                  </div>
                  <div style={{ marginTop: '8px', textAlign: 'right' }}>
                    <button 
                      type="button" 
                      onClick={() => navigate('/forgot-password')} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                </div>

                <button type="submit" className="login-split-submit" disabled={!!loading}>
                  {loading ? (
                    <span
                      className="spinner"
                      style={{ width: '20px', height: '20px', borderWidth: '2px', margin: '0 auto' }}
                    />
                  ) : (
                    t.submit
                  )}
                </button>
              </form>
            )}
          </div>

          <p className="login-split-copy">© {new Date().getFullYear()} {t.copyright}</p>
        </div>
      </main>
    </div>
  );
}
