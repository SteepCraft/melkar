import { Router } from 'express';
import { db, sales, saleItems, products, inventoryMovements } from '@melkar/database';
import { eq, sql, gte, lt } from 'drizzle-orm';
import { n, stockStatus } from '../utils';

const router = Router();

// GET /api/sales
router.get('/', async (req, res) => {
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
    const rows = await db.select().from(sales).where(where).orderBy(sql`${sales.id} DESC`);

    const result = [];
    for (const r of rows) {
      const items = await db
        .select({
          productName: saleItems.productName,
          price: saleItems.price,
          quantity: saleItems.quantity,
        })
        .from(saleItems)
        .where(eq(saleItems.saleId, r.id));

      result.push({
        id: r.id,
        clientId: r.clientId,
        clientName: r.clientName,
        employeeName: r.employeeName,
        items: items.map((i) => ({
          productName: i.productName,
          price: n(i.price),
          quantity: i.quantity ?? 0,
        })),
        subtotal: n(r.subtotal),
        tax: n(r.tax),
        transport: n(r.transport),
        total: n(r.total),
        status: r.status,
        createdAt: r.createdAt?.toISOString() ?? null,
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Sales error:', err);
    res.status(500).json({ error: 'Error obteniendo ventas' });
  }
});

// POST /api/sales
router.post('/', async (req, res) => {
  try {
    const { clientId, clientName, employeeName, items = [], transport = 0 } = req.body;
    if (!clientId) {
      res.status(400).json({ error: 'Debe seleccionar un cliente' });
      return;
    }
    if (items.length === 0) {
      res.status(400).json({ error: 'Debe agregar al menos un producto' });
      return;
    }

    // Validate stock & active
    for (const it of items) {
      const pName = it.productName ?? it.name ?? '';
      const [prod] = await db
        .select({ id: products.id, stock: products.stock, active: products.active })
        .from(products)
        .where(eq(products.name, pName));

      if (!prod) {
        res.status(400).json({ error: `El producto '${pName}' no existe` });
        return;
      }
      if (prod.active === false) {
        res.status(400).json({ error: `El producto '${pName}' está inactivo` });
        return;
      }
      if ((prod.stock ?? 0) < it.quantity) {
        res.status(400).json({
          error: `Stock insuficiente para '${pName}'. Disponible: ${prod.stock}`,
        });
        return;
      }
    }

    const subtotal = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    const tax = Math.round(subtotal * 0.19 * 100) / 100;
    const total = Math.round((subtotal + tax + transport) * 100) / 100;

    const [created] = await db
      .insert(sales)
      .values({
        clientId,
        clientName: clientName ?? '',
        employeeName: employeeName ?? '',
        subtotal: String(subtotal),
        tax: String(tax),
        transport: String(transport),
        total: String(total),
        status: 'Completada',
      })
      .returning();

    for (const it of items) {
      const pName = it.productName ?? it.name ?? '';
      await db.insert(saleItems).values({
        saleId: created.id,
        productName: pName,
        price: String(it.price),
        quantity: it.quantity,
      });

      // Deduct stock
      const [prod] = await db
        .select({ id: products.id, stock: products.stock })
        .from(products)
        .where(eq(products.name, pName));
      if (prod) {
        const newStock = (prod.stock ?? 0) - it.quantity;
        await db
          .update(products)
          .set({ stock: newStock, status: stockStatus(newStock) })
          .where(eq(products.id, prod.id));

        await db.insert(inventoryMovements).values({
          productName: pName,
          type: 'SALIDA',
          quantity: it.quantity,
          reason: `Venta #${created.id}`,
        });
      }
    }

    res.status(201).json({
      id: created.id,
      clientId,
      clientName,
      items,
      subtotal,
      tax,
      transport,
      total,
      status: 'Completada',
      createdAt: created.createdAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('Create sale error:', err);
    res.status(500).json({ error: 'Error creando venta' });
  }
});

export default router;
