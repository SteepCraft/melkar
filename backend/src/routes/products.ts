import { Router } from 'express';
import { db, products, inventoryMovements } from '@melkar/database';
import { eq, and, gt, lte, sql, count } from 'drizzle-orm';
import { n, stockStatus } from '../utils';

const router = Router();

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const filter = req.query.filter as string | undefined;

    const where =
      filter === 'in-stock' ? and(eq(products.active, true), gt(products.stock, 10))
      : filter === 'low' ? and(eq(products.active, true), gt(products.stock, 0), lte(products.stock, 10))
      : filter === 'inactive' ? eq(products.active, false)
      : filter === 'active' ? eq(products.active, true)
      : undefined;

    const rows = await db.select().from(products).where(where).orderBy(products.id);

    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        sku: r.sku,
        price: n(r.price),
        stock: r.stock ?? 0,
        status: r.status,
        active: r.active ?? true,
      })),
    );
  } catch (err) {
    console.error('Products error:', err);
    res.status(500).json({ error: 'Error obteniendo productos' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select().from(products).where(eq(products.id, id));
    if (!row) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.json({
      id: row.id,
      name: row.name,
      sku: row.sku,
      price: n(row.price),
      stock: row.stock ?? 0,
      status: row.status,
      active: row.active ?? true,
    });
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({ error: 'Error obteniendo producto' });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const { name, sku, price, stock = 0 } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: 'Nombre requerido' });
      return;
    }
    if ((price ?? 0) < 0) {
      res.status(400).json({ error: 'El precio no puede ser negativo' });
      return;
    }

    // Unique name check
    const [{ value: dupCount }] = await db
      .select({ value: count() })
      .from(products)
      .where(sql`UPPER(${products.name}) = UPPER(${name})`);
    if (Number(dupCount) > 0) {
      res.status(409).json({ error: 'Ya existe un producto con ese nombre' });
      return;
    }

    const status = stockStatus(stock);
    const [created] = await db
      .insert(products)
      .values({ name, sku: sku ?? '', price: String(price ?? 0), stock, status, active: true })
      .returning();

    res.status(201).json({
      id: created.id,
      name: created.name,
      sku: created.sku,
      price: n(created.price),
      stock: created.stock ?? 0,
      status: created.status,
      active: true,
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Error creando producto' });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, sku, price, stock } = req.body;
    if ((price ?? 0) < 0) {
      res.status(400).json({ error: 'El precio no puede ser negativo' });
      return;
    }

    const [current] = await db.select().from(products).where(eq(products.id, id));
    if (!current) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const newName = name ?? current.name;
    if (name) {
      const [{ value: dupCount }] = await db
        .select({ value: count() })
        .from(products)
        .where(and(sql`UPPER(${products.name}) = UPPER(${newName})`, sql`${products.id} <> ${id}`));
      if (Number(dupCount) > 0) {
        res.status(409).json({ error: 'Ya existe otro producto con ese nombre' });
        return;
      }
    }

    const newSku = sku ?? current.sku;
    const newPrice = price !== undefined ? String(price) : current.price;
    const newStock = stock ?? current.stock ?? 0;
    const newStatus = stockStatus(newStock);

    await db
      .update(products)
      .set({ name: newName, sku: newSku, price: newPrice, stock: newStock, status: newStatus })
      .where(eq(products.id, id));

    res.json({
      id,
      name: newName,
      sku: newSku,
      price: n(newPrice),
      stock: newStock,
      status: newStatus,
      active: current.active ?? true,
    });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Error actualizando producto' });
  }
});

// PUT /api/products/:id/toggle
router.put('/:id/toggle', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db
      .select({ active: products.active })
      .from(products)
      .where(eq(products.id, id));
    if (!current) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const newActive = !(current.active ?? true);
    await db.update(products).set({ active: newActive }).where(eq(products.id, id));
    res.json({
      id,
      active: newActive,
      message: newActive ? 'Producto activado' : 'Producto inhabilitado',
    });
  } catch (err) {
    console.error('Toggle product error:', err);
    res.status(500).json({ error: 'Error actualizando producto' });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await db.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Error eliminando producto' });
  }
});

// POST /api/products/:id/restock
router.post('/:id/restock', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const qty = req.body.quantity ?? 20;

    const [current] = await db
      .select({ id: products.id, name: products.name, stock: products.stock })
      .from(products)
      .where(eq(products.id, id));
    if (!current) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const newStock = (current.stock ?? 0) + qty;
    const newStatus = stockStatus(newStock);

    await db
      .update(products)
      .set({ stock: newStock, status: newStatus })
      .where(eq(products.id, id));

    await db.insert(inventoryMovements).values({
      productName: current.name,
      type: 'ENTRADA',
      quantity: qty,
      reason: 'Reposición desde dashboard',
    });

    res.json({
      message: `Se repusieron ${qty} unidades de ${current.name}`,
      product: { id, name: current.name, stock: newStock, status: newStatus },
    });
  } catch (err) {
    console.error('Restock error:', err);
    res.status(500).json({ error: 'Error reponiendo stock' });
  }
});

export default router;
