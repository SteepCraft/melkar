import { Router } from 'express';
import { db, users, roles } from '@melkar/database';
import { eq, and } from 'drizzle-orm';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.password, password)));

    if (rows.length === 0) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const u = rows[0];
    if (u.status === 'Inactivo') {
      res.status(403).json({ error: 'Usuario inactivo. Contacte al administrador.' });
      return;
    }

    const role = u.role ?? 'Vendedor';

    // Get permissions from roles table
    const roleData = await db
      .select()
      .from(roles)
      .where(eq(roles.name, role));

    let perms: string[] = ['dashboard'];
    if (roleData.length > 0) {
      perms = (roleData[0].permissions ?? 'dashboard').split(',');
    } else {
      // Fallback defaults
      if (role === 'Administrador' || role === 'Admin')
        perms = 'dashboard,productos,proveedores,inventario,compras,clientes,cotizaciones,ventas,reportes,empleados,roles,usuarios'.split(',');
      else if (role === 'Vendedor' || role === 'Ventas')
        perms = 'dashboard,clientes,cotizaciones,ventas'.split(',');
      else if (role === 'Gerente')
        perms = 'dashboard,reportes,empleados,inventario'.split(',');
    }

    res.json({
      message: 'Login exitoso',
      user: { id: u.id, name: u.name, email: u.email, role, permissions: perms },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email requerido' });
      return;
    }

    const rows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.email, email));

    if (rows.length === 0) {
      res.status(404).json({ error: 'No se encontró una cuenta con ese email' });
      return;
    }

    const tempPwd = Math.floor(100000 + Math.random() * 900000).toString();
    await db.update(users).set({ password: tempPwd }).where(eq(users.email, email));

    res.json({
      message: 'Se ha restablecido su contraseña',
      tempPassword: tempPwd,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
