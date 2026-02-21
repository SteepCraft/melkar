import { Router } from 'express';
import { db, users } from '@melkar/database';
import { eq, count } from 'drizzle-orm';
import { requireRole } from '../utils';

const router = Router();

// GET /api/users
router.get('/', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const where = status ? eq(users.status, status === 'activo' ? 'Activo' : 'Inactivo') : undefined;

    const rows = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
    }).from(users).where(where).orderBy(users.id);

    res.json(rows);
  } catch (err) {
    console.error('Users error:', err);
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

// POST /api/users
router.post('/', requireRole('Administrador', 'Admin'), async (req, res) => {
  try {
    const { name, email, password = '123456', role = 'Vendedor' } = req.body;
    if (!email?.trim()) {
      res.status(400).json({ error: 'Email requerido' });
      return;
    }

    const [{ value: dupCount }] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.email, email));
    if (Number(dupCount) > 0) {
      res.status(409).json({ error: 'Ya existe un usuario con ese email' });
      return;
    }

    const [created] = await db
      .insert(users)
      .values({ name, email, password, role, status: 'Activo' })
      .returning();

    res.status(201).json({
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      status: 'Activo',
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Error creando usuario' });
  }
});

// PUT /api/users/:id
router.put('/:id', requireRole('Administrador', 'Admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, role } = req.body;

    const [current] = await db.select().from(users).where(eq(users.id, id));
    if (!current) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const updated = {
      name: name ?? current.name,
      email: email ?? current.email,
      role: role ?? current.role,
    };

    await db.update(users).set(updated).where(eq(users.id, id));
    res.json({ id, ...updated, status: current.status });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

// PUT /api/users/:id/toggle
router.put('/:id/toggle', requireRole('Administrador', 'Admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, id));
    if (!current) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const newStatus = current.status === 'Activo' ? 'Inactivo' : 'Activo';
    await db.update(users).set({ status: newStatus }).where(eq(users.id, id));
    res.json({ id, status: newStatus });
  } catch (err) {
    console.error('Toggle user error:', err);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

// PUT /api/users/:id/password
router.put('/:id/password', requireRole('Administrador', 'Admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: 'Contraseña requerida' });
      return;
    }

    const result = await db
      .update(users)
      .set({ password })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    if (result.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json({ message: 'Contraseña actualizada' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Error actualizando contraseña' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireRole('Administrador', 'Admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

export default router;
