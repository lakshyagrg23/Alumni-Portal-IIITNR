import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = '1d';

// Google login controller
export const googleLogin = async (req, res) => {
  try {
    const { email, googleId, name } = req.body;
    if (!email || !googleId) {
      return res.status(400).json({ message: 'Google login failed: missing email or googleId.' });
    }

    let user = await User.findOne({ where: { email } });
    if (!user) {
      // Register new user with Google provider
      user = await User.create({
        email,
        provider: 'google',
        provider_id: googleId,
        name,
        email_verified: true,
        is_approved: true
      });
    }

    // Create JWT payload
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      message: 'Google login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
        provider: user.provider
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// LinkedIn login controller
export const linkedinLogin = async (req, res) => {
  try {
    const { email, linkedinId, name } = req.body;
    if (!email || !linkedinId) {
      return res.status(400).json({ message: 'LinkedIn login failed: missing email or linkedinId.' });
    }

    let user = await User.findOne({ where: { email } });
    if (!user) {
      // Register new user with LinkedIn provider
      user = await User.create({
        email,
        provider: 'linkedin',
        provider_id: linkedinId,
        name,
        email_verified: true,
        is_approved: true
      });
    }

    // Create JWT payload
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      message: 'LinkedIn login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
        provider: user.provider
      },
    });
  } catch (error) {
    console.error('LinkedIn login error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};
