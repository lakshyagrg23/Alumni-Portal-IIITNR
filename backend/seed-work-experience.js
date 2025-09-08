require('dotenv').config();
const { query } = require('./src/config/database');

async function seedWorkExperience() {
  try {
    console.log('🌱 Seeding work experience data...');

    // First get alumni IDs
    const alumniResult = await query('SELECT id, first_name, last_name FROM alumni_profiles LIMIT 5');
    const alumni = alumniResult.rows;

    if (alumni.length === 0) {
      console.log('No alumni found. Please run the main seed script first.');
      return;
    }

    // Work experience data for each alumni
    const workExperiences = [
      // Rahul Sharma (Google)
      {
        alumni_id: alumni.find(a => a.first_name === 'Rahul')?.id,
        experiences: [
          {
            company_name: 'Google',
            position: 'Senior Software Engineer',
            location: 'Bangalore, India',
            start_date: '2023-06-01',
            end_date: null,
            is_current: true,
            description: 'Working on Google Search infrastructure, focusing on performance optimization and scalability. Leading a team of 5 engineers to develop new search algorithms.'
          },
          {
            company_name: 'Microsoft',
            position: 'Software Engineer II',
            location: 'Hyderabad, India',
            start_date: '2021-07-01',
            end_date: '2023-05-31',
            is_current: false,
            description: 'Developed features for Microsoft Azure platform. Worked on cloud computing solutions and microservices architecture.'
          }
        ]
      },
      // Priya Patel (Microsoft)
      {
        alumni_id: alumni.find(a => a.first_name === 'Priya')?.id,
        experiences: [
          {
            company_name: 'Microsoft',
            position: 'Principal Software Engineer',
            location: 'Seattle, USA',
            start_date: '2022-08-01',
            end_date: null,
            is_current: true,
            description: 'Leading AI/ML initiatives for Microsoft Office suite. Managing a cross-functional team to integrate machine learning capabilities into productivity applications.'
          },
          {
            company_name: 'Amazon',
            position: 'Software Development Engineer',
            location: 'Seattle, USA',
            start_date: '2020-09-01',
            end_date: '2022-07-31',
            is_current: false,
            description: 'Worked on AWS Lambda and serverless computing platform. Developed tools for automated scaling and resource management.'
          }
        ]
      },
      // Amit Kumar (Amazon)
      {
        alumni_id: alumni.find(a => a.first_name === 'Amit')?.id,
        experiences: [
          {
            company_name: 'Amazon',
            position: 'Senior SDE',
            location: 'Bangalore, India',
            start_date: '2023-03-01',
            end_date: null,
            is_current: true,
            description: 'Working on Amazon Prime Video backend systems. Responsible for content delivery optimization and streaming quality improvements.'
          },
          {
            company_name: 'Flipkart',
            position: 'Software Engineer',
            location: 'Bangalore, India',
            start_date: '2021-06-01',
            end_date: '2023-02-28',
            is_current: false,
            description: 'Developed e-commerce platform features for Flipkart marketplace. Worked on payment systems and order management.'
          }
        ]
      },
      // Sneha Gupta (Flipkart)
      {
        alumni_id: alumni.find(a => a.first_name === 'Sneha')?.id,
        experiences: [
          {
            company_name: 'Flipkart',
            position: 'Senior Software Engineer',
            location: 'Bangalore, India',
            start_date: '2022-09-01',
            end_date: null,
            is_current: true,
            description: 'Leading the mobile app development team for Flipkart. Focus on improving user experience and app performance optimization.'
          },
          {
            company_name: 'PayTM',
            position: 'Software Engineer',
            location: 'Noida, India',
            start_date: '2020-08-01',
            end_date: '2022-08-31',
            is_current: false,
            description: 'Worked on digital payment solutions and wallet features. Developed secure transaction processing systems.'
          }
        ]
      },
      // Vikash Singh (Tesla)
      {
        alumni_id: alumni.find(a => a.first_name === 'Vikash')?.id,
        experiences: [
          {
            company_name: 'Tesla',
            position: 'Software Engineer',
            location: 'Austin, USA',
            start_date: '2023-01-01',
            end_date: null,
            is_current: true,
            description: 'Working on Tesla Autopilot software development. Contributing to computer vision algorithms for autonomous driving features.'
          },
          {
            company_name: 'Intel',
            position: 'Hardware Engineer',
            location: 'Bangalore, India',
            start_date: '2021-08-01',
            end_date: '2022-12-31',
            is_current: false,
            description: 'Designed and optimized processor architectures. Worked on power efficiency improvements for mobile processors.'
          }
        ]
      }
    ];

    // Insert work experiences
    for (const person of workExperiences) {
      if (!person.alumni_id) {
        console.log(`Skipping work experience for alumni not found`);
        continue;
      }

      for (const exp of person.experiences) {
        const insertQuery = `
          INSERT INTO work_experiences (
            alumni_id, company_name, position, location, 
            start_date, end_date, is_current, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        
        await query(insertQuery, [
          person.alumni_id,
          exp.company_name,
          exp.position,
          exp.location,
          exp.start_date,
          exp.end_date,
          exp.is_current,
          exp.description
        ]);
      }
    }

    console.log('✅ Work experience data seeded successfully!');
    console.log(`Added work experiences for ${workExperiences.length} alumni`);

  } catch (error) {
    console.error('❌ Error seeding work experience data:', error);
  } finally {
    process.exit(0);
  }
}

seedWorkExperience();
