# User Management API

## Objective
Develop a Node.js application exposing four RESTful API endpoints for managing users with validation, error handling, logging, and a SQLite database. The application is designed for modularity, efficiency, and clear, meaningful API responses.

---

## Table of Contents
- [API Endpoints](#api-endpoints)
- [Database Integration](#database-integration)
- [Validation & Error Handling](#validation--error-handling)
- [Code Structure](#code-structure)
- [How to Use](#how-to-use)
- [Logging](#logging)

---

## API Endpoints

### 1. Create User
- **Endpoint:** `/create_user`
- **Method:** POST
- **Payload:**
{
"full_name": "John Doe",
"mob_num": "+911234567890",
"pan_num": "ABCDE1234F",
"manager_id": "uuid-v4"
}
- **Validations:**
- `full_name` must not be empty.
- `mob_num` must be valid 10-digit number (prefixes like `0` or `+91` get adjusted).
- `pan_num` must be a valid PAN format (uppercase enforced).
- `manager_id` must correspond to an active manager.
- **Response:** Success message or validation error.

---

### 2. Get Users
- **Endpoint:** `/get_users`
- **Method:** POST
- **Payload (optional):**
{
"user_id": "uuid-v4",
"mob_num": "1234567890",
"manager_id": "uuid-v4"
}
- **Functionality:**
- Return all users if no filters.
- Return specific user if `user_id` or `mob_num` provided.
- Return all users managed by specified `manager_id`.
- **Response:** JSON array of user objects (empty array if none found).

---

### 3. Delete User
- **Endpoint:** `/delete_user`
- **Method:** POST
- **Payload:**
{
"user_id": "uuid-v4",
"mob_num": "1234567890"
}
- **Functionality:** Deletes user matching `user_id` or `mob_num`.
- **Response:** Success or user not found error.

---

### 4. Update User
- **Endpoint:** `/update_user`
- **Method:** POST
- **Payload:**
{
"user_ids": ["uuid-v4", "uuid-v4"],
"update_data": {
"full_name": "Jane Doe",
"mob_num": "0987654321",
"pan_num": "FGHIJ6789K",
"manager_id": "uuid-v4"
}
}
- **Validations:** Same as `/create_user`.
- **Functionality:**
- Bulk update manager if only `manager_id` present.
- For other fields, validate and update normally.
- If updating `manager_id` for users who already have a manager, mark old relation inactive and create new mapping.
- **Response:** Success or error if validations/missing keys fail.

---

## Database Integration

- **Database:** SQLite
- **Tables:**

### `users`
| Field      | Type      | Description                      |
|------------|-----------|--------------------------------|
| user_id    | UUID (PK) | Unique user identifier          |
| full_name  | TEXT      | User's full name                |
| mob_num    | TEXT      | Mobile number                  |
| pan_num    | TEXT      | PAN number                    |
| created_at | DATETIME  | Record creation timestamp       |
| updated_at | DATETIME  | Last update timestamp           |
| is_active  | BOOLEAN   | Active status flag (true/false) |

### `managers`
| Field      | Type      | Description                      |
|------------|-----------|--------------------------------|
| manager_id | UUID (PK) | Unique manager identifier        |
| is_active  | BOOLEAN   | Active status flag               |
- or use datatype INTEGER for manager_id(such as 1,2,3....).
- **Sample data** for `managers` table is prefilled for testing manager validation.

---

## Validation & Error Handling

- All endpoints check for missing or invalid keys and return descriptive error messages.
- Validation logic for mobile number, PAN, and other fields is modular for reusability.
- On errors, appropriate HTTP status codes and JSON error messages are returned.
- Logging is implemented for all API calls and errors.

---

## Code Structure

- Modular code:
- Validation utilities separated.
- Database access isolated.
- Routes and controllers clearly organized.
- Use of async/await for asynchronous operations with SQLite.
- Reusable middleware functions for request validation.

---

## How to Use

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Setup and initialize the SQLite database (tables and sample data loading).
4. Start the server: `node app.js` (or `npm start`).
5. Use Postman or curl to test the API endpoints.

---

## Logging

- Logs are created for each API request.
- Errors are logged with details for easier troubleshooting.
- Logs can be extended to external log files or services as needed.

---


For detailed implementation, please refer to the source code files. This README provides an overview and instructions to set up, use, and understand the User Management API project.
