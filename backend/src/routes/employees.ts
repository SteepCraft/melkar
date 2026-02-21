import { Router } from 'express';
import { db, employees } from '@melkar/database';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/employees
router.get('/', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const where = status ? eq(employees.status, status) : undefined;
    const rows = await db.select().from(employees).where(where).orderBy(employees.id);

    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        document: r.document,
        phone: r.phone,
        email: r.email,
        position: r.position,
        status: r.status,
      })),
    );
  } catch (err) {
    console.error('Employees error:', err);
    res.status(500).json({ error: 'Error obteniendo empleados' });
  }
});

// POST /api/employees
router.post('/', async (req, res) => {
  try {
    const { name, document, phone, email, position } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: 'Nombre requerido' });
      return;
    }

    const [created] = await db
      .insert(employees)
      .values({
        name,
        document: document ?? '',
        phone: phone ?? '',
        email: email ?? '',
        position: position ?? '',
        status: 'Activo',
      })
      .returning();

    res.status(201).json({
      id: created.id,
      name: created.name,
      document: created.document,
      phone: created.phone,
      email: created.email,
      position: created.position,
      status: 'Activo',
    });
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'Error creando empleado' });
  }
});

// PUT /api/employees/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, document, phone, email, position } = req.body;

    const [current] = await db.select().from(employees).where(eq(employees.id, id));
    if (!current) {
      res.status(404).json({ error: 'Empleado no encontrado' });
      return;
    }

    const updated = {
      name: name ?? current.name,
      document: document ?? current.document ?? '',
      phone: phone ?? current.phone ?? '',
      email: email ?? current.email ?? '',
      position: position ?? current.position ?? '',
    };

    await db.update(employees).set(updated).where(eq(employees.id, id));
    res.json({ id, ...updated, status: current.status });
  } catch (err) {
    console.error('Update employee error:', err);
    res.status(500).json({ error: 'Error actualizando empleado' });
  }
});

// PUT /api/employees/:id/toggle
router.put('/:id/toggle', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db
      .select({ status: employees.status })
      .from(employees)
      .where(eq(employees.id, id));
    if (!current) {
      res.status(404).json({ error: 'Empleado no encontrado' });
      return;
    }

    const newStatus = current.status === 'Activo' ? 'Inactivo' : 'Activo';
    await db.update(employees).set({ status: newStatus }).where(eq(employees.id, id));
    res.json({ id, status: newStatus });
  } catch (err) {
    console.error('Toggle employee error:', err);
    res.status(500).json({ error: 'Error actualizando empleado' });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await db
      .delete(employees)
      .where(eq(employees.id, id))
      .returning({ id: employees.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: 'Empleado no encontrado' });
      return;
    }
    res.json({ message: 'Empleado eliminado' });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ error: 'Error eliminando empleado' });
  }
});

export default router;
