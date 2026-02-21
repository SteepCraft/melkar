import { Router } from 'express';
import { db, products, inventoryMovements } from '@melkar/database';
import { eq, and, lt, lte, gte, sql } from 'drizzle-orm';
import { n, stockStatus } from '../utils';

const router = Router();

// GET /api/inventory/stats
router.get('/stats', async (_req, res) => {
  try {
    const [{ totalSKUs }] = await db
      .select({ totalSKUs: sql<number>`COUNT(*)::int` })
      .from(products)
      .where(eq(products.active, true));

    const [{ alerts }] = await db
      .select({ alerts: sql<number>`COUNT(*)::int` })
      .from(products)
      .where(and(eq(products.active, true), lte(products.stock, 5)));

    const [{ totalValue }] = await db
      .select({
        totalValue: sql<string>`COALESCE(SUM(${products.price}::numeric * ${products.stock}), 0)`,
      })
      .from(products)
      .where(eq(products.active, true));

    res.json({ totalSKUs, alerts, totalValue: Number(totalValue) });
  } catch (err) {
    console.error('Inventory stats error:', err);
    res.status(500).json({ error: 'Error obteniendo stats de inventario' });
  }
});

// GET /api/inventory/products
router.get('/products', async (req, res) => {
  try {
    const filter = req.query.filter as string | undefined;
    let baseWhere = eq(products.active, true);

    const where =
      filter === 'critical'
        ? and(baseWhere, lt(products.stock, 5))
        : filter === 'low'
          ? and(baseWhere, gte(products.stock, 5), lte(products.stock, 10))
          : baseWhere;

    const rows = await db.select().from(products).where(where).orderBy(products.stock);

    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        price: n(r.price),
        stock: r.stock ?? 0,
        status: r.status,
      })),
    );
  } catch (err) {
    console.error('Inventory products error:', err);
    res.status(500).json({ error: 'Error obteniendo productos de inventario' });
  }
});

// GET /api/inventory/movements
router.get('/movements', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(inventoryMovements)
      .orderBy(sql`${inventoryMovements.movementDate} DESC, ${inventoryMovements.id} DESC`);

    res.json(
      rows.map((r) => ({
        id: r.id,
        productName: r.productName,
        type: r.type,
        quantity: r.quantity ?? 0,
        reason: r.reason,
        date: r.movementDate,
      })),
    );
  } catch (err) {
    console.error('Inventory movements error:', err);
    res.status(500).json({ error: 'Error obteniendo movimientos' });
  }
});

// POST /api/inventory/movements
router.post('/movements', async (req, res) => {
  try {
    const { productName, type, quantity, reason } = req.body;
    if (quantity <= 0) {
      res.status(400).json({ error: 'La cantidad debe ser mayor a 0' });
      return;
    }

    const [prod] = await db
      .select({ id: products.id, stock: products.stock })
      .from(products)
      .where(eq(products.name, productName));

    if (prod) {
      const curStock = prod.stock ?? 0;
      if (type === 'SALIDA' && curStock < quantity) {
        res.status(400).json({ error: 'Stock insuficiente para esta salida' });
        return;
      }
      const newStock = type === 'ENTRADA' ? curStock + quantity : Math.max(0, curStock - quantity);
      await db
        .update(products)
        .set({ stock: newStock, status: stockStatus(newStock) })
        .where(eq(products.id, prod.id));
    }

    const [created] = await db
      .insert(inventoryMovements)
      .values({ productName, type, quantity, reason: reason ?? '' })
      .returning();

    res.status(201).json({
      id: created.id,
      productName,
      type,
      quantity,
      reason,
      date: created.movementDate,
    });
  } catch (err) {
    console.error('Create movement error:', err);
    res.status(500).json({ error: 'Error registrando movimiento' });
  }
});

export default router;
