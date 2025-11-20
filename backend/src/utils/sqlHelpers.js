import { query, getClient } from "../config/database.js";

/**
 * SQL Helper functions for common database operations
 */

/**
 * Build a WHERE clause from an object of conditions
 * @param {Object} conditions - Key-value pairs for WHERE clause
 * @param {number} startIndex - Starting parameter index (for $1, $2, etc.)
 * @returns {Object} { whereClause, values, nextIndex }
 */
export const buildWhereClause = (conditions = {}, startIndex = 1) => {
  const keys = Object.keys(conditions);
  if (keys.length === 0) {
    return { whereClause: "", values: [], nextIndex: startIndex };
  }

  const clauses = [];
  const values = [];
  let paramIndex = startIndex;

  keys.forEach((key) => {
    if (conditions[key] !== undefined && conditions[key] !== null) {
      clauses.push(`${key} = $${paramIndex}`);
      values.push(conditions[key]);
      paramIndex++;
    }
  });

  const whereClause =
    clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  return { whereClause, values, nextIndex: paramIndex };
};

/**
 * Build an INSERT query with returning clause
 * @param {string} table - Table name
 * @param {Object} data - Data to insert
 * @param {string} returning - Columns to return (default: '*')
 * @returns {Object} { query, values }
 */
export const buildInsertQuery = (table, data, returning = "*") => {
  const keys = Object.keys(data);
  const columns = keys.join(", ");
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(", ");
  const values = keys.map((key) => data[key]);

  const queryText = `
    INSERT INTO ${table} (${columns})
    VALUES (${placeholders})
    RETURNING ${returning}
  `;

  return { query: queryText, values };
};

/**
 * Build an UPDATE query
 * @param {string} table - Table name
 * @param {Object} data - Data to update
 * @param {Object} conditions - WHERE conditions
 * @param {string} returning - Columns to return (default: '*')
 * @returns {Object} { query, values }
 */
export const buildUpdateQuery = (table, data, conditions, returning = "*") => {
  const dataKeys = Object.keys(data);
  const setClauses = Object.keys(data).map((key, i) => {
    return `${key} = $${i + 1}`;
  });

  // Automatically set updated_at timestamp if not already present
  if (!("updated_at" in data)) {
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
  }

  const { whereClause, values: whereValues } = buildWhereClause(
    conditions,
    dataKeys.length + 1
  );

  const queryText = `
    UPDATE ${table}
    SET ${setClauses.join(", ")}
    ${whereClause}
    RETURNING ${returning}
  `;

  return { query: queryText, values: [...Object.values(data), ...whereValues] };
};

/**
 * Build a SELECT query with optional WHERE, ORDER BY, LIMIT, OFFSET
 * @param {string} table - Table name
 * @param {Object} options - Query options
 * @returns {Object} { query, values }
 */
export const buildSelectQuery = (table, options = {}) => {
  const {
    columns = "*",
    where = {},
    orderBy = "",
    limit = null,
    offset = null,
    joins = [],
  } = options;

  let queryText = `SELECT ${columns} FROM ${table}`;

  // Add JOINs
  if (joins.length > 0) {
    queryText += " " + joins.join(" ");
  }

  const { whereClause, values } = buildWhereClause(where);
  queryText += " " + whereClause;

  // Add ORDER BY
  if (orderBy) {
    queryText += ` ORDER BY ${orderBy}`;
  }

  // Add LIMIT
  if (limit) {
    queryText += ` LIMIT ${limit}`;
  }

  // Add OFFSET
  if (offset) {
    queryText += ` OFFSET ${offset}`;
  }

  return { query: queryText, values };
};

/**
 * Execute a transaction with multiple queries
 * @param {Function} callback - Function that receives client and returns promise
 * @returns {Promise} Result of the transaction
 */
export const executeTransaction = async (callback) => {
  const client = await getClient();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Check if a record exists
 * @param {string} table - Table name
 * @param {Object} conditions - WHERE conditions
 * @returns {Promise<boolean>} True if record exists
 */
export const recordExists = async (table, conditions) => {
  const { query: queryText, values } = buildSelectQuery(table, {
    columns: "1",
    where: conditions,
    limit: 1,
  });

  const result = await query(queryText, values);
  return result.rows.length > 0;
};

/**
 * Get a single record
 * @param {string} table - Table name
 * @param {Object} conditions - WHERE conditions
 * @param {string} columns - Columns to select
 * @returns {Promise<Object|null>} Single record or null
 */
export const findOne = async (table, conditions, columns = "*") => {
  const { query: queryText, values } = buildSelectQuery(table, {
    columns,
    where: conditions,
    limit: 1,
  });

  const result = await query(queryText, values);
  return result.rows[0] || null;
};

/**
 * Get multiple records
 * @param {string} table - Table name
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of records
 */
export const findMany = async (table, options = {}) => {
  const { query: queryText, values } = buildSelectQuery(table, options);
  const result = await query(queryText, values);
  return result.rows;
};

/**
 * Insert a record and return it
 * @param {string} table - Table name
 * @param {Object} data - Data to insert
 * @returns {Promise<Object>} Inserted record
 */
export const insertOne = async (table, data) => {
  const { query: queryText, values } = buildInsertQuery(table, data);
  const result = await query(queryText, values);
  return result.rows[0];
};

/**
 * Update records and return them
 * @param {string} table - Table name
 * @param {Object} data - Data to update
 * @param {Object} conditions - WHERE conditions
 * @returns {Promise<Array>} Updated records
 */
export const updateMany = async (table, data, conditions) => {
  const { query: queryText, values } = buildUpdateQuery(
    table,
    data,
    conditions
  );
  const result = await query(queryText, values);
  return result.rows;
};

/**
 * Delete records
 * @param {string} table - Table name
 * @param {Object} conditions - WHERE conditions
 * @returns {Promise<number>} Number of deleted records
 */
export const deleteMany = async (table, conditions) => {
  const { whereClause, values } = buildWhereClause(conditions);

  if (!whereClause) {
    throw new Error("DELETE queries must include WHERE conditions for safety");
  }

  const queryText = `DELETE FROM ${table} ${whereClause}`;
  const result = await query(queryText, values);
  return result.rowCount;
};

/**
 * Count records
 * @param {string} table - Table name
 * @param {Object} conditions - WHERE conditions
 * @returns {Promise<number>} Count of records
 */
export const count = async (table, conditions = {}) => {
  const { query: queryText, values } = buildSelectQuery(table, {
    columns: "COUNT(*) as count",
    where: conditions,
  });

  const result = await query(queryText, values);
  return parseInt(result.rows[0].count);
};

export { query };
