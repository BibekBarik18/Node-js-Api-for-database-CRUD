const express = require('express');
const mysql = require('mysql2');

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Create a connection
const connection = mysql.createConnection({
  host: 'host',   // MySQL server host
  user: 'user',        // your MySQL username
  password: 'password', // your MySQL password
  database: 'database'   // database to use (must exist first)
});

// Connect to MySQL

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting: ' + err.stack);
      return;
    }
    console.log('Connected to MySQL as ID ' + connection.threadId);
  });


//get all users
app.get('/users', (req, res) => {

    const getAllUsersQuery = 'SELECT * FROM users ORDER BY created_at DESC';

    connection.query(getAllUsersQuery, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch users',
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No users found',
                data: [],
                count: 0
            });
        }

        res.status(200).json({
            success: true,
            message: 'Users fetched successfully',
            data: results,
            count: results.length
        });
    });
});

// GET - Retrieve a specific user
app.get('/users/:id', (req, res) => {
    const userId = req.params.id;
    const getUserByIdQuery = 'SELECT * FROM users WHERE id = ?';

    connection.query(getUserByIdQuery, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch user',
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'User fetched successfully',
            data: results[0]
        });
    });
});

// UPDATE USER - Complete update (PUT)
app.put('/users/:id', (req, res) => {
    const userId = req.params.id;
    const { firstname, lastname, email, phone, age, dept } = req.body;

    // Validation
    if (!firstname || !lastname || !email || !phone || !age || !dept) {
        return res.status(400).json({
            success: false,
            message: 'First name, last name, email, phone, age and dept are required'
        });
    }

    // First check if user exists
    const checkUserQuery = 'SELECT * FROM users WHERE id = ?';
    
    connection.query(checkUserQuery, [userId], (err, results) => {
        
        if (err) {
            console.error('Error checking user:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error',
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user
        const updateUserQuery = `
            UPDATE users 
            SET firstname = ?, lastname = ?, email = ?, phone = ?, age = ?, dept=?
            WHERE id = ?
        `;

        connection.query(updateUserQuery, [firstname, lastname, email, phone, age, dept, userId], (err, result) => {
            if (err) {
                console.error('Error updating user:', err);
                
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({
                        success: false,
                        message: 'Email already exists'
                    });
                }
                
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update user',
                    error: err.message
                });
            }

            res.status(200).json({
                success: true,
                message: 'User updated successfully',
                data: {
                    id: parseInt(userId),
                    firstname,
                    lastname,
                    email,
                    phone,
                    age
                }
            });
        });
    });
});

// DELETE USER by ID
app.delete('/users/:id', (req, res) => {
    const userId = req.params.id;

    // First check if user exists
    const checkUserQuery = 'SELECT * FROM users WHERE id = ?';
    
    connection.query(checkUserQuery, [userId], (err, results) => {
        if (err) {
            console.error('Error checking user:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error',
                error: err.message
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const userToDelete = results[0];

        // Delete the user
        const deleteUserQuery = 'DELETE FROM users WHERE id = ?';
        
        connection.query(deleteUserQuery, [userId], (err, result) => {
            if (err) {
                console.error('Error deleting user:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to delete user',
                    error: err.message
                });
            }

            res.status(200).json({
                success: true,
                message: 'User deleted successfully',
                deletedUser: {
                    id: userToDelete.id,
                    firstname: userToDelete.firstname,
                    lastname: userToDelete.lastname,
                    email: userToDelete.email
                }
            });
        });
    });
});

// Route to ADD A NEW USER (bonus)
app.post('/users', (req, res) => {
    const { firstname, lastname, email, phone, age, dept } = req.body;

    // Basic validation
    if (!firstname || !lastname || !email || !phone || !age || !dept) {
        return res.status(400).json({
            success: false,
            message: 'First name, last name, email, phone, age and dept are required'
        });
    }

    const addUserQuery = `
        INSERT INTO users (firstname, lastname, email, phone, age, dept) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    connection.query(addUserQuery, [firstname, lastname, email, phone, age, dept], (err, result) => {
        if (err) {
            console.error('Error adding user:', err);
            
            // Handle duplicate email error
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({
                    success: false,
                    message: 'Email already exists'
                });
            }
            
            return res.status(500).json({
                success: false,
                message: 'Failed to add user',
                error: err.message
            });
        }

        res.status(201).json({
            success: true,
            message: 'User added successfully',
            data: {
                id: result.insertId,
                firstname,
                lastname,
                email,
                phone,
                age,
                dept
            }
        });
    });
});


app.post('/create-users-table', (req, res) => {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            firstname VARCHAR(50) NOT NULL,
            lastname VARCHAR(50) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(15),
            age INT,
            dept VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    connection.query(createUsersTable, (err, result) => {
        if (err) {
            console.error('Error creating users table:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to create users table',
                error: err.message
            });
        }

        res.status(200).json({
            success: true,
            message: 'Users table created successfully!'
        });
    });
});

connection.end();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to see available endpoints`);
});

