import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production', {
        expiresIn: '30d'
    });
};

// Signup Controller
export const signup = async (req, res) => {
    try {
        console.log('Incoming request body:', req.body); // Log the request payload

        const { Name, email, password } = req.body;

        // Validate input
        if (!Name || !email || !password) {
            console.error('Validation error: Missing fields', { Name, email, password });
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            console.error('Validation error: User already exists', { email });
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        const user = await User.create({
            Name,
            email,
            password
        });

        if (user) {
            const token = generateToken(user._id);
            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    _id: user._id,
                    Name: user.Name,
                    email: user.email,
                    role: user.role
                },
                token
            });
        } else {
            console.error('Error: User creation failed');
            res.status(500).json({ message: 'User creation failed' });
        }
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            message: 'Server error during signup', 
            error: error.message 
        });
    }
};

// Login Controller
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Normalize email to lowercase
        const normalizedEmail = email.toLowerCase();

        // Validate input
        if (!normalizedEmail || !password) {
            console.error('Validation error: Missing email or password');
            return res.status(400).json({ message: 'Please provide email and password' });
        }

        // Find user
        console.log('Searching for user with email:', normalizedEmail);
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            console.error('Login error: User not found', { normalizedEmail });
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Log user details for debugging
        console.log('User found:', user);

        // Check password
        console.log('Stored hashed password:', user.password);
        console.log('Password to compare:', password);
        const isMatch = await user.comparePassword(password);
        console.log('Password match result:', isMatch);
        if (!isMatch) {
            console.error('Login error: Password mismatch', { normalizedEmail });
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate token
        const token = generateToken(user._id);
        console.log('Login successful, generating token');
        res.json({
            message: 'Login successful',
            user: {
                _id: user._id,
                Name: user.Name,
                email: user.email,
                role: user.role
            },
            token
        });
    } catch (error) {
        console.error('Unexpected login error:', error);
        res.status(500).json({ 
            message: 'Server error during login', 
            error: error.message 
        });
    }
};