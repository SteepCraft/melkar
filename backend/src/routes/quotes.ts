import { Router } from 'express';
import { db, quotes, quoteItems, products } from '@melkar/database';
import { eq } from 'drizzle-orm';
import { n } from '../utils';

const router = Router();

// GET /api/quotes
router.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(quotes).orderBy(quotes.id);

    const result = [];
    for (const q of rows) {
      const items = await db
        .select({
          productName: quoteItems.productName,
          price: quoteItems.price,
          quantity: quoteItems.quantity,
        })
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, q.id));

      result.push({
        id: q.id,
        clientId: q.clientId,
        clientName: q.clientName,
        items: items.map((i) => ({
          productName: i.productName,
          price: n(i.price),
          quantity: i.quantity ?? 0,
        })),
        subtotal: n(q.subtotal),
        tax: n(q.tax),
        transport: n(q.transport),
        total: n(q.total),
        status: q.status,
        validityDays: q.validityDays ?? 30,
        createdAt: q.createdAt?.toISOString() ?? null,
      });
    }

    res.json(result);
  } catch (err) {
    console.error('Quotes error:', err);
    res.status(500).json({ error: 'Error obteniendo cotizaciones' });
  }
});

// POST /api/quotes
router.post('/', async (req, res) => {
  try {
    const { clientId, clientName, items = [], transport = 0, validityDays = 30 } = req.body;
    if (!clientId) {
      res.status(400).json({ error: 'Debe seleccionar un cliente' });
      return;
    }
    if (items.length === 0) {
      res.status(400).json({ error: 'Debe agregar al menos un producto' });
      return;
    }

    // Check no inactive products
    for (const it of items) {
      const pName = it.productName ?? it.name ?? '';
      const [prod] = await db
        .select({ active: products.active })
        .from(products)
        .where(eq(products.name, pName));
      if (prod && prod.active === false) {
        res.status(400).json({ error: `El producto '${pName}' está inactivo` });
        return;
      }
    }

    const subtotal = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
    const tax = Math.round(subtotal * 0.19 * 100) / 100;
    const total = Math.round((subtotal + tax + transport) * 100) / 100;

    const [created] = await db
      .insert(quotes)
      .values({
        clientId,
        clientName: clientName ?? '',
        subtotal: String(subtotal),
        tax: String(tax),
        transport: String(transport),
        total: String(total),
        status: 'Borrador',
        validityDays,
      })
      .returning();

    for (const it of items) {
      await db.insert(quoteItems).values({
        quoteId: created.id,
        productName: it.productName ?? it.name ?? '',
        price: String(it.price),
        quantity: it.quantity,
      });
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
      status: 'Borrador',
      validityDays,
      createdAt: created.createdAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error('Create quote error:', err);
    res.status(500).json({ error: 'Error creando cotización' });
  }
});

// PUT /api/quotes/:id
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { items, clientId, clientName, transport } = req.body;

    const [current] = await db.select().from(quotes).where(eq(quotes.id, id));
    if (!current) {
      res.status(404).json({ error: 'Cotización no encontrada' });
      return;
    }

    const newClientId = clientId ?? current.clientId;
    const newClientName = clientName ?? current.clientName;
    let subtotal = n(current.subtotal);
    let tax = n(current.tax);
    const newTransport = transport ?? n(current.transport);
    let total = n(current.total);

    if (items) {
      subtotal = items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
      tax = Math.round(subtotal * 0.19 * 100) / 100;
      total = Math.round((subtotal + tax + newTransport) * 100) / 100;

      await db.delete(quoteItems).where(eq(quoteItems.quoteId, id));
      for (const it of items) {
        await db.insert(quoteItems).values({
          quoteId: id,
          productName: it.productName ?? it.name ?? '',
          price: String(it.price),
          quantity: it.quantity,
        });
      }
    }

    await db
      .update(quotes)
      .set({
        clientId: newClientId,
        clientName: newClientName,
        subtotal: String(subtotal),
        tax: String(tax),
        transport: String(newTransport),
        total: String(total),
      })
      .where(eq(quotes.id, id));

    const resultItems = await db
      .select({ productName: quoteItems.productName, price: quoteItems.price, quantity: quoteItems.quantity })
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, id));

    res.json({
      id,
      clientId: newClientId,
      clientName: newClientName,
      items: resultItems.map((i) => ({
        productName: i.productName,
        price: n(i.price),
        quantity: i.quantity ?? 0,
      })),
      subtotal,
      tax,
      transport: newTransport,
      total,
      status: current.status,
    });
  } catch (err) {
    console.error('Update quote error:', err);
    res.status(500).json({ error: 'Error actualizando cotización' });
  }
});

// POST /api/quotes/:id/send
router.post('/:id/send', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db
      .update(quotes)
      .set({ status: 'Enviada' })
      .where(eq(quotes.id, id))
      .returning({ id: quotes.id });
    if (result.length === 0) {
      res.status(404).json({ error: 'Cotización no encontrada' });
      return;
    }
    res.json({ message: 'Cotización enviada exitosamente' });
  } catch (err) {
    console.error('Send quote error:', err);
    res.status(500).json({ error: 'Error enviando cotización' });
  }
});

export default router;
