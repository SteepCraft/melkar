import './config/index.js';
import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth';
import dashboardRouter from './routes/dashboard';
import productsRouter from './routes/products';
import suppliersRouter from './routes/suppliers';
import clientsRouter from './routes/clients';
import usersRouter from './routes/users';
import rolesRouter from './routes/roles';
import employeesRouter from './routes/employees';
import quotesRouter from './routes/quotes';
import purchasesRouter from './routes/purchases';
import inventoryRouter from './routes/inventory';
import salesRouter from './routes/sales';
import reportsRouter from './routes/reports';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── API Routes ─────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/products', productsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/sales', salesRouter);
app.use('/api/reports', reportsRouter);

// ─── Health check ───────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Start ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n  Melkar Backend - PostgreSQL + Drizzle ORM');
  console.log(`  Servidor corriendo en http://localhost:${PORT}`);
  console.log(`  Frontend en http://localhost:5173 (vite dev)`);
  console.log(`  API disponible en http://localhost:${PORT}/api\n`);
});
