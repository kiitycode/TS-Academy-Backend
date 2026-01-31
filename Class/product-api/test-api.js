// Test script for the API - FIXED VERSION
const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

// Default admin credentials if .env not loaded
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function testAPI() {
    try {
        console.log('=== Testing Tosin-Express API ===\n');
        console.log(`Using admin: ${ADMIN_EMAIL}\n`);
        
        // 1. Register a new user
        console.log('1. Registering new user...');
        const registerResponse = await axios.post(`${BASE_URL}/register`, {
            email: 'testuser@example.com',
            password: 'test123'
        });
        console.log('Register Response:', registerResponse.data.message);
        
        // 2. Login with the new user
        console.log('\n2. Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/login`, {
            email: 'testuser@example.com',
            password: 'test123'
        });
        const userToken = loginResponse.data.token;
        console.log('Login Response:', loginResponse.data.message);
        console.log('User Token received:', userToken ? 'Yes' : 'No');
        
        // 3. Get user profile
        console.log('\n3. Getting user profile...');
        const profileResponse = await axios.get(`${BASE_URL}/profile`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('Profile Role:', profileResponse.data.role);
        
        // 4. Try to create product (should fail for regular user)
        console.log('\n4. Trying to create product as regular user...');
        try {
            await axios.post(`${BASE_URL}/products`, {
                name: 'Test Product',
                price: 99.99
            }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
        } catch (error) {
            console.log('✅ Expected Error:', error.response?.data?.error);
        }
        
        // 5. Login as admin
        console.log('\n5. Logging in as admin...');
        console.log(`Using credentials: ${ADMIN_EMAIL} / ***`);
        
        const adminLogin = await axios.post(`${BASE_URL}/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const adminToken = adminLogin.data.token;
        console.log('✅ Admin Login:', adminLogin.data.message);
        console.log('Admin Role:', adminLogin.data.user.role);
        
        // 6. Create product as admin
        console.log('\n6. Creating product as admin...');
        const createProduct = await axios.post(`${BASE_URL}/products`, {
            name: 'Admin Product',
            price: 199.99
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Product Created:', createProduct.data.message);
        console.log('Product ID:', createProduct.data.product.id);
        
        // 7. Get all products
        console.log('\n7. Getting all products...');
        const allProducts = await axios.get(`${BASE_URL}/products`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✅ Total Products:', allProducts.data.count);
        
        // 8. Try to get products without token (should fail)
        console.log('\n8. Testing without token...');
        try {
            await axios.get(`${BASE_URL}/products`);
        } catch (error) {
            console.log('✅ Expected Error:', error.response?.data?.error);
        }
        
        console.log('\n🎉 ✅ API Testing Completed Successfully!');
        
    } catch (error) {
        console.error('\n❌ Test Failed with Error:');
        console.error('Message:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
    }
}

testAPI();