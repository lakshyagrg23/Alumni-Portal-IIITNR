require('dotenv').config();
const pool = require('./src/config/database');

const placementData = [
  { company_name: 'Google', job_title: 'Software Engineer', salary_package: 24.5, placement_year: 2024, industry_sector: 'Technology', verification_status: 'verified' },
  { company_name: 'Microsoft', job_title: 'SDE II', salary_package: 22.0, placement_year: 2024, industry_sector: 'Technology', verification_status: 'verified' },
  { company_name: 'Amazon', job_title: 'Software Development Engineer', salary_package: 20.0, placement_year: 2024, industry_sector: 'E-commerce', verification_status: 'verified' },
  { company_name: 'Flipkart', job_title: 'Senior Developer', salary_package: 18.5, placement_year: 2024, industry_sector: 'E-commerce', verification_status: 'verified' },
  { company_name: 'TCS', job_title: 'System Engineer', salary_package: 7.5, placement_year: 2023, industry_sector: 'IT Services', verification_status: 'verified' },
  { company_name: 'Infosys', job_title: 'Software Engineer', salary_package: 8.0, placement_year: 2023, industry_sector: 'IT Services', verification_status: 'verified' },
  { company_name: 'Wipro', job_title: 'Project Engineer', salary_package: 7.0, placement_year: 2023, industry_sector: 'IT Services', verification_status: 'verified' },
  { company_name: 'Adobe', job_title: 'Member of Technical Staff', salary_package: 26.0, placement_year: 2024, industry_sector: 'Technology', verification_status: 'verified' },
  { company_name: 'Goldman Sachs', job_title: 'Analyst', salary_package: 19.0, placement_year: 2024, industry_sector: 'Finance', verification_status: 'verified' },
  { company_name: 'Morgan Stanley', job_title: 'Technology Analyst', salary_package: 17.5, placement_year: 2023, industry_sector: 'Finance', verification_status: 'verified' }
];

const higherEducationData = [
  { institution_name: 'Stanford University', program_level: 'Masters', field_of_study: 'Computer Science', institution_country: 'USA', admission_year: 2024, status: 'Pursuing' },
  { institution_name: 'MIT', program_level: 'PhD', field_of_study: 'Artificial Intelligence', institution_country: 'USA', admission_year: 2023, status: 'Pursuing' },
  { institution_name: 'Carnegie Mellon University', program_level: 'MS', field_of_study: 'Machine Learning', institution_country: 'USA', admission_year: 2024, status: 'Pursuing' },
  { institution_name: 'IIT Bombay', program_level: 'Masters', field_of_study: 'Computer Science', institution_country: 'India', admission_year: 2023, status: 'Completed' },
  { institution_name: 'University of Cambridge', program_level: 'PhD', field_of_study: 'Robotics', institution_country: 'UK', admission_year: 2024, status: 'Pursuing' }
];

async function seedAccreditationData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting accreditation data seeding...\n');
    
    // Get alumni profiles
    const alumniResult = await client.query('SELECT id FROM alumni_profiles LIMIT 10');
    const alumniIds = alumniResult.rows.map(row => row.id);
    
    if (alumniIds.length === 0) {
      console.log('⚠️  No alumni profiles found. Please seed alumni data first.');
      await client.query('ROLLBACK');
      return;
    }
    
    console.log(`Found ${alumniIds.length} alumni profiles\n`);
    
    // 1. Seed Placement Data
    console.log('📊 Seeding placement data...');
    let placementCount = 0;
    for (const placement of placementData) {
      const alumniId = alumniIds[Math.floor(Math.random() * alumniIds.length)];
      
      try {
        await client.query(`
          INSERT INTO placement_data (
            alumni_id, company_name, job_title, salary_package, 
            placement_year, industry_sector, verification_status,
            job_location, job_type, program, department, graduation_year
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (alumni_id, placement_year, placement_type) DO NOTHING
        `, [
          alumniId,
          placement.company_name,
          placement.job_title,
          placement.salary_package,
          placement.placement_year,
          placement.industry_sector,
          placement.verification_status,
          'Bengaluru, India',
          'Full-time',
          'BTech',
          'CSE',
          placement.placement_year
        ]);
        placementCount++;
      } catch (err) {
        console.log(`  Skipped duplicate for ${placement.company_name}`);
      }
    }
    console.log(`✅ Seeded ${placementCount} placement records\n`);
    
    // 2. Seed Higher Education Data
    console.log('🎓 Seeding higher education data...');
    let higherEdCount = 0;
    for (const edu of higherEducationData) {
      const alumniId = alumniIds[Math.floor(Math.random() * alumniIds.length)];
      
      await client.query(`
        INSERT INTO higher_education_data (
          alumni_id, institution_name, program_level, program_name, field_of_study,
          institution_country, admission_year, status,
          ug_graduation_year, ug_program, ug_department
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        alumniId,
        edu.institution_name,
        edu.program_level,
        `${edu.program_level} in ${edu.field_of_study}`,
        edu.field_of_study,
        edu.institution_country,
        edu.admission_year,
        edu.status,
        edu.admission_year - 2,
        'BTech',
        'CSE'
      ]);
      higherEdCount++;
    }
    console.log(`✅ Seeded ${higherEdCount} higher education records\n`);
    
    // 3. Update alumni profiles with employment status
    console.log('👥 Updating alumni employment status...');
    await client.query(`
      UPDATE alumni_profiles
      SET employment_status = CASE
        WHEN RANDOM() < 0.4 THEN 'Employed'
        WHEN RANDOM() < 0.7 THEN 'Higher Studies'
        WHEN RANDOM() < 0.85 THEN 'Entrepreneur'
        ELSE 'Not specified'
      END,
      consent_for_accreditation = true,
      profile_verified_at = NOW() - INTERVAL '30 days' * RANDOM()
      WHERE employment_status = 'Not specified' OR employment_status IS NULL
    `);
    console.log('✅ Updated alumni employment status\n');
    
    // 4. Add more contributions
    console.log('🎁 Adding more contributions...');
    const contributionTypes = ['guest_lecture', 'mentorship', 'internship_offer', 'donation'];
    let contribCount = 0;
    
    for (let i = 0; i < 5; i++) {
      const alumniId = alumniIds[Math.floor(Math.random() * alumniIds.length)];
      const type = contributionTypes[Math.floor(Math.random() * contributionTypes.length)];
      
      await client.query(`
        INSERT INTO alumni_contributions (
          alumni_id, contribution_type, title, description, 
          contribution_date, is_verified, amount
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        alumniId,
        type,
        `${type.replace('_', ' ')} contribution ${i + 1}`,
        `Description for ${type} contribution`,
        new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        true,
        type === 'donation' ? Math.floor(Math.random() * 100000) + 10000 : null
      ]);
      contribCount++;
    }
    console.log(`✅ Added ${contribCount} contributions\n`);
    
    // 5. Add more achievements
    console.log('🏆 Adding more achievements...');
    const achievementTypes = ['promotion', 'award', 'publication', 'startup'];
    let achievCount = 0;
    
    for (let i = 0; i < 8; i++) {
      const alumniId = alumniIds[Math.floor(Math.random() * alumniIds.length)];
      const type = achievementTypes[Math.floor(Math.random() * achievementTypes.length)];
      
      await client.query(`
        INSERT INTO alumni_achievements (
          alumni_id, achievement_type, title, description,
          achievement_date, is_verified, organization
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        alumniId,
        type,
        `${type.replace('_', ' ')} achievement ${i + 1}`,
        `Description for ${type} achievement`,
        new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        true,
        'IIIT Naya Raipur'
      ]);
      achievCount++;
    }
    console.log(`✅ Added ${achievCount} achievements\n`);
    
    await client.query('COMMIT');
    
    console.log('🎉 Accreditation data seeding completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`   - ${placementCount} placement records`);
    console.log(`   - ${higherEdCount} higher education records`);
    console.log(`   - ${contribCount} contributions`);
    console.log(`   - ${achievCount} achievements`);
    console.log(`   - Updated alumni employment status`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding data:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    pool.end();
  }
}

seedAccreditationData();
