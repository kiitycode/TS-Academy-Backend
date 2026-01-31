// CRUD Express Product API with JWT Authentication & Role-Based Authorization

// Import required modules
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// JSON middleware to understand JSON data
app.use(express.json());

// In-memory storage
let products = [
    { id: 1, name: "Laptop", price: 999.99, createdBy: "admin" },
    { id: 2, name: "Phone", price: 699.99, createdBy: "admin" },
];

// In-memory user storage (in production, use a database)
let users = [
    {
        id: 1,
        email: process.env.ADMIN_EMAIL,
        password: bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10),
        role: 'admin'
    },
    {
        id: 2,
        email: 'user@example.com',
        password: bcrypt.hashSync('user123', 10),
        role: 'user'
    }
];

let nextId = 3;
let nextUserId = 3;

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        return res.status(401).json({ error: "Access token required" });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Invalid or expired token" });
        }
        req.user = user;
        next();
    });
};

// Middleware for role-based authorization
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: "You don't have permission to perform this action" 
            });
        }
        
        next();
    };
};

// Welcome message
app.get('/', (req, res) => {
    res.send('Welcome to Tosin-Express API with JWT Authentication!');
});

// AUTH ROUTES

// Register new user
app.post('/register', (req, res) => {
    try {
        const { email, password, role = 'user' } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                error: "Please provide email and password"
            });
        }
        
        // Check if user already exists
        const existingUser = users.find(u => u.email === email);
        if (existingUser) {
            return res.status(400).json({
                error: "User already exists"
            });
        }
        
        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        // Create new user
        const newUser = {
            id: nextUserId++,
            email,
            password: hashedPassword,
            role: role === 'admin' ? 'user' : role // Prevent self-assigning admin role
        };
        
        users.push(newUser);
        
        res.status(201).json({
            message: "User registered successfully",
            user: { id: newUser.id, email: newUser.email, role: newUser.role }
        });
    } catch (error) {
        res.status(500).json({ error: "Something went wrong, Try Again" });
    }
});

// Login user
app.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                error: "Please provide email and password"
            });
        }
        
        // Find user
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({
                error: "Invalid credentials"
            });
        }
        
        // Verify password
        const isValidPassword = bcrypt.compareSync(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: "Invalid credentials"
            });
        }
        
        // Create JWT token
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1h' }
        );
        
        res.json({
            message: "Login successful",
            token,
            user: { id: user.id, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ error: "Something went wrong, Try Again" });
    }
});

// PRODUCT ROUTES

// CREATE - Add a new product (Admin only)
app.post('/products', authenticateToken, authorizeRoles('admin'), (req, res) => {
    try {
        const { name, price } = req.body;
        
        if (!name || !price) {
            return res.status(400).json({
                error: "Please provide name and price"
            });
        }
        
        const newProduct = {
            id: nextId++,
            name: name,
            price: parseFloat(price),
            createdBy: req.user.email,
            createdAt: new Date().toISOString()
        };
        
        products.push(newProduct);
        
        res.status(201).json({
            message: "Product created successfully",
            product: newProduct
        });
    } catch (error) {
        res.status(500).json({ error: "Something went wrong, Try Again" });
    }
});

// READ - Get all products (Authenticated users only)
app.get('/products', authenticateToken, (req, res) => {
    try {
        // If user is admin, show all products
        // If user is regular user, only show products they created
        let filteredProducts = products;
        if (req.user.role === 'user') {
            filteredProducts = products.filter(p => p.createdBy === req.user.email);
        }
        
        res.json({
            message: "Products retrieved successfully",
            count: filteredProducts.length,
            products: filteredProducts
        });
    } catch (error) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

// READ - Get product by ID (Authenticated users only)
app.get('/products/:id', authenticateToken, (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        
        let product = products.find(p => p.id === productId);
        
        if (!product) {
            return res.status(404).json({
                error: "Product not found"
            });
        }
        
        // Check authorization - users can only see their own products unless admin
        if (req.user.role === 'user' && product.createdBy !== req.user.email) {
            return res.status(403).json({
                error: "You don't have permission to view this product"
            });
        }
        
        res.json({
            message: "Product found",
            product: product
        });
    } catch (error) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

// UPDATE - Update a product (Admin can update all, users can update their own)
app.put('/products/:id', authenticateToken, (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        const { name, price } = req.body;
        
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            return res.status(404).json({
                error: "Product not found"
            });
        }
        
        let product = products[productIndex];
        
        // Check authorization
        if (req.user.role === 'user' && product.createdBy !== req.user.email) {
            return res.status(403).json({
                error: "You can only update your own products"
            });
        }
        
        if (name) product.name = name;
        if (price) product.price = parseFloat(price);
        product.updatedAt = new Date().toISOString();
        product.updatedBy = req.user.email;
        
        products[productIndex] = product;
        
        res.json({
            message: "Product updated successfully",
            product: product
        });
    } catch (error) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

// DELETE - Delete a product (Admin only)
app.delete('/products/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
    try {
        const productId = parseInt(req.params.id);
        
        const productIndex = products.findIndex(p => p.id === productId);
        
        if (productIndex === -1) {
            return res.status(404).json({
                error: "Product not found"
            });
        }
        
        const deletedProduct = products.splice(productIndex, 1)[0];
        
        res.json({
            message: "Product deleted successfully",
            product: deletedProduct
        });
    } catch (error) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

// USER PROFILE ROUTE (Authenticated users only)
app.get('/profile', authenticateToken, (req, res) => {
    try {
        const user = users.find(u => u.id === req.user.id);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        res.json({
            id: user.id,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        res.status(500).json({ error: "Something went wrong" });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('\n📋 Available Routes:');
    console.log('POST   /register           - Register new user');
    console.log('POST   /login              - Login user');
    console.log('GET    /profile            - Get user profile (Authenticated)');
    console.log('GET    /products           - Get all products (Authenticated)');
    console.log('GET    /products/:id       - Get product by ID (Authenticated)');
    console.log('POST   /products           - Create new product (Admin only)');
    console.log('PUT    /products/:id       - Update product (Admin/User)');
    console.log('DELETE /products/:id       - Delete product (Admin only)');
    console.log('\n🔐 Default Admin Credentials:');
    console.log(`Email: ${process.env.ADMIN_EMAIL}`);
    console.log(`Password: ${process.env.ADMIN_PASSWORD}`);
});