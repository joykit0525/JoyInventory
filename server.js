import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import pg from "pg";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const corsOrigin = process.env.CORS_ORIGIN || "*";
const landedCostRate = 0.45;
const defaultSalesFeeRate = 12;
const defaultAdFeeRate = 0;
const defaultTaxRate = 10;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. Copy .env.example to .env and set your PostgreSQL connection string.");
}

function requireBasicAuth(request, response, next) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;
  if (!expectedUser || !expectedPassword || request.path === "/api/health") {
    return next();
  }

  const authorization = request.headers.authorization || "";
  const [scheme, encoded] = authorization.split(" ");
  if (scheme === "Basic" && encoded) {
    const [user, password] = Buffer.from(encoded, "base64").toString("utf8").split(":");
    if (user === expectedUser && password === expectedPassword) {
      return next();
    }
  }

  response.setHeader("WWW-Authenticate", 'Basic realm="JoyInventory"');
  return response.status(401).send("Authentication required.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

app.use(cors({ origin: corsOrigin === "*" ? true : corsOrigin }));
app.use(express.json({ limit: "25mb" }));
app.use(requireBasicAuth);
app.use(express.static(__dirname));

const schemaSql = await fs.readFile(path.join(__dirname, "schema.sql"), "utf8");
await pool.query(schemaSql);

const itemColumns = [
  "sku",
  "name",
  "image_url",
  "category",
  "location",
  "qty",
  "safety",
  "purchase_amount",
  "landed_unit_cost",
  "margin_rate",
  "mall_fee_rate",
  "ad_fee_rate",
  "tax_rate",
  "unit",
  "supplier",
  "memo",
  "updated_at"
];

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function calculateLandedUnitCost(purchaseAmount) {
  return toNumber(purchaseAmount) * (1 + landedCostRate);
}

function normalizeItem(raw = {}) {
  const purchaseAmount = toNumber(raw.purchaseAmount);
  return {
    sku: String(raw.sku || "").trim(),
    name: String(raw.name || "").trim(),
    imageUrl: String(raw.imageUrl || "").trim(),
    category: String(raw.category || "").trim(),
    location: String(raw.location || "").trim(),
    qty: Math.max(0, Math.trunc(toNumber(raw.qty))),
    safety: Math.max(0, Math.trunc(toNumber(raw.safety))),
    purchaseAmount,
    landedUnitCost: calculateLandedUnitCost(purchaseAmount),
    marginRate: toNumber(raw.marginRate, 30),
    mallFeeRate: toNumber(raw.mallFeeRate, defaultSalesFeeRate),
    adFeeRate: toNumber(raw.adFeeRate, defaultAdFeeRate),
    taxRate: toNumber(raw.taxRate, defaultTaxRate),
    unit: String(raw.unit || "개").trim(),
    supplier: String(raw.supplier || "").trim(),
    memo: String(raw.memo || "").trim(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

function rowToItem(row) {
  return {
    sku: row.sku,
    name: row.name,
    imageUrl: row.image_url,
    category: row.category,
    location: row.location,
    qty: Number(row.qty),
    safety: Number(row.safety),
    purchaseAmount: Number(row.purchase_amount),
    landedUnitCost: Number(row.landed_unit_cost),
    marginRate: Number(row.margin_rate),
    mallFeeRate: Number(row.mall_fee_rate),
    adFeeRate: Number(row.ad_fee_rate),
    taxRate: Number(row.tax_rate),
    unit: row.unit,
    supplier: row.supplier,
    memo: row.memo,
    updatedAt: row.updated_at
  };
}

function rowToMovement(row) {
  return {
    id: row.id,
    date: row.date,
    sku: row.sku,
    type: row.type,
    qty: Number(row.qty),
    note: row.note
  };
}

async function listData(client = pool) {
  const [itemsResult, movementsResult] = await Promise.all([
    client.query(`SELECT ${itemColumns.join(", ")} FROM inventory_items ORDER BY updated_at DESC, sku ASC`),
    client.query("SELECT id, date, sku, type, qty, note FROM inventory_movements ORDER BY date DESC LIMIT 500")
  ]);
  return {
    items: itemsResult.rows.map(rowToItem),
    movements: movementsResult.rows.map(rowToMovement)
  };
}

async function upsertItem(item, client = pool) {
  if (!item.sku) throw new Error("SKU is required.");
  if (!item.name) throw new Error("상품명을 입력하세요.");

  const values = [
    item.sku,
    item.name,
    item.imageUrl,
    item.category,
    item.location,
    item.qty,
    item.safety,
    item.purchaseAmount,
    item.landedUnitCost,
    item.marginRate,
    item.mallFeeRate,
    item.adFeeRate,
    item.taxRate,
    item.unit,
    item.supplier,
    item.memo,
    item.updatedAt
  ];

  const result = await client.query(
    `
      INSERT INTO inventory_items (${itemColumns.join(", ")})
      VALUES (${values.map((_, index) => `$${index + 1}`).join(", ")})
      ON CONFLICT (sku) DO UPDATE SET
        name = EXCLUDED.name,
        image_url = EXCLUDED.image_url,
        category = EXCLUDED.category,
        location = EXCLUDED.location,
        qty = EXCLUDED.qty,
        safety = EXCLUDED.safety,
        purchase_amount = EXCLUDED.purchase_amount,
        landed_unit_cost = EXCLUDED.landed_unit_cost,
        margin_rate = EXCLUDED.margin_rate,
        mall_fee_rate = EXCLUDED.mall_fee_rate,
        ad_fee_rate = EXCLUDED.ad_fee_rate,
        tax_rate = EXCLUDED.tax_rate,
        unit = EXCLUDED.unit,
        supplier = EXCLUDED.supplier,
        memo = EXCLUDED.memo,
        updated_at = EXCLUDED.updated_at
      RETURNING ${itemColumns.join(", ")}
    `,
    values
  );

  return rowToItem(result.rows[0]);
}

app.get("/api/health", async (_request, response, next) => {
  try {
    await pool.query("SELECT 1");
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/data", async (_request, response, next) => {
  try {
    response.json(await listData());
  } catch (error) {
    next(error);
  }
});

app.put("/api/items/:sku", async (request, response, next) => {
  try {
    const item = normalizeItem({ ...request.body, sku: request.params.sku });
    response.json({ item: await upsertItem(item) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/items/:sku", async (request, response, next) => {
  try {
    await pool.query("DELETE FROM inventory_items WHERE sku = $1", [request.params.sku]);
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/movements", async (request, response, next) => {
  const client = await pool.connect();
  try {
    const sku = String(request.body.sku || "").trim();
    const type = String(request.body.type || "").trim();
    const qty = Math.max(0, Math.trunc(toNumber(request.body.qty)));
    const note = String(request.body.note || "").trim();

    if (!sku) throw new Error("품목을 선택하세요.");
    if (!["in", "out", "adjust"].includes(type)) throw new Error("입출고 구분이 올바르지 않습니다.");

    await client.query("BEGIN");
    const itemResult = await client.query("SELECT sku, qty FROM inventory_items WHERE sku = $1 FOR UPDATE", [sku]);
    if (!itemResult.rowCount) throw new Error("품목을 찾을 수 없습니다.");

    const currentQty = Number(itemResult.rows[0].qty);
    const nextQty = type === "in" ? currentQty + qty : type === "out" ? Math.max(0, currentQty - qty) : qty;
    await client.query("UPDATE inventory_items SET qty = $1, updated_at = now() WHERE sku = $2", [nextQty, sku]);

    const movementResult = await client.query(
      "INSERT INTO inventory_movements (id, sku, type, qty, note) VALUES ($1, $2, $3, $4, $5) RETURNING id, date, sku, type, qty, note",
      [crypto.randomUUID(), sku, type, qty, note]
    );
    await client.query("COMMIT");
    response.json({ movement: rowToMovement(movementResult.rows[0]), data: await listData() });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.post("/api/movements/raw", async (request, response, next) => {
  try {
    const movement = {
      id: request.body.id || crypto.randomUUID(),
      date: request.body.date || new Date().toISOString(),
      sku: String(request.body.sku || "").trim(),
      type: String(request.body.type || "").trim(),
      qty: Math.max(0, Math.trunc(toNumber(request.body.qty))),
      note: String(request.body.note || "").trim()
    };
    const result = await pool.query(
      `
        INSERT INTO inventory_movements (id, date, sku, type, qty, note)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          date = EXCLUDED.date,
          sku = EXCLUDED.sku,
          type = EXCLUDED.type,
          qty = EXCLUDED.qty,
          note = EXCLUDED.note
        RETURNING id, date, sku, type, qty, note
      `,
      [movement.id, movement.date, movement.sku, movement.type, movement.qty, movement.note]
    );
    response.json({ movement: rowToMovement(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/movements", async (_request, response, next) => {
  try {
    await pool.query("DELETE FROM inventory_movements");
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(400).json({ error: error.message || "서버 오류가 발생했습니다." });
});

function getNetworkUrls() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((address) => address && address.family === "IPv4" && !address.internal)
    .map((address) => `http://${address.address}:${port}`);
}

app.listen(port, host, () => {
  console.log(`JoyInventory server listening on http://localhost:${port}`);
  for (const url of getNetworkUrls()) {
    console.log(`Network access: ${url}`);
  }
});
