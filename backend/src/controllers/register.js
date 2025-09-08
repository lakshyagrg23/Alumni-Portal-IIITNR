import User from '../models/User.js';


export const register = async (req, res) => {
    try {
        console.log(req.body);
        const { firstName, lastName, email, password, provider } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Determine provider
        let providerName = 'local';
        if (provider === 'google') {
            providerName = 'google';
        }    
        else if (provider === 'linkedin') {
            providerName = 'linkedin';
        }    

        // Create new user
        const user = await User.create({
            email,
            password_hash: password, // Will be automatically hashed by model hook
            provider: providerName
        });

        // Create alumni profile (we'll implement this later)
        // await AlumniProfile.create({
        //     user_id: user.id,
        //     first_name: firstName,
        //     last_name: lastName
        // });

        // Remove sensitive data before sending response
        const userData = user.toJSON();
        delete userData.password_hash;
        delete userData.email_verification_token;
        delete userData.password_reset_token;

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                user: userData,
                isAutoApproved: user.is_approved
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};
