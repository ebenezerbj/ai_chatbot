(async () => {
  try {
    const url = 'http://localhost:3000/api/analytics';
    const res = await fetch(url, { headers: { Authorization: 'Bearer mysecretadmintoken' } });
    if (!res.ok) {
      console.error('HTTP error', res.status, await res.text());
      process.exit(2);
    }
    const j = await res.json();
    console.log(JSON.stringify(j, null, 2));
  } catch (e) {
    console.error('Fetch failed', e);
    process.exit(1);
  }
})();
