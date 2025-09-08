import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Environment variables for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = '1d';

export const login = async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ message: 'Email and password are required.' });
		}

		// Find user by email
		const user = await User.findOne({ where: { email } });
		if (!user) {
			return res.status(401).json({ message: 'Invalid email or password.' });
		}

		// Check password
		const isMatch = await bcrypt.compare(password, user.password_hash);
		if (!isMatch) {
			return res.status(401).json({ message: 'Invalid email or password.' });
		}

		// Create JWT payload
		const payload = {
			id: user.id,
			email: user.email,
			role: user.role || 'user',
		};

		// Sign JWT
		const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

		// Respond with token and user info
		res.json({
			message: 'Login successful',
			token,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role || 'user',
			},
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ message: 'Server error. Please try again.' });
	}
};
