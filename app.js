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
    INSERT INTO managers (manager_id,is_active) VALUES (4,"false");
    `
    //const getQuery = `delete from managers where manager_id=4`
    // const getQueryUser = `select * from users`
    // const booksArray = await db.all(getQueryUser)
    // // //response.send(booksArray)
    // console.log(booksArray)

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
      VALUES ("${user_id}", "${full_name}", "${validatedMobile}", "${validatedPan}", ${manager_id}, "${now}", "${now}", 1)
    `
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
