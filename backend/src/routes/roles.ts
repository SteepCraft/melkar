import { Router } from 'express';
import { db, roles, users } from '@melkar/database';
import { eq, sql, count } from 'drizzle-orm';
import { requireRole } from '../utils';

const router = Router();

// GET /api/roles
router.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(roles).orderBy(roles.id);
    res.json(
      rows.map((r) => ({
        id: r.id,
        name: r.name,
        permissions: (r.permissions ?? '').split(',').filter(Boolean),
        isSystem: r.isSystem ?? false,
        status: r.status,
      })),
    );
  } catch (err) {
    console.error('Roles error:', err);
    res.status(500).json({ error: 'Error obteniendo roles' });
  }
});

// POST /api/roles
router.post('/', requireRole('Administrador', 'Admin'), async (req, res) => {
  try {
    const { name, permissions } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: 'Nombre requerido' });
      return;
    }

    const [{ value: dupCount }] = await db
      .select({ value: count() })
      .from(roles)
      .where(sql`UPPER(${roles.name}) = UPPER(${name})`);
    if (Number(dupCount) > 0) {
      res.status(409).json({ error: 'Ya existe un rol con ese nombre' });
      return;
    }

    const perms = Array.isArray(permissions) ? permissions.join(',') : 'dashboard';
    const [created] = await db
      .insert(roles)
      .values({ name, permissions: perms, isSystem: false, status: 'Activo' })
      .returning();

    res.status(201).json({
      id: created.id,
      name: created.name,
      permissions: perms.split(','),
      isSystem: false,
      status: 'Activo',
    });
  } catch (err) {
    console.error('Create role error:', err);
    res.status(500).json({ error: 'Error creando rol' });
  }
});

// PUT /api/roles/:id
router.put('/:id', requireRole('Administrador', 'Admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select().from(roles).where(eq(roles.id, id));
    if (!current) {
      res.status(404).json({ error: 'Rol no encontrado' });
      return;
    }
    if (current.isSystem) {
      res.status(403).json({ error: 'No se puede modificar el rol de Administrador' });
      return;
    }

    const { name, permissions } = req.body;
    const newName = name ?? current.name;
    const newPerms = Array.isArray(permissions) ? permissions.join(',') : current.permissions ?? '';

    await db.update(roles).set({ name: newName, permissions: newPerms }).where(eq(roles.id, id));
    res.json({ id, name: newName, permissions: newPerms.split(','), isSystem: false });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Error actualizando rol' });
  }
});

// DELETE /api/roles/:id
router.delete('/:id', requireRole('Administrador', 'Admin'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db
      .select({ isSystem: roles.isSystem, name: roles.name })
      .from(roles)
      .where(eq(roles.id, id));
    if (!current) {
      res.status(404).json({ error: 'Rol no encontrado' });
      return;
    }
    if (current.isSystem) {
      res.status(403).json({ error: 'No se puede eliminar el rol de Administrador' });
      return;
    }

    // Check if any users have this role
    const [{ value: usersWithRole }] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, current.name!));
    if (Number(usersWithRole) > 0) {
      res.status(409).json({ error: 'No se puede eliminar: hay usuarios con este rol' });
      return;
    }

    await db.delete(roles).where(eq(roles.id, id));
    res.json({ message: 'Rol eliminado' });
  } catch (err) {
    console.error('Delete role error:', err);
    res.status(500).json({ error: 'Error eliminando rol' });
  }
});

export default router;
