const express = require('express')
const path = require('path')

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const {v4: uuidv4} = require('uuid')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'data.db')

let db = null
const createManagersTable = `
CREATE TABLE IF NOT EXISTS managers (
  manager_id INTEGER PRIMARY KEY,
  is_active TEXT DEFAULT 'true'
);`

const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY ,
  full_name TEXT NOT NULL,
  mob_num TEXT NOT NULL,
  pan_num TEXT NOT NULL,
  manager_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active TEXT DEFAULT 1,
  FOREIGN KEY(manager_id) REFERENCES managers(manager_id) ON DELETE CASCADE
);`

// Utility functions for validation
function validateMobileNumber(num) {
  let mobile = num.replace(/^(\+91|0)/, '')
  return /^\d{10}$/.test(mobile) ? mobile : null
}

function validatePan(pan) {
  const panUpper = pan.toUpperCase()
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
  return panRegex.test(panUpper) ? panUpper : null
}

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: 'data.db',
      driver: sqlite3.Database,
    })

    const insertQuery = `
    INSERT INTO managers (manager_id,is_active) VALUES (5,"true");
    `
    //const getQuery = `delete from managers where manager_id=4`
    const getQueryUser = `select * from users`
    const booksArray = await db.all(getQueryUser)
    // //response.send(booksArray)
    console.log(booksArray)

    // 1.1 Create User Endpoint
    app.post('/create_user', async (req, res) => {
      const {full_name, mob_num, pan_num, manager_id} = req.body

      if (!full_name || full_name.trim() === '') {
        res.status(400).json({error: 'Full Name is required'})
      }

      const validatedMobile = validateMobileNumber(mob_num)
      if (!validatedMobile) {
        res.status(400).json({error: 'Invalid mobile number'})
      }

      const validatedPan = validatePan(pan_num)
      if (!validatedPan) {
        res.status(400).json({error: 'Invalid PAN number'})
      }

      // Check if manager is active
      const manager = await db.get(
        `SELECT * FROM managers WHERE manager_id = ${manager_id} AND is_active = "true"`,
      )
      if (!manager) {
        res.status(400).json({
          status: 'failure',
          error: 'Manager is not active or invalid',
        })
      } else {
        // Insert user data in DB
        const user_id = uuidv4()
        const now = new Date().toISOString()
        const insertSql = `
      INSERT INTO users (user_id, full_name, mob_num, pan_num, manager_id, created_at, updated_at, is_active)
      VALUES ("${user_id}", "${full_name}", "${validatedMobile}", "${validatedPan}", ${manager_id}, "${now}", "${now}", 1)`
        const r1 = await db.run(insertSql)
        if (!r1) {
          res.status(500).json({
            status: 'failure',
            error: 'Failed to create user',
          })
        } else {
          res.status(201).json({
            status: 'success',
            message: 'User created successfully',
            user_id,
          })
        }
      }
    })

    // 1.2 Get Users Endpoint:
    app.post('/get_users', async (req, res) => {
      const {user_id, mob_num, manager_id} = req.body

      let sql = 'SELECT * FROM users'
      let params = []

      if (user_id) {
        sql += ' WHERE user_id = ?'
        params.push(user_id)
      } else if (mob_num) {
        sql += ' WHERE mob_num = ?'
        params.push(mob_num)
      } else if (manager_id) {
        sql += ' WHERE manager_id = ?'
        params.push(manager_id)
      }

      const r2 = await db.all(sql, params, err => {
        if (err) {
          return res.status(500).json({
            error: 'Database error',
            details: err.message,
          })
        }
      })
      if (r2) {
        // Return the users in a JSON object
        res.json({users: r2 || []})
      }
    })

    // 1.3 Delete User Endpoint:
    app.post('/delete_user', async (req, res) => {
      const {user_id, mob_num} = req.body

      if (!user_id && !mob_num) {
        res.status(400).json({
          error: 'user_id or mob_num is required',
        })
      }

      let sql = 'DELETE FROM users WHERE'
      let params = []

      if (user_id) {
        sql += ' user_id = ?'
        params.push(user_id)
      }
      if (mob_num) {
        if (params.length > 0) {
          sql += ' OR'
        }
        sql += ' mob_num = ?'
        params.push(mob_num)
      }

      const r3 = await db.run(sql, params, function (err) {
        if (err) {
          return res.status(500).json({
            error: 'Database error',
            details: err.message,
          })
        }
      })
      if (r3.changes === 0) {
        res.status(404).json({
          message: 'User not found',
        })
      } else {
        res.json({message: `${r3.changes} User(s) deleted successfully`})
      }
    })

    //1.4 Update User Endpoint:
    app.post('/update_user', async (req, res) => {
      try {
        const {user_ids, update_data} = req.body

        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
          return res.status(400).json({
            error: 'user_ids must be a non-empty array'})
        }
        if (!update_data || Object.keys(update_data).length === 0) {
          return res.status(400).json({
            error: 'update_data must be provided'})
        }

        // Basic validations
        if (update_data.full_name && update_data.full_name.trim() === '') {
          return res.status(400).json({
            error: 'full_name must not be empty'})
        }

        if (update_data.mob_num) {
          const validMob = validateMobileNumber(update_data.mob_num)
          if (!validMob)
            return res.status(400).json({
              error: 'Invalid mobile number'})
          update_data.mob_num = validMob
        }

        if (update_data.pan_num) {
          const validPan = validatePan(update_data.pan_num)
          if (!validPan)
            return res.status(400).json({
              error: 'Invalid PAN number'})
          update_data.pan_num = validPan
        }

        // Check if only manager_id is being updated
        const onlyManagerUpdate =
          Object.keys(update_data).length === 1 && update_data.manager_id

        if (onlyManagerUpdate) {
          // Bulk manager update logic
          for (const uid of user_ids) {
            // Mark old manager mapping inactive
            await db.run(
              `UPDATE user_managers 
           SET is_active = 0, updated_at = ? 
           WHERE user_id = ? AND is_active = 1`,
              [new Date().toISOString(), uid],
            )

            // Insert new manager mapping
            await db.run(
              `INSERT INTO user_managers (user_id, manager_id, is_active, created_at, updated_at) 
           VALUES (?, ?, 1, ?, ?)`,
              [
                uid,
                update_data.manager_id,
                new Date().toISOString(),
                new Date().toISOString(),
              ],
            )
          }
          return res.json({
            message: `Manager updated for ${user_ids.length} user(s)`,
          })
        }

        // Otherwise: normal field update on users table
        const fields = []
        const values = []

        for (const key in update_data) {
          fields.push(`${key} = ?`)
          values.push(update_data[key])
        }

        values.push(new Date().toISOString()) // updated_at
        const placeholders =
          fields.length > 0
            ? fields.join(', ') + ', updated_at = ?'
            : 'updated_at = ?'

        const sql = `UPDATE users SET ${placeholders} WHERE user_id IN (${user_ids
          .map(() => '?')
          .join(', ')})`
        values.push(...user_ids)

        const r4 = await db.run(sql, values)

        if (r4.changes === 0) {
          return res.status(404).json({message: 'No users updated'})
        }
        return res.json({message: `${r4.changes} user(s) updated successfully`})
      } catch (err) {
        return res
          .status(500)
          .json({error: 'Server error', details: err.message})
      }
    })

    const PORT = process.env.PORT || 3000
    app.listen(PORT, () => {
      console.log(`User Management service running on port ${PORT}`)
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()
