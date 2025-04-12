import express from 'express';
import { signup, login } from '../controllers/authController.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Middleware to verify JWT token
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production');
        req.user = await User.findById(decoded.id).select('-password');
        next();
    } catch (error) {
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/admin/users', protect, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized as admin' });
        }

        const users = await User.find({}).select('-password');
        res.status(200).json(users);
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
