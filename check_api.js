const loginUrl = 'http://localhost:8082/api/auth/login';
const agentsUrl = 'http://localhost:8082/api/agents';
const benefsUrl = 'http://localhost:8082/api/beneficiaries';

async function run() {
  try {
    // 1. Log in to get token
    console.log('Logging in...');
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@srm-ms.ma', password: 'admin123' })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed with status: ${loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log('Login successful. Token obtained:', token ? token.substring(0, 15) + '...' : 'undefined');
    
    // 2. Fetch agents
    console.log('Fetching agents...');
    const agentsRes = await fetch(agentsUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Agents status:', agentsRes.status);
    const agents = await agentsRes.json();
    console.log('Agents count:', agents.length);
    console.log('Sample agent data (first 3):');
    console.log(JSON.stringify(agents.slice(0, 3), null, 2));
    
    // 3. Fetch beneficiaries
    console.log('Fetching beneficiaries...');
    const benefsRes = await fetch(benefsUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Benefs status:', benefsRes.status);
    const benefs = await benefsRes.json();
    console.log('Beneficiaries count:', benefs.length);
    console.log('Sample beneficiary data (first 3):');
    console.log(JSON.stringify(benefs.slice(0, 3), null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
