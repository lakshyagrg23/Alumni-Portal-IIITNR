import 'dotenv/config';
import { query } from './src/config/database.js';

async function seedSampleData() {
  try {
    console.log("🌱 Seeding sample alumni data...");

    // Sample alumni profiles data
    const sampleAlumni = [
      {
        email: 'rahul.sharma@iiitnr.edu.in',
        firstName: 'Rahul',
        lastName: 'Sharma',
        graduationYear: 2020,
        branch: 'Computer Science Engineering',
        degree: 'B.Tech',
        currentCompany: 'Google',
        currentPosition: 'Software Engineer',
        currentCity: 'Bangalore',
        currentState: 'Karnataka',
        skills: ['JavaScript', 'React', 'Node.js', 'Python'],
        linkedinUrl: 'https://linkedin.com/in/rahulsharma',
        bio: 'Passionate software engineer working on scalable web applications'
      },
      {
        email: 'priya.patel@gmail.com',
        firstName: 'Priya',
        lastName: 'Patel',
        graduationYear: 2019,
        branch: 'Electronics and Communication Engineering',
        degree: 'B.Tech',
        currentCompany: 'Microsoft',
        currentPosition: 'Senior Software Engineer',
        currentCity: 'Hyderabad',
        currentState: 'Telangana',
        skills: ['C++', 'Python', 'Machine Learning', 'Azure'],
        linkedinUrl: 'https://linkedin.com/in/priyapatel',
        bio: 'Machine learning enthusiast with expertise in cloud technologies'
      },
      {
        email: 'amit.kumar@iiitnr.edu.in',
        firstName: 'Amit',
        lastName: 'Kumar',
        graduationYear: 2021,
        branch: 'Computer Science Engineering',
        degree: 'B.Tech',
        currentCompany: 'Amazon',
        currentPosition: 'Software Development Engineer',
        currentCity: 'Pune',
        currentState: 'Maharashtra',
        skills: ['Java', 'Spring Boot', 'AWS', 'Microservices'],
        linkedinUrl: 'https://linkedin.com/in/amitkumar',
        bio: 'Backend engineer specializing in distributed systems'
      },
      {
        email: 'sneha.gupta@yahoo.com',
        firstName: 'Sneha',
        lastName: 'Gupta',
        graduationYear: 2018,
        branch: 'Information Technology',
        degree: 'B.Tech',
        currentCompany: 'Flipkart',
        currentPosition: 'Product Manager',
        currentCity: 'Bangalore',
        currentState: 'Karnataka',
        skills: ['Product Management', 'Analytics', 'SQL', 'Python'],
        linkedinUrl: 'https://linkedin.com/in/snehagupta',
        bio: 'Product manager with a passion for user experience and data-driven decisions'
      },
      {
        email: 'vikash.singh@iiitnr.edu.in',
        firstName: 'Vikash',
        lastName: 'Singh',
        graduationYear: 2022,
        branch: 'Electrical Engineering',
        degree: 'B.Tech',
        currentCompany: 'Tesla',
        currentPosition: 'Electrical Engineer',
        currentCity: 'Delhi',
        currentState: 'Delhi',
        skills: ['Circuit Design', 'MATLAB', 'AutoCAD', 'Power Systems'],
        linkedinUrl: 'https://linkedin.com/in/vikashsingh',
        bio: 'Electrical engineer working on sustainable energy solutions'
      }
    ];

    for (const alumni of sampleAlumni) {
      try {
        // Check if user already exists
        const existingUser = await query(
          "SELECT id FROM users WHERE email = $1",
          [alumni.email]
        );

        let userId;
        if (existingUser.rows.length === 0) {
          // Create user
          const isInstituteEmail = alumni.email.endsWith('@iiitnr.edu.in');
          const userResult = await query(`
            INSERT INTO users (email, role, is_approved, is_active, email_verified) 
            VALUES ($1, $2, $3, $4, $5) RETURNING id
          `, [alumni.email, 'alumni', isInstituteEmail, true, isInstituteEmail]);
          userId = userResult.rows[0].id;
        } else {
          userId = existingUser.rows[0].id;
        }

        // Check if profile already exists
        const existingProfile = await query(
          "SELECT id FROM alumni_profiles WHERE user_id = $1",
          [userId]
        );

        if (existingProfile.rows.length === 0) {
          // Create alumni profile
          await query(`
            INSERT INTO alumni_profiles (
              user_id, first_name, last_name, graduation_year, branch, degree,
              current_company, current_position, current_city, current_state,
              current_country, skills, linkedin_url, bio, is_profile_public
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          `, [
            userId, alumni.firstName, alumni.lastName, alumni.graduationYear,
            alumni.branch, alumni.degree, alumni.currentCompany, alumni.currentPosition,
            alumni.currentCity, alumni.currentState, 'India', alumni.skills,
            alumni.linkedinUrl, alumni.bio, true
          ]);
          
          console.log(`   ✅ Created profile for ${alumni.firstName} ${alumni.lastName}`);
        } else {
          console.log(`   ⚠️  Profile already exists for ${alumni.firstName} ${alumni.lastName}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to create profile for ${alumni.firstName} ${alumni.lastName}:`, error.message);
      }
    }

    console.log("✅ Sample data seeding completed!");
  } catch (error) {
    console.error("❌ Sample data seeding failed:", error.message);
  }
  process.exit(0);
}

seedSampleData();
