import express from 'express';
import { executeQuery } from './database';

const app = express();

const SECRET_KEY = process.env.ADMIN_SECRET || 'change-me-in-production';

app.get('/admin/wipe-customer-data', async (req, res) => {
  try {
    // Security check
    const providedKey = req.query.secret;
    if (providedKey !== SECRET_KEY) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    console.log('[wipe] Starting data wipe...');
    
    // Check existing tables
    const tables = await executeQuery<{ table_name: string }>(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
      []
    );
    
    const existing = new Set(tables.map(t => t.table_name));
    const TABLES_TO_WIPE = ['transactions', 'account_balances', 'customers', 'loans'];
    const toDelete = TABLES_TO_WIPE.filter(t => existing.has(t));
    
    if (toDelete.length === 0) {
      return res.json({ message: 'No tables found', tables: Array.from(existing) });
    }
    
    console.log('[wipe] Tables to clear:', toDelete);
    
    // Delete in reverse order (respects FK constraints)
    const results: Record<string, number> = {};
    
    for (const table of toDelete.reverse()) {
      console.log(`[wipe] Clearing ${table}...`);
      
      await executeQuery(`DELETE FROM "${table}"`, []);
      
      const count = await executeQuery<{ count: string }>(
        `SELECT COUNT(*) as count FROM "${table}"`,
        []
      );
      
      results[table] = parseInt(count[0]?.count || '0');
      console.log(`[wipe] ${table}: ${results[table]} rows remaining`);
    }
    
    res.json({
      message: 'Data wiped successfully',
      tablesCleared: toDelete,
      remainingRows: results
    });
    
  } catch (error: any) {
    console.error('[wipe] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Admin server running on http://localhost:${PORT}`);
  console.log(`Wipe endpoint: http://localhost:${PORT}/admin/wipe-customer-data?secret=${SECRET_KEY}`);
});
