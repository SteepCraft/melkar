import { Router } from 'express';
import { db, clients } from '@melkar/database';
import { eq, sql, count } from 'drizzle-orm';

const router = Router();

// GET /api/clients
router.get('/', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const where = status ? eq(clients.status, status) : undefined;
    const rows = await db.select().from(clients).where(where).orderBy(clients.id);

    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        address: r.address,
        status: r.status,
      })),
    );
  } catch (err) {
    console.error('Clients error:', err);
    res.status(500).json({ error: 'Error obteniendo clientes' });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  try {
    const [row] = await db.select().from(clients).where(eq(clients.id, req.params.id));
    if (!row) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }
    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      status: row.status,
    });
  } catch (err) {
    console.error('Client detail error:', err);
    res.status(500).json({ error: 'Error obteniendo cliente' });
  }
});

// POST /api/clients
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: 'Nombre requerido' });
      return;
    }
    if (phone && phone.length !== 10) {
      res.status(400).json({ error: 'El teléfono debe tener 10 dígitos' });
      return;
    }

    if (email) {
      const [{ value: dupCount }] = await db
        .select({ value: count() })
        .from(clients)
        .where(eq(clients.email, email));
      if (Number(dupCount) > 0) {
        res.status(409).json({ error: 'Ya existe un cliente con ese email' });
        return;
      }
    }

    // Generate next CL-N id
    const [{ maxNum }] = await db.select({
      maxNum: sql<number>`COALESCE(MAX(CAST(REPLACE(${clients.id}, 'CL-', '') AS INTEGER)), 0)`,
    }).from(clients);
    const clientId = `CL-${maxNum + 1}`;

    await db.insert(clients).values({
      id: clientId,
      name,
      email: email ?? '',
      phone: phone ?? '',
      address: address ?? '',
      status: 'Activo',
    });

    res.status(201).json({ id: clientId, name, email, phone, address, status: 'Activo' });
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'Error creando cliente' });
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { name, email, phone, address } = req.body;
    if (phone && phone.length !== 10) {
      res.status(400).json({ error: 'El teléfono debe tener 10 dígitos' });
      return;
    }

    const [current] = await db.select().from(clients).where(eq(clients.id, id));
    if (!current) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    const updated = {
      name: name ?? current.name,
      email: email ?? current.email ?? '',
      phone: phone ?? current.phone ?? '',
      address: address ?? current.address ?? '',
    };

    await db.update(clients).set(updated).where(eq(clients.id, id));
    res.json({ id, ...updated, status: current.status });
  } catch (err) {
    console.error('Update client error:', err);
    res.status(500).json({ error: 'Error actualizando cliente' });
  }
});

// PUT /api/clients/:id/toggle
router.put('/:id/toggle', async (req, res) => {
  try {
    const id = req.params.id;
    const [current] = await db
      .select({ status: clients.status })
      .from(clients)
      .where(eq(clients.id, id));
    if (!current) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }

    const newStatus = current.status === 'Activo' ? 'Inactivo' : 'Activo';
    await db.update(clients).set({ status: newStatus }).where(eq(clients.id, id));
    res.json({ id, status: newStatus });
  } catch (err) {
    console.error('Toggle client error:', err);
    res.status(500).json({ error: 'Error actualizando cliente' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await db.delete(clients).where(eq(clients.id, id)).returning({ id: clients.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: 'Cliente no encontrado' });
      return;
    }
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'Error eliminando cliente' });
  }
});

export default router;
