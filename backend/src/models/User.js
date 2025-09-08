import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcryptjs';

class User extends Model {
    // Instance method to check password
    async comparePassword(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password_hash);
    }
}

User.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: {
                    msg: 'Please enter a valid email address'
                }
            }
        },
        password_hash: {
            type: DataTypes.STRING,
            allowNull: true // null for OAuth users
        },
        provider: {
            type: DataTypes.STRING(50),
            defaultValue: 'local',
            validate: {
                isIn: [['local', 'google']]
            }
        },
        provider_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        role: {
            type: DataTypes.STRING(20),
            defaultValue: 'alumni',
            validate: {
                isIn: [['admin', 'alumni']]
            }
        },
        is_approved: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        email_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        email_verification_token: {
            type: DataTypes.STRING,
            allowNull: true
        },
        password_reset_token: {
            type: DataTypes.STRING,
            allowNull: true
        },
        password_reset_expires: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
        underscored: true,
        
        // Hooks (lifecycle events)
        hooks: {
            // Hash password before saving
            beforeSave: async (user) => {
                if (user.changed('password_hash')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password_hash = await bcrypt.hash(user.password_hash, salt);
                }
            },
            // Auto-approve @iiitnr.edu.in emails
            beforeCreate: (user) => {
                if (user.email.endsWith('@iiitnr.edu.in')) {
                    user.is_approved = true;
                    user.email_verified = true;
                }
            }
        }
    }
);

export default User;
