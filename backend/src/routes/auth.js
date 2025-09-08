import express from 'express';
import { register } from '../controllers/register.js';
import { login } from '../controllers/login.js';
import { googleLogin, linkedinLogin } from '../controllers/socialLogin.js';
const router = express.Router();

// Routes

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/linkedin", linkedinLogin);

export default router;