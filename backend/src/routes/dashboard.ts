import { Router } from 'express';
import { db, products, quotes, purchases, sales } from '@melkar/database';
import { eq, and, lte, gte, inArray, sql } from 'drizzle-orm';
import { n } from '../utils';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', async (_req, res) => {
  try {
    const [{ totalStock }] = await db
      .select({ totalStock: sql<number>`COALESCE(SUM(${products.stock}), 0)::int` })
      .from(products)
      .where(eq(products.active, true));

    const [{ activeQuotes }] = await db
      .select({ activeQuotes: sql<number>`COUNT(*)::int` })
      .from(quotes)
      .where(inArray(quotes.status, ['Borrador', 'Enviada']));

    const [{ activePurchases }] = await db
      .select({ activePurchases: sql<number>`COUNT(*)::int` })
      .from(purchases)
      .where(eq(purchases.status, 'Pendiente'));

    const [{ totalSales }] = await db
      .select({ totalSales: sql<string>`COALESCE(SUM(${sales.total}), 0)` })
      .from(sales);

    const lowStock = await db
      .select()
      .from(products)
      .where(
        and(eq(products.active, true), gte(products.stock, 0), lte(products.stock, 10)),
      )
      .orderBy(products.stock);

    res.json({
      stats: {
        totalSales: Number(totalSales),
        totalStock,
        activeQuotes,
        activePurchases,
        weeklyTrend: [40, 60, 50, 45, 100, 70, 80],
      },
      lowStockAlerts: lowStock.map((r) => ({
        id: r.id,
        name: r.name,
        stock: r.stock ?? 0,
        status: (r.stock ?? 0) <= 3 ? 'Crítico' : 'Bajo',
      })),
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

export default router;
