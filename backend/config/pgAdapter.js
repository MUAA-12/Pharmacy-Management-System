const { pool } = require('./db');
function convert(sql, params = []) {
  let values = [...params];
  let text = sql;
  text = text.replace(/DATE_FORMAT\(([^,()]+),\s*'%Y-%m-%d %H:%i'\)/gi, (_, column) => `TO_CHAR(${column}, 'YYYY-MM-DD HH24:MI')`);
  text = text.replace(/DATE_FORMAT\(([^,()]+),\s*'%Y-%m-%d'\)/gi, (_, column) => `TO_CHAR(${column}, 'YYYY-MM-DD')`);
  text = text.replace(/DATE_ADD\(CURRENT_DATE\(\),\s*INTERVAL\s+(\?|\d+)\s+DAY\)/gi, (_, v) => v === '?' ? "(CURRENT_DATE + (? * INTERVAL '1 day'))" : `(CURRENT_DATE + INTERVAL '${v} days')`);
  text = text.replace(/DATEDIFF\(([^,()]+),\s*CURRENT_DATE\(\)\)/gi, (_, column) => `(${column} - CURRENT_DATE)`);
  text = text.replace(/CURRENT_DATE\(\)/gi, 'CURRENT_DATE');
  text = text.replace(/\bLIKE\b/gi, 'ILIKE');
  text = text.replace(/CAST\(([^()]+) AS CHAR\)/gi, (_, expression) => `CAST(${expression} AS TEXT)`);
  text = text.replace(/GROUP BY r\.reservation_id(?!,)/gi, 'GROUP BY r.reservation_id, c.customer_id');
  text = text.replace(/GROUP BY c\.customer_id(?!,)/gi, 'GROUP BY c.customer_id');
  // PostgreSQL needs every nonaggregated customer field in GROUP BY.
  text = text.replace(/GROUP BY c\.customer_id ORDER BY/, 'GROUP BY c.customer_id ORDER BY');
  let n = 0;
  text = text.replace(/\?/g, () => '$' + (++n));
  if (n !== values.length) throw new Error(`Parameter mismatch: expected ${n}, received ${values.length}`);
  if (/^\s*INSERT\s+INTO\b/i.test(text) && !/\bRETURNING\b/i.test(text)) {
    const table = text.match(/^\s*INSERT\s+INTO\s+(\w+)/i)?.[1];
    const ids = { medicines:'medicine_id',customers:'customer_id',reservations:'reservation_id',reservation_items:'reservation_id' };
    if (ids[table]) text += ` RETURNING ${ids[table]}`;
  }
  return { text, values };
}
function normalize(result) {
  if (result.command === 'INSERT') return [{ insertId: result.rows[0]?.[Object.keys(result.rows[0] || {})[0]], affectedRows: result.rowCount }];
  if (result.command === 'UPDATE' || result.command === 'DELETE') return [{ affectedRows: result.rowCount }];
  return [result.rows];
}
async function query(sql, params=[]) { return normalize(await pool.query(convert(sql, params))); }
async function getConnection() {
  const client = await pool.connect();
  return {
    query: async (sql, params=[]) => normalize(await client.query(convert(sql, params))),
    beginTransaction: () => client.query('BEGIN'),
    commit: () => client.query('COMMIT'),
    rollback: () => client.query('ROLLBACK'),
    release: () => client.release()
  };
}
module.exports = { query, getConnection, convert };
