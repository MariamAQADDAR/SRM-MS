import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const users = {
  admin: { email: 'admin@srm-ms.ma', password: 'admin123', name: 'AQADDAR Marieme', role: 'Administrateur' },
  operateur: { email: 'operateur@srm-ms.ma', password: 'oper123', name: 'Youssef Benali', role: 'Opérateur' },
  consultateur: { email: 'consult@srm-ms.ma', password: 'cons123', name: 'Fatima Zahrae', role: 'Consultateur' }
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setRole(selectedRole);
    if (users[selectedRole]) {
      setEmail(users[selectedRole].email);
      setPassword(users[selectedRole].password);
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!role) {
      alert('Veuillez sélectionner un rôle.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const userData = users[role] || { name: email.split('@')[0], role: role };
      userData.email = email;
      userData.role = role === 'admin' ? 'Administrateur' : role === 'operateur' ? 'Opérateur' : 'Consultateur';
      
      sessionStorage.setItem('mutuelle_user', JSON.stringify(userData));
      navigate('/app');
    }, 1200);
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">🏥</div>
          <h1>SRM — Mutuelle</h1>
          <p>Gestion de la Mutuelle — Marrakech-Safi</p>
        </div>

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
              <span className="input-icon">📧</span>
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
              <span className="input-icon">🔒</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="loginRole">Se connecter en tant que</label>
            <div className="input-wrapper">
              <select id="loginRole" value={role} onChange={handleRoleChange} required>
                <option value="">— Sélectionnez un rôle —</option>
                <option value="admin">Administrateur</option>
                <option value="operateur">Opérateur</option>
                <option value="consultateur">Consultateur</option>
              </select>
              <span className="input-icon">👤</span>
            </div>
          </div>

          <div className="login-remember">
            <label>
              <input type="checkbox" id="rememberMe" /> Se souvenir de moi
            </label>
            <a href="#">Mot de passe oublié?</a>
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <span className="spinner" style={{width:'20px',height:'20px',borderWidth:'2px',margin:'0 auto'}}></span>
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
