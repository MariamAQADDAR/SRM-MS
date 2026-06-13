import pg from 'pg';
const { Client } = pg;

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Mariam.123.456.123.456%40%40@localhost:5432/SRM-MS'
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const agentsRes = await client.query('SELECT id, matricule, nom, prenom, email, deleted FROM agents WHERE id IN (12, 13, 14)');
    console.log('--- staff agents ---');
    console.table(agentsRes.rows);

  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    await client.end();
  }
}

main();
