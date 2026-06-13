const loginUrl = 'http://localhost:8082/api/auth/login';
const agentsUrl = 'http://localhost:8082/api/agents';

async function run() {
  try {
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@srm-ms.ma', password: 'admin123' })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    
    const agentsRes = await fetch(agentsUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const agents = await agentsRes.json();
    console.log('Number of agents returned:', agents.length);
    console.log('Agents list:', agents.map(a => ({ id: a.id, matricule: a.matricule, nom: a.nom })));
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
