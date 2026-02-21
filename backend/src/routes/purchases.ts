import { Router } from 'express';
import { db, purchases, purchaseItems, products, inventoryMovements, suppliers } from '@melkar/database';
import { eq, sql, count } from 'drizzle-orm';
import { n, stockStatus } from '../utils';

const router = Router();

// GET /api/purchases
router.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(purchases).orderBy(sql`${purchases.id} DESC`);

    const result = [];
    for (const r of rows) {
      const items = await db
        .select({
          productName: purchaseItems.productName,
          price: purchaseItems.price,
          quantity: purchaseItems.quantity,
        })
        .from(purchaseItems)
        .where(eq(purchaseItems.purchaseId, r.id));

      result.push({
        id: r.id,
        supplierId: r.supplierId ?? 0,
        supplierName: r.supplierName,
        items: items.map((i) => ({
          productName: i.productName,
          price: n(i.price),
          quantity: i.quantity ?? 0,
        })),
        total: n(r.total),
        status: r.status,
        createdAt: r.createdAt?.toISOString() ?? null,
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Purchases error:', err);
    res.status(500).json({ error: 'Error obteniendo compras' });
  }
});

// POST /api/purchases
router.post('/', async (req, res) => {
  try {
    const { supplierId, supplierName, items = [] } = req.body;
    if (!supplierId) {
      res.status(400).json({ error: 'Debe seleccionar un proveedor' });
      return;
    }
    if (items.length === 0) {
      res.status(400).json({ error: 'Debe agregar al menos un producto' });
      return;
    }
    for (const it of items) {
      if (it.quantity <= 0) {
        res.status(400).json({
          error: `Cantidad del producto '${it.productName ?? it.name}' debe ser mayor a 0`,
        });
        return;
      }
    }

    // Verify supplier exists
    const [{ value: supCount }] = await db
      .select({ value: count() })
      .from(suppliers)
      .where(eq(suppliers.id, supplierId));
    if (Number(supCount) === 0) {
      res.status(400).json({ error: 'El proveedor seleccionado no existe' });
      return;
    }

    const calcTotal = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);

    const [created] = await db
      .insert(purchases)
      .values({
        supplierId,
        supplierName: supplierName ?? '',
        total: String(calcTotal),
        status: 'Pendiente',
      })
      .returning();

    for (const it of items) {
      const pName = it.productName ?? it.name ?? '';
      await db.insert(purchaseItems).values({
        purchaseId: created.id,
        productName: pName,
        price: String(it.price ?? 0),
        quantity: it.quantity ?? 0,
      });

      // Update inventory
      const [prod] = await db
        .select({ id: products.id, stock: products.stock })
        .from(products)
        .where(eq(products.name, pName));
      if (prod) {
        const newStock = (prod.stock ?? 0) + it.quantity;
        await db
          .update(products)
          .set({ stock: newStock, status: stockStatus(newStock) })
          .where(eq(products.id, prod.id));
      }

      await db.insert(inventoryMovements).values({
        productName: pName,
        type: 'ENTRADA',
        quantity: it.quantity,
        reason: `Compra #${created.id}`,
      });
    }

    res.status(201).json({
      id: created.id,
      supplierId,
      supplierName,
      items,
      total: calcTotal,
      status: 'Pendiente',
      createdAt: created.createdAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('Create purchase error:', err);
    res.status(500).json({ error: 'Error creando orden de compra' });
  }
});

// PATCH /api/purchases/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Estado requerido' });
      return;
    }

    const [current] = await db.select().from(purchases).where(eq(purchases.id, id));
    if (!current) {
      res.status(404).json({ error: 'Compra no encontrada' });
      return;
    }

    await db.update(purchases).set({ status }).where(eq(purchases.id, id));
    res.json({ id, status });
  } catch (err) {
    console.error('Update purchase status error:', err);
    res.status(500).json({ error: 'Error actualizando estado de compra' });
  }
});

export default router;
