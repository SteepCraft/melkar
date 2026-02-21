import { Router } from 'express';
import { db, sales } from '@melkar/database';
import { sql, gte, lt } from 'drizzle-orm';
import { n } from '../utils';

const router = Router();

// GET /api/reports/sales
router.get('/sales', async (req, res) => {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions = [];
    if (from) conditions.push(gte(sales.createdAt, new Date(from)));
    if (to) {
      const toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
      conditions.push(lt(sales.createdAt, toDate));
    }

    const where = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;
    const rows = await db.select().from(sales).where(where).orderBy(sql`${sales.createdAt} DESC`);

    const salesData = rows.map((r) => ({
      id: r.id,
      clientName: r.clientName,
      total: n(r.total),
      status: r.status,
      fecha: r.createdAt?.toISOString().split('T')[0] ?? null,
    }));

    const totalGeneral = salesData.reduce((sum, s) => sum + s.total, 0);

    res.json({ sales: salesData, totalGeneral });
  } catch (err) {
    console.error('Reports error:', err);
    res.status(500).json({ error: 'Error obteniendo reportes' });
  }
});

export default router;
