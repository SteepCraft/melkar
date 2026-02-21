import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(resolve(__dirname, '../../../backend/.env'));

import { drizzle } from 'drizzle-orm/node-postgres';
import { count } from 'drizzle-orm';
import {
  roles,
  users,
  employees,
  products,
  clients,
  suppliers,
  inventoryMovements,
} from './schema';


const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log('\n  === Seeding Melkar Database (PostgreSQL) ===\n');

  // Check if already seeded
  const [{ value: roleCount }] = await db
    .select({ value: count() })
    .from(roles);
  if (Number(roleCount) > 0) {
    console.log('  Database already has data, skipping seed.\n');
    process.exit(0);
  }

  // ─── Roles ───
  await db.insert(roles).values([
    {
      name: 'Administrador',
      permissions:
        'dashboard,productos,proveedores,inventario,compras,clientes,cotizaciones,ventas,reportes,empleados,roles,usuarios',
      isSystem: true,
      status: 'Activo',
    },
    {
      name: 'Vendedor',
      permissions: 'dashboard,clientes,cotizaciones,ventas',
      isSystem: false,
      status: 'Activo',
    },
    {
      name: 'Gerente',
      permissions: 'dashboard,reportes,empleados,inventario',
      isSystem: false,
      status: 'Activo',
    },
  ]);
  console.log('  ✓ Roles insertados');

  // ─── Users ───
  await db.insert(users).values([
    {
      name: 'Administrador',
      email: 'admin@melkar.com',
      password: '123456',
      role: 'Administrador',
      status: 'Activo',
    },
    {
      name: 'Carlos Lopez',
      email: 'carlos@melkar.com',
      password: '123456',
      role: 'Vendedor',
      status: 'Activo',
    },
    {
      name: 'Maria Garcia',
      email: 'maria@melkar.com',
      password: '123456',
      role: 'Gerente',
      status: 'Activo',
    },
  ]);
  console.log('  ✓ Usuarios insertados');

  // ─── Employees ───
  await db.insert(employees).values([
    {
      name: 'Administrador',
      document: '1234567890',
      phone: '5551234567',
      email: 'admin@melkar.com',
      position: 'Gerente General',
      status: 'Activo',
    },
    {
      name: 'Carlos Lopez',
      document: '0987654321',
      phone: '5559876543',
      email: 'carlos@melkar.com',
      position: 'Vendedor',
      status: 'Activo',
    },
    {
      name: 'Maria Garcia',
      document: '1122334455',
      phone: '5551122334',
      email: 'maria@melkar.com',
      position: 'Gerente',
      status: 'Activo',
    },
  ]);
  console.log('  ✓ Empleados insertados');

  // ─── Products ───
  const productData = [
    { name: 'Compresor Scroll 5HP', sku: 'CS-5HP-001', price: '12500', stock: 15 },
    { name: 'Evaporador Industrial 20TR', sku: 'EI-20TR-002', price: '28000', stock: 8 },
    { name: 'Condensador Aire 15HP', sku: 'CA-15HP-003', price: '18500', stock: 22 },
    { name: 'Valvula Expansion TX', sku: 'VE-TX-004', price: '3200', stock: 45 },
    { name: 'Refrigerante R-410A (11.3kg)', sku: 'RF-410A-005', price: '2800', stock: 3 },
    { name: 'Filtro Secador 3/8', sku: 'FS-38-006', price: '450', stock: 60 },
    { name: 'Termostato Digital', sku: 'TD-007', price: '1500', stock: 5 },
    { name: 'Motor Ventilador 1/4HP', sku: 'MV-14HP-008', price: '2200', stock: 0 },
  ];
  const stockStatus = (s: number) =>
    s > 10 ? 'En Stock' : s > 0 ? 'Stock Bajo' : 'Sin Stock';
  await db.insert(products).values(
    productData.map((p) => ({
      ...p,
      status: stockStatus(p.stock),
      active: true,
    })),
  );
  console.log('  ✓ Productos insertados');

  // ─── Clients ───
  await db.insert(clients).values([
    {
      id: 'CL-1',
      name: 'Supermercados del Norte',
      email: 'compras@supernorte.com',
      phone: '5551234567',
      address: 'Av. Industrial 450, Monterrey',
      status: 'Activo',
    },
    {
      id: 'CL-2',
      name: 'Frigorificos Hernandez',
      email: 'contacto@frigoh.com',
      phone: '5559876543',
      address: 'Calle 5 de Mayo 123, CDMX',
      status: 'Activo',
    },
    {
      id: 'CL-3',
      name: 'Hotel Playa Azul',
      email: 'mantenimiento@playaazul.com',
      phone: '5551122334',
      address: 'Blvd. Costero Km 12, Cancun',
      status: 'Activo',
    },
  ]);
  console.log('  ✓ Clientes insertados');

  // ─── Suppliers ───
  await db.insert(suppliers).values([
    {
      name: 'Copeland Mexico',
      nit: '900123456-1',
      phone: '5550001111',
      location: 'Monterrey, NL',
      rating: 4.8,
      email: 'ventas@copeland.mx',
      status: 'Activo',
    },
    {
      name: 'Danfoss Industrial',
      nit: '900654321-2',
      phone: '5550002222',
      location: 'CDMX',
      rating: 4.5,
      email: 'pedidos@danfoss.mx',
      status: 'Activo',
    },
    {
      name: 'Bitzer Compresores',
      nit: '900987654-3',
      phone: '5550003333',
      location: 'Guadalajara, JAL',
      rating: 4.7,
      email: 'info@bitzer.mx',
      status: 'Activo',
    },
  ]);
  console.log('  ✓ Proveedores insertados');

  // ─── Inventory movements ───
  await db.insert(inventoryMovements).values([
    {
      productName: 'Compresor Scroll 5HP',
      type: 'ENTRADA',
      quantity: 15,
      reason: 'Stock inicial',
    },
    {
      productName: 'Valvula Expansion TX',
      type: 'SALIDA',
      quantity: 5,
      reason: 'Venta inicial',
    },
  ]);
  console.log('  ✓ Movimientos de inventario insertados');

  console.log('\n  === Seed completado exitosamente ===\n');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
