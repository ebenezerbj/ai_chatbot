import fetch from 'node-fetch';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

async function request(path: string, opts: any = {}) {
  const headers: any = opts.headers || {};
  headers['Content-Type'] = 'application/json';
  if (ADMIN_TOKEN) headers['Authorization'] = `Bearer ${ADMIN_TOKEN}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let body: any = undefined;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function main() {
  console.log('Starting KB + Milvus smoke test');

  // Create
  const createPayload = { product: 'SmokeTestProduct', questionPatterns: ['How do I test?'], answer: 'Smoke-test KB entry', tags: ['smoke'] };
  console.log('Creating KB entry...');
  const created = await request('/api/kb', { method: 'POST', body: JSON.stringify(createPayload) });
  console.log('Create response:', created.status, created.body);
  if (created.status !== 201) {
    console.warn('Create did not return 201; aborting further steps');
    return;
  }

  const id = created.body._id || created.body.id || created.body?.id_str || created.body?.id;
  console.log('Created entry id:', id);

  // List
  console.log('Listing KB entries...');
  const list = await request('/api/kb');
  console.log('List response:', list.status, Array.isArray(list.body) ? `${list.body.length} entries` : list.body);

  // Update
  console.log('Updating KB entry...');
  const update = await request(`/api/kb/${id}`, { method: 'PUT', body: JSON.stringify({ answer: 'Updated by smoke test' }) });
  console.log('Update response:', update.status, update.body);

  // Delete
  console.log('Deleting KB entry...');
  const del = await request(`/api/kb/${id}`, { method: 'DELETE' });
  console.log('Delete response:', del.status, del.body);

  // Try contacting Milvus helper via backend (no direct helper exposed) — attempt to call a search route that relies on DB only
  console.log('Attempting DB search (fallback)');
  const search = await request(`/api/kb/search/${encodeURIComponent('SmokeTestProduct')}`);
  console.log('Search response:', search.status, Array.isArray(search.body) ? `${search.body.length} results` : search.body);

  console.log('Smoke test completed. Note: Milvus connectivity is verified via server logs; if Milvus is down, the server will log errors but DB operations should succeed.');
}

main().catch(e => { console.error('Smoke test failed', e); process.exit(1); });
