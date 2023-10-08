const properties = require("./json/properties.json");
const users = require("./json/users.json");
const { Pool } = require('pg');

/// Users
const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb',
  port: 5432
});

// Test query
pool.query(`SELECT title FROM properties LIMIT 10;`)
  .then(response => {
    console.log(response.rows);
  })
  .catch(err => {
    console.error('Database query error:', err);
  });

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
    .query('SELECT * FROM users WHERE email = $1', [email])
    .then(result => result.rows[0] || null)
    .catch(err => {
      console.error('query error', err.stack);
      throw err;
    }); 
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query('SELECT * FROM users WHERE id = $1', [id])
    .then(result => result.rows[0] || null)
    .catch(err => {
      console.error('query error', err.stack);
      throw err;
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  return pool
    .query(
      `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;`, 
      [user.name, user.email, user.password]
    )
    .then(result => result.rows[0])
    .catch(err => {
      console.error('query error', err.stack);
      throw err;
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
    .query(`
      SELECT reservations.id, properties.title, properties.cost_per_night, 
             reservations.start_date, avg(property_reviews.rating) as average_rating
      FROM reservations
      JOIN properties ON reservations.property_id = properties.id
      JOIN property_reviews ON properties.id = property_reviews.property_id
      WHERE reservations.guest_id = $1
      GROUP BY properties.id, reservations.id
      ORDER BY reservations.start_date DESC
      LIMIT $2;
    `, [guest_id, limit])
    .then(res => res.rows)
    .catch(err => console.error('query error', err.stack));
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  // 1. Initialize query parameters array.
  const queryParams = [];
  
  // 2. Define the initial query structure.
  let queryString = `
    SELECT properties.*, avg(property_reviews.rating) as average_rating
    FROM properties
    LEFT JOIN property_reviews ON properties.id = property_id
  `;

  // 3. Set up the WHERE clause conditions.
  const conditions = [];
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    conditions.push(`city LIKE $${queryParams.length}`);
  }
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    conditions.push(`owner_id = $${queryParams.length}`);
  }
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    conditions.push(`cost_per_night >= $${queryParams.length}`);
  }
  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    conditions.push(`cost_per_night <= $${queryParams.length}`);
  }
  if (conditions.length) {
    queryString += 'WHERE ' + conditions.join(' AND ');
  }

  // 4. Finalize the query formation.
  queryParams.push(limit);
  queryString += `
    GROUP BY properties.id
    ORDER BY cost_per_night
    LIMIT $${queryParams.length};
  `;

  // 5. Debug: display the query and parameters.
  console.log(queryString, queryParams);

  // 6. Execute the query.
  return pool.query(queryString, queryParams)
    .then(res => res.rows)
    .catch(err => {
      console.error('query error', err.stack);
      throw err;
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  // Insert query for new property into properties table.
  const queryString = `
    INSERT INTO properties (
      owner_id, title, description, thumbnail_photo_url, cover_photo_url, 
      cost_per_night, street, city, province, post_code, 
      country, parking_spaces, number_of_bathrooms, number_of_bedrooms
    ) VALUES (
      $1, $2, $3, $4, $5, 
      $6, $7, $8, $9, $10, 
      $11, $12, $13, $14
    ) RETURNING *;
  `;

  // Extract values from property object in the order of the SQL query.
  const values = [
    property.owner_id, property.title, property.description, property.thumbnail_photo_url, 
    property.cover_photo_url, property.cost_per_night, property.street, property.city, 
    property.province, property.post_code, property.country, property.parking_spaces, 
    property.number_of_bathrooms, property.number_of_bedrooms
  ];

  // Return query using pool object to insert new property.
  return pool.query(queryString, values)
    .then(res => {
      rows.rows
    })
    .catch(err => {
      console.log('query error', err.stack);
      throw err;
    });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
