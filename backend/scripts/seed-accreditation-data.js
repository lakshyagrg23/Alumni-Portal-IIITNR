/**
 * Seed Accreditation Data
 * Populates database with sample data for testing accreditation dashboard
 * Run with: node backend/scripts/seed-accreditation-data.js
 */

const pool = require('../src/config/database');

// Sample data generators
const companies = [
    'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Adobe',
    'Oracle', 'IBM', 'Intel', 'Qualcomm', 'NVIDIA', 'Tesla', 'SpaceX',
    'Goldman Sachs', 'Morgan Stanley', 'JP Morgan', 'McKinsey', 'BCG',
    'Flipkart', 'Paytm', 'Razorpay', 'CRED', 'Swiggy', 'Zomato',
    'TCS', 'Infosys', 'Wipro', 'HCL', 'Tech Mahindra', 'Accenture'
];

const jobTitles = [
    'Software Engineer', 'Senior Software Engineer', 'Staff Engineer',
    'Data Scientist', 'ML Engineer', 'DevOps Engineer', 'Full Stack Developer',
    'Product Manager', 'Engineering Manager', 'Tech Lead',
    'Analyst', 'Consultant', 'Research Engineer', 'Cloud Architect'
];

const industries = [
    'Technology', 'Finance', 'Consulting', 'E-commerce', 'Healthcare',
    'Education', 'Automotive', 'Aerospace', 'Manufacturing', 'Retail'
];

const locations = [
    'Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi', 'Gurgaon',
    'Chennai', 'Kolkata', 'Remote', 'San Francisco', 'New York', 'London'
];

const universities = [
    'Stanford University', 'MIT', 'Carnegie Mellon University', 'UC Berkeley',
    'University of Texas at Austin', 'Georgia Tech', 'University of Washington',
    'IIT Bombay', 'IIT Delhi', 'IISc Bangalore', 'IIIT Hyderabad',
    'University of Cambridge', 'University of Oxford', 'ETH Zurich',
    'National University of Singapore', 'University of Toronto'
];

const programs = ['BTech CSE', 'BTech ECE', 'MTech CSE', 'MTech VLSI'];
const departments = ['CSE', 'ECE'];

function randomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startYear, endYear) {
    const year = randomInt(startYear, endYear);
    const month = randomInt(1, 12);
    const day = randomInt(1, 28);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function seedAccreditationFields() {
    console.log('🌱 Seeding accreditation fields in alumni_profiles...');
    
    try {
        // Get all alumni profiles
        const { rows: profiles } = await pool.query(
            'SELECT id, graduation_year, branch FROM alumni_profiles'
        );
        
        console.log(`Found ${profiles.length} alumni profiles to update`);
        
        for (const profile of profiles) {
            const graduationYear = profile.graduation_year || 2020;
            const employmentChoice = Math.random();
            
            let updateData = {
                department: profile.branch || randomElement(departments),
                program: randomElement(programs),
                consent_for_accreditation: true,
                consent_date: new Date(),
                verification_source: randomElement(['Self-reported', 'LinkedIn', 'Admin-verified', 'Email-verified']),
                profile_verified_at: randomDate(2024, 2025),
                alternate_email: `alternate_${Math.random().toString(36).substring(7)}@gmail.com`,
                employment_status: 'Employed'
            };
            
            // 70% employed, 20% higher studies, 10% other
            if (employmentChoice < 0.7) {
                // Employed
                updateData.employment_status = 'Employed';
                updateData.current_employer = randomElement(companies);
                updateData.current_job_title = randomElement(jobTitles);
                updateData.industry_sector = randomElement(industries);
                updateData.job_location = randomElement(locations);
                updateData.job_start_year = graduationYear;
                updateData.job_type = 'Full-time';
                updateData.annual_salary_range = randomElement(['3-5 LPA', '5-10 LPA', '10-15 LPA', '15-20 LPA', '20-30 LPA', '30+ LPA']);
            } else if (employmentChoice < 0.9) {
                // Higher studies
                updateData.employment_status = 'Higher Studies';
                updateData.higher_study_institution = randomElement(universities);
                updateData.higher_study_program = randomElement(['MS', 'Masters', 'PhD']);
                updateData.higher_study_field = randomElement(['Computer Science', 'Data Science', 'Artificial Intelligence', 'VLSI Design', 'Robotics']);
                updateData.higher_study_country = randomElement(['USA', 'UK', 'Canada', 'Germany', 'Singapore', 'India']);
                updateData.higher_study_year = graduationYear;
                updateData.higher_study_status = randomElement(['Pursuing', 'Completed']);
            } else {
                // Entrepreneur or unemployed
                updateData.employment_status = Math.random() < 0.5 ? 'Entrepreneur' : 'Unemployed';
            }
            
            const fields = Object.keys(updateData);
            const values = Object.values(updateData);
            const setClause = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');
            
            await pool.query(
                `UPDATE alumni_profiles SET ${setClause} WHERE id = $${fields.length + 1}`,
                [...values, profile.id]
            );
        }
        
        console.log('✅ Alumni profiles updated with accreditation data');
    } catch (error) {
        console.error('❌ Error seeding accreditation fields:', error);
        throw error;
    }
}

async function seedPlacementData() {
    console.log('🌱 Seeding placement data...');
    
    try {
        const { rows: profiles } = await pool.query(
            `SELECT id, graduation_year, program, department, cgpa 
             FROM alumni_profiles 
             WHERE employment_status = 'Employed' 
             LIMIT 100`
        );
        
        console.log(`Creating placement records for ${profiles.length} employed alumni`);
        
        for (const profile of profiles) {
            const company = randomElement(companies);
            const salary = randomInt(3, 50);
            
            await pool.query(
                `INSERT INTO placement_data (
                    alumni_id, company_name, job_title, job_location, job_type,
                    salary_package, salary_range, placement_year, placement_season,
                    graduation_year, program, department, cgpa,
                    industry_sector, company_type, job_category, job_role_type,
                    placement_type, verification_status, show_salary, show_company
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
                ON CONFLICT (alumni_id, placement_year, placement_type) DO NOTHING`,
                [
                    profile.id,
                    company,
                    randomElement(jobTitles),
                    randomElement(locations),
                    'Full-time',
                    salary,
                    `${Math.floor(salary)}-${Math.ceil(salary)+5} LPA`,
                    profile.graduation_year,
                    randomElement(['Campus Placement', 'Off-Campus', 'PPO (Pre-Placement Offer)']),
                    profile.graduation_year,
                    profile.program,
                    profile.department,
                    profile.cgpa || 8.0,
                    randomElement(industries),
                    randomElement(['Product', 'Service', 'Startup', 'MNC']),
                    randomElement(['Software Development', 'Data Science', 'Product Management', 'Consulting']),
                    'Technical',
                    'Campus Placement',
                    'verified',
                    Math.random() < 0.7,
                    true
                ]
            );
        }
        
        console.log('✅ Placement data seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding placement data:', error);
        throw error;
    }
}

async function seedHigherEducationData() {
    console.log('🌱 Seeding higher education data...');
    
    try {
        const { rows: profiles } = await pool.query(
            `SELECT id, graduation_year, program, department, cgpa 
             FROM alumni_profiles 
             WHERE employment_status = 'Higher Studies' 
             LIMIT 50`
        );
        
        console.log(`Creating higher education records for ${profiles.length} alumni`);
        
        for (const profile of profiles) {
            await pool.query(
                `INSERT INTO higher_education_data (
                    alumni_id, institution_name, institution_type, institution_country,
                    program_level, program_name, field_of_study, program_duration_years,
                    admission_year, status, funding_type, entrance_exam,
                    ug_graduation_year, ug_program, ug_department, ug_cgpa,
                    verification_status, is_public
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
                [
                    profile.id,
                    randomElement(universities),
                    'University',
                    randomElement(['USA', 'UK', 'Canada', 'Germany', 'Singapore', 'India']),
                    randomElement(['MS', 'Masters', 'PhD']),
                    randomElement(['Master of Science in Computer Science', 'PhD in Artificial Intelligence', 'MS in Data Science']),
                    randomElement(['Computer Science', 'Data Science', 'Artificial Intelligence', 'VLSI Design']),
                    randomElement([1.5, 2.0, 4.0, 5.0]),
                    profile.graduation_year,
                    randomElement(['Pursuing', 'Completed']),
                    randomElement(['Self-funded', 'Scholarship', 'Fellowship', 'Assistantship']),
                    randomElement(['GRE', 'GATE', 'GMAT', 'None']),
                    profile.graduation_year,
                    profile.program,
                    profile.department,
                    profile.cgpa || 8.0,
                    'verified',
                    true
                ]
            );
        }
        
        console.log('✅ Higher education data seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding higher education data:', error);
        throw error;
    }
}

async function seedContributions() {
    console.log('🌱 Seeding alumni contributions...');
    
    try {
        const { rows: profiles } = await pool.query(
            'SELECT id FROM alumni_profiles LIMIT 30'
        );
        
        const contributionTypes = [
            'donation', 'guest_lecture', 'mentorship', 'internship_offered',
            'job_recruitment', 'workshop_conducted', 'advisory_board'
        ];
        
        const titles = {
            donation: 'Annual Alumni Fund Contribution',
            guest_lecture: 'Guest Lecture on Industry Trends',
            mentorship: 'Career Mentorship Program',
            internship_offered: 'Summer Internship Opportunities',
            job_recruitment: 'Campus Recruitment Drive',
            workshop_conducted: 'Technical Workshop on AI/ML',
            advisory_board: 'Department Advisory Board Member'
        };
        
        for (const profile of profiles) {
            // Each alumni makes 1-3 contributions
            const numContributions = randomInt(1, 3);
            
            for (let i = 0; i < numContributions; i++) {
                const type = randomElement(contributionTypes);
                const year = randomInt(2020, 2025);
                
                await pool.query(
                    `INSERT INTO alumni_contributions (
                        alumni_id, type, title, description, organization,
                        amount, contribution_date, academic_year,
                        students_impacted, duration_hours,
                        verification_status, is_featured
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [
                        profile.id,
                        type,
                        titles[type] || 'Alumni Contribution',
                        `Valuable contribution by alumni in ${year}`,
                        'IIIT Naya Raipur',
                        type === 'donation' ? randomInt(5000, 100000) : null,
                        randomDate(year, year),
                        `${year}-${year + 1}`,
                        type === 'guest_lecture' || type === 'workshop_conducted' ? randomInt(50, 200) : null,
                        type === 'guest_lecture' || type === 'workshop_conducted' ? randomInt(1, 4) : null,
                        'verified',
                        Math.random() < 0.3
                    ]
                );
            }
        }
        
        console.log('✅ Contributions seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding contributions:', error);
        throw error;
    }
}

async function seedAchievements() {
    console.log('🌱 Seeding alumni achievements...');
    
    try {
        const { rows: profiles } = await pool.query(
            'SELECT id FROM alumni_profiles LIMIT 40'
        );
        
        const achievementTypes = [
            'promotion', 'award', 'startup_founded', 'publication',
            'patent', 'conference_speaker', 'certification'
        ];
        
        const titles = {
            promotion: 'Promoted to Senior Engineer',
            award: 'Employee of the Year Award',
            startup_founded: 'Founded Tech Startup',
            publication: 'Research Paper Published',
            patent: 'Patent Granted',
            conference_speaker: 'Speaker at Tech Conference',
            certification: 'AWS Solutions Architect Certification'
        };
        
        for (const profile of profiles) {
            // Each alumni has 1-2 achievements
            const numAchievements = randomInt(1, 2);
            
            for (let i = 0; i < numAchievements; i++) {
                const type = randomElement(achievementTypes);
                const year = randomInt(2021, 2025);
                
                await pool.query(
                    `INSERT INTO alumni_achievements (
                        alumni_id, type, title, description, organization,
                        achievement_date, recognition_level,
                        verification_status, is_featured, is_published
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        profile.id,
                        type,
                        titles[type] || 'Notable Achievement',
                        `Significant achievement earned in ${year}`,
                        randomElement(companies),
                        randomDate(year, year),
                        randomElement(['International', 'National', 'Corporate', 'University']),
                        'verified',
                        Math.random() < 0.4,
                        true
                    ]
                );
            }
        }
        
        console.log('✅ Achievements seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding achievements:', error);
        throw error;
    }
}

async function main() {
    console.log('🚀 Starting accreditation data seeding...\n');
    
    try {
        await seedAccreditationFields();
        await seedPlacementData();
        await seedHigherEducationData();
        await seedContributions();
        await seedAchievements();
        
        console.log('\n✅ All accreditation data seeded successfully!');
        console.log('\n📊 Summary:');
        
        // Print statistics
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM alumni_profiles WHERE consent_for_accreditation = true) as consented_profiles,
                (SELECT COUNT(*) FROM placement_data) as placement_records,
                (SELECT COUNT(*) FROM higher_education_data) as higher_ed_records,
                (SELECT COUNT(*) FROM alumni_contributions) as contributions,
                (SELECT COUNT(*) FROM alumni_achievements) as achievements
        `);
        
        console.log(`   - Consented Alumni: ${stats.rows[0].consented_profiles}`);
        console.log(`   - Placement Records: ${stats.rows[0].placement_records}`);
        console.log(`   - Higher Education Records: ${stats.rows[0].higher_ed_records}`);
        console.log(`   - Contributions: ${stats.rows[0].contributions}`);
        console.log(`   - Achievements: ${stats.rows[0].achievements}`);
        
    } catch (error) {
        console.error('\n❌ Error during seeding:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main };
