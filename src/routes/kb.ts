import express from 'express';
import { kbService } from '../services/kbService';
import { authenticateAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { KBCreateSchema, KBUpdateSchema } from '../validation/kbValidation';

const router = express.Router();

// Get all KB entries
router.get('/', authenticateAdmin, async (req: any, res: any) => {
  try {
    const entries = await kbService.getAllEntries();
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KB entries' });
  }
});

// Search KB entries (place before :id to avoid route shadowing)
router.get('/search/:query', authenticateAdmin, async (req: any, res: any) => {
  try {
    const entries = await kbService.searchEntries(req.params.query);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search KB entries' });
  }
});

// Get single KB entry
router.get('/:id', authenticateAdmin, async (req: any, res: any) => {
  try {
    const entry = await kbService.getEntryById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KB entry' });
  }
});

// Create new KB entry
router.post('/', authenticateAdmin, validateBody(KBCreateSchema), async (req: express.Request, res: express.Response) => {
  try {
    const body = req.body as any;
    const entry = await kbService.createEntry(body);
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create KB entry' });
  }
});

// Update KB entry
router.put('/:id', authenticateAdmin, validateBody(KBUpdateSchema), async (req: express.Request, res: express.Response) => {
  try {
  const entry = await kbService.updateEntry((req as any).params.id, req.body as any);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update KB entry' });
  }
});

// Delete KB entry
router.delete('/:id', authenticateAdmin, async (req: any, res: any) => {
  try {
    const entry = await kbService.deleteEntry(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete KB entry' });
  }
});
// (search route moved above)

export default router;
