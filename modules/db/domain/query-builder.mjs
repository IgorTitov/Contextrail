/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Query Builder domain logic for the db module.
 * @sidecar query-builder.mjs.header.md
 * @layer module | @hex domain | @ctx db
 * @public false
 * @edit careful
 */

/**
 * Simple fluent query builder.
 * Pure domain logic — no database dependencies.
 * Generates SQL strings and parameter arrays for use with any DatabasePort adapter.
 */

/**
 * @typedef {object} BuiltQuery
 * @property {string} sql
 * @property {unknown[]} params
 */

/**
 * Create a query builder for a given table.
 *
 * @param {string} table
 * @returns {{
 *   select: (...columns: string[]) => ReturnType<typeof createQueryBuilder>,
 *   where: (clause: string, ...params: unknown[]) => ReturnType<typeof createQueryBuilder>,
 *   orderBy: (column: string, direction?: 'ASC' | 'DESC') => ReturnType<typeof createQueryBuilder>,
 *   limit: (n: number) => ReturnType<typeof createQueryBuilder>,
 *   offset: (n: number) => ReturnType<typeof createQueryBuilder>,
 *   build: () => BuiltQuery,
 * }}
 */
export function createQueryBuilder(table) {
  if (!table) {
    throw new Error('QueryBuilder requires a table name.');
  }

  /** @type {string[]} */
  let columns = ['*'];
  /** @type {{ clause: string, params: unknown[] }[]} */
  const wheres = [];
  /** @type {{ column: string, direction: string } | null} */
  let order = null;
  /** @type {number | null} */
  let limitVal = null;
  /** @type {number | null} */
  let offsetVal = null;

  const builder = {
    /**
     * @param {...string} cols
     */
    select(...cols) {
      if (cols.length > 0) columns = cols;
      return builder;
    },

    /**
     * @param {string} clause — e.g. "age > ?" or "name = ?"
     * @param {...unknown} params
     */
    where(clause, ...params) {
      wheres.push({ clause, params });
      return builder;
    },

    /**
     * @param {string} column
     * @param {'ASC' | 'DESC'} [direction='ASC']
     */
    orderBy(column, direction = 'ASC') {
      order = { column, direction };
      return builder;
    },

    /**
     * @param {number} n
     */
    limit(n) {
      limitVal = n;
      return builder;
    },

    /**
     * @param {number} n
     */
    offset(n) {
      offsetVal = n;
      return builder;
    },

    /**
     * Build the SQL query and parameter array.
     * @returns {BuiltQuery}
     */
    build() {
      const parts = [`SELECT ${columns.join(', ')} FROM ${table}`];
      /** @type {unknown[]} */
      const allParams = [];

      if (wheres.length > 0) {
        const clauses = wheres.map((w) => {
          allParams.push(...w.params);
          return w.clause;
        });
        parts.push(`WHERE ${clauses.join(' AND ')}`);
      }

      if (order) {
        parts.push(`ORDER BY ${order.column} ${order.direction}`);
      }

      if (limitVal !== null) {
        parts.push(`LIMIT ${limitVal}`);
      }

      if (offsetVal !== null) {
        parts.push(`OFFSET ${offsetVal}`);
      }

      return { sql: parts.join(' '), params: allParams };
    },
  };

  return builder;
}
