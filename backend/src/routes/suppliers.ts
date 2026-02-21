import { Router } from 'express';
import { db, suppliers } from '@melkar/database';
import { eq, or, ilike, sql, count } from 'drizzle-orm';

const router = Router();

// GET /api/suppliers
router.get('/', async (req, res) => {
  try {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    let where;
    const conditions = [];
    if (search) {
      conditions.push(or(ilike(suppliers.name, `%${search}%`), ilike(suppliers.nit, `%${search}%`)));
    }
    if (status) {
      conditions.push(eq(suppliers.status, status));
    }
    if (conditions.length === 1) where = conditions[0];
    else if (conditions.length > 1) where = sql`${conditions[0]} AND ${conditions[1]}`;

    const rows = await db.select().from(suppliers).where(where).orderBy(suppliers.id);

    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        nit: r.nit,
        phone: r.phone,
        location: r.location,
        rating: r.rating ?? 0,
        email: r.email,
        status: r.status ?? 'Activo',
      })),
    );
  } catch (err) {
    console.error('Suppliers error:', err);
    res.status(500).json({ error: 'Error obteniendo proveedores' });
  }
});

// POST /api/suppliers
router.post('/', async (req, res) => {
  try {
    const { name, nit, phone, location, rating, email } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: 'Nombre requerido' });
      return;
    }

    if (nit) {
      const [{ value: dupCount }] = await db
        .select({ value: count() })
        .from(suppliers)
        .where(eq(suppliers.nit, nit));
      if (Number(dupCount) > 0) {
        res.status(409).json({ error: 'Ya existe un proveedor con ese NIT' });
        return;
      }
    }

    const [created] = await db
      .insert(suppliers)
      .values({
        name,
        nit: nit ?? '',
        phone: phone ?? '',
        location: location ?? '',
        rating: rating ?? 0,
        email: email ?? '',
        status: 'Activo',
      })
      .returning();

    res.status(201).json({
      id: created.id,
      name: created.name,
      nit: created.nit,
      phone: created.phone,
      location: created.location,
      email: created.email,
      status: 'Activo',
    });
  } catch (err) {
    console.error('Create supplier error:', err);
    res.status(500).json({ error: 'Error creando proveedor' });
  }
});

// PUT /api/suppliers/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, nit, phone, location, email } = req.body;

    const [current] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    if (!current) {
      res.status(404).json({ error: 'Proveedor no encontrado' });
      return;
    }

    const newNit = nit ?? current.nit ?? '';
    if (nit) {
      const [{ value: dupCount }] = await db
        .select({ value: count() })
        .from(suppliers)
        .where(sql`${suppliers.nit} = ${newNit} AND ${suppliers.id} <> ${id}`);
      if (Number(dupCount) > 0) {
        res.status(409).json({ error: 'Otro proveedor ya tiene ese NIT' });
        return;
      }
    }

    const updated = {
      name: name ?? current.name,
      nit: newNit,
      phone: phone ?? current.phone ?? '',
      location: location ?? current.location ?? '',
      email: email ?? current.email ?? '',
    };

    await db.update(suppliers).set(updated).where(eq(suppliers.id, id));
    res.json({ id, ...updated, status: current.status });
  } catch (err) {
    console.error('Update supplier error:', err);
    res.status(500).json({ error: 'Error actualizando proveedor' });
  }
});

// PUT /api/suppliers/:id/toggle
router.put('/:id/toggle', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db
      .select({ status: suppliers.status })
      .from(suppliers)
      .where(eq(suppliers.id, id));
    if (!current) {
      res.status(404).json({ error: 'Proveedor no encontrado' });
      return;
    }

    const newStatus = current.status === 'Activo' ? 'Inactivo' : 'Activo';
    await db.update(suppliers).set({ status: newStatus }).where(eq(suppliers.id, id));
    res.json({ id, status: newStatus });
  } catch (err) {
    console.error('Toggle supplier error:', err);
    res.status(500).json({ error: 'Error actualizando proveedor' });
  }
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await db.delete(suppliers).where(eq(suppliers.id, id)).returning({ id: suppliers.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: 'Proveedor no encontrado' });
      return;
    }
    res.json({ message: 'Proveedor eliminado' });
  } catch (err) {
    console.error('Delete supplier error:', err);
    res.status(500).json({ error: 'Error eliminando proveedor' });
  }
});

export default router;
