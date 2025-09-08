require('dotenv').config();
const { query } = require('./src/utils/sqlHelpers');

/**
 * Seed events data for testing
 */
async function seedEvents() {
  try {
    console.log('🌱 Starting events seeding...');

    // Check if events already exist
    const existingEvents = await query('SELECT COUNT(*) as count FROM events');
    const eventCount = parseInt(existingEvents.rows[0].count);

    if (eventCount > 0) {
      console.log(`📊 Found ${eventCount} existing events. Clearing them...`);
      await query('DELETE FROM event_registrations');
      await query('DELETE FROM events');
      console.log('✅ Existing events cleared.');
    }

    // Get existing users for organizer IDs
    const users = await query('SELECT id, email FROM users ORDER BY created_at LIMIT 5');
    if (users.rows.length === 0) {
      console.log('❌ No users found. Please run user seeding first.');
      return;
    }

    const adminUser = users.rows[0]; // First user as admin
    const organizers = users.rows.slice(1); // Rest as potential organizers

    // Upcoming events data
    const upcomingEvents = [
      {
        title: 'React.js Advanced Workshop',
        description: `
          <p>Join us for an intensive React.js workshop covering advanced concepts including:</p>
          <ul>
            <li>React Hooks and Custom Hooks</li>
            <li>Context API and State Management</li>
            <li>Performance Optimization</li>
            <li>Testing React Applications</li>
            <li>Building Production-Ready Apps</li>
          </ul>
          <p>This workshop is perfect for developers with basic React knowledge looking to advance their skills.</p>
        `,
        event_type: 'workshop',
        mode: 'hybrid',
        location: 'IIIT-NR Lab 301 & Online via Zoom',
        start_datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        end_datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
        registration_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        max_participants: 30,
        current_participants: 0,
        required_skills: ['JavaScript', 'Basic React', 'HTML/CSS'],
        experience_level: 'intermediate',
        agenda: `
          09:00 - 09:30: Registration and Welcome
          09:30 - 11:00: Advanced React Hooks
          11:00 - 11:15: Break
          11:15 - 12:30: Context API Deep Dive
          12:30 - 13:30: Lunch Break
          13:30 - 15:00: Performance Optimization
          15:00 - 15:15: Break
          15:15 - 16:30: Testing and Best Practices
          16:30 - 17:00: Q&A and Wrap-up
        `,
        requirements: 'Laptop with Node.js installed, Basic React knowledge, GitHub account',
        benefits: 'Certificate of completion, Project templates, Career guidance, Networking opportunities',
        contact_email: 'workshops@iiitnr.edu.in',
        contact_phone: '+91-123-456-7890',
        organizer_id: adminUser.id,
        organizer_name: 'IIIT-NR Tech Team',
        status: 'upcoming',
        is_published: true,
        requires_approval: true
      },
      {
        title: 'Career Transition in Tech - Alumni Webinar',
        description: `
          <p>Learn from successful IIIT-NR alumni who have made significant career transitions in the tech industry.</p>
          <p>Our panel includes:</p>
          <ul>
            <li>Software Engineer to Product Manager</li>
            <li>Developer to Startup Founder</li>
            <li>Technical Lead to Engineering Manager</li>
            <li>Academic Researcher to Industry Expert</li>
          </ul>
          <p>Get insights on career planning, skill development, and navigating the tech industry.</p>
        `,
        event_type: 'webinar',
        mode: 'online',
        location: 'Zoom Meeting (Link will be shared)',
        start_datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        end_datetime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        registration_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        max_participants: 100,
        current_participants: 0,
        required_skills: [],
        experience_level: 'all',
        agenda: `
          18:00 - 18:10: Welcome and Introductions
          18:10 - 18:50: Alumni Panel Discussion
          18:50 - 19:20: Q&A Session
          19:20 - 19:30: Networking and Closing
        `,
        requirements: 'Stable internet connection, Zoom app installed',
        benefits: 'Career insights, Networking opportunities, Recording access, Resource links',
        contact_email: 'alumni@iiitnr.edu.in',
        contact_phone: '+91-123-456-7891',
        organizer_id: organizers[0]?.id || adminUser.id,
        organizer_name: 'Alumni Relations Team',
        status: 'upcoming',
        is_published: true,
        requires_approval: false
      },
      {
        title: 'Student Mentorship Program - Call for Volunteers',
        description: `
          <p>Join our comprehensive mentorship program and help current students succeed in their academic and career journey.</p>
          <p>As a mentor, you will:</p>
          <ul>
            <li>Guide students in career planning and decision making</li>
            <li>Share industry insights and real-world experience</li>
            <li>Help with technical skill development</li>
            <li>Provide networking opportunities</li>
            <li>Support personal and professional growth</li>
          </ul>
          <p>This is a 6-month commitment with flexible time requirements (2-3 hours per month).</p>
        `,
        event_type: 'volunteer',
        mode: 'hybrid',
        location: 'IIIT-NR Campus & Online Sessions',
        start_datetime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        end_datetime: new Date(Date.now() + 194 * 24 * 60 * 60 * 1000), // 6 months later
        registration_deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        max_participants: 20,
        current_participants: 0,
        required_skills: ['Leadership', 'Communication', 'Industry Experience'],
        experience_level: 'intermediate',
        agenda: `
          Program Timeline:
          Week 1-2: Mentor Orientation and Training
          Week 3: Mentor-Mentee Matching
          Month 1-6: Regular Mentoring Sessions
          Month 6: Program Evaluation and Feedback
        `,
        requirements: 'Minimum 2 years industry experience, Good communication skills, Commitment to 6-month program',
        benefits: 'Certificate of appreciation, LinkedIn recognition, Networking with faculty, Impact on student lives',
        contact_email: 'mentorship@iiitnr.edu.in',
        contact_phone: '+91-123-456-7892',
        organizer_id: organizers[1]?.id || adminUser.id,
        organizer_name: 'Student Affairs Office',
        status: 'upcoming',
        is_published: true,
        requires_approval: true
      },
      {
        title: 'Bangalore Alumni Meetup 2025',
        description: `
          <p>Join fellow IIIT-NR alumni in Bangalore for our annual networking meetup!</p>
          <p>Event highlights:</p>
          <ul>
            <li>Welcome dinner and networking session</li>
            <li>Alumni achievement recognition</li>
            <li>Tech talks by industry leaders</li>
            <li>Career opportunities discussion</li>
            <li>Fun activities and games</li>
            <li>Group photo and memories</li>
          </ul>
          <p>Bring your family! We have arrangements for spouses and children.</p>
        `,
        event_type: 'meetup',
        mode: 'offline',
        location: 'Hotel Taj Bangalore, MG Road, Bangalore',
        start_datetime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
        end_datetime: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 6 hours later
        registration_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        max_participants: 50,
        current_participants: 0,
        required_skills: [],
        experience_level: 'all',
        agenda: `
          14:00 - 15:00: Registration and Welcome Drinks
          15:00 - 16:00: Alumni Achievement Awards
          16:00 - 17:00: Tech Talks and Industry Updates
          17:00 - 18:00: Networking and Career Discussions
          18:00 - 19:00: Cultural Program
          19:00 - 20:00: Dinner and Socializing
        `,
        requirements: 'Valid ID for hotel entry, Business cards for networking (optional)',
        benefits: 'Networking opportunities, Industry insights, Recognition, Free dinner, Group photos',
        contact_email: 'bangalore@iiitnr.edu.in',
        contact_phone: '+91-987-654-3210',
        organizer_id: organizers[2]?.id || adminUser.id,
        organizer_name: 'Bangalore Alumni Chapter',
        status: 'upcoming',
        is_published: true,
        requires_approval: false
      }
    ];

    // Past events data
    const pastEvents = [
      {
        title: 'Machine Learning Workshop - Completed',
        description: `
          <p>A comprehensive workshop on Machine Learning fundamentals and applications that was successfully conducted last month.</p>
          <p>Topics covered:</p>
          <ul>
            <li>Introduction to ML algorithms</li>
            <li>Data preprocessing and feature engineering</li>
            <li>Supervised and unsupervised learning</li>
            <li>Model evaluation and deployment</li>
            <li>Hands-on projects with real datasets</li>
          </ul>
          <p>The workshop received excellent feedback from participants with an average rating of 4.7/5.</p>
        `,
        event_type: 'workshop',
        mode: 'hybrid',
        location: 'IIIT-NR Lab 202 & Online',
        start_datetime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end_datetime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000), // 6 hours later
        registration_deadline: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
        max_participants: 25,
        current_participants: 23,
        required_skills: ['Python', 'Mathematics', 'Statistics'],
        experience_level: 'intermediate',
        agenda: 'Completed workshop with hands-on ML projects',
        requirements: 'Python knowledge, Jupyter notebook setup',
        benefits: 'Certificate, Project templates, Industry connections',
        contact_email: 'ml-workshop@iiitnr.edu.in',
        contact_phone: '+91-123-456-7893',
        organizer_id: adminUser.id,
        organizer_name: 'Data Science Club',
        status: 'completed',
        is_published: true,
        requires_approval: true
      },
      {
        title: 'Alumni Success Stories - Webinar Series',
        description: `
          <p>A successful webinar series featuring IIIT-NR alumni sharing their career journey and achievements.</p>
          <p>Featured speakers:</p>
          <ul>
            <li>Priya Sharma - Senior Software Engineer at Google</li>
            <li>Rahul Gupta - Founder of EduTech Startup</li>
            <li>Anita Verma - Data Scientist at Microsoft</li>
            <li>Vikash Kumar - Product Manager at Amazon</li>
          </ul>
          <p>Over 200 students and alumni attended across three sessions.</p>
        `,
        event_type: 'webinar',
        mode: 'online',
        location: 'Zoom Webinar Platform',
        start_datetime: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        end_datetime: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours later
        registration_deadline: new Date(Date.now() - 48 * 24 * 60 * 60 * 1000), // 48 days ago
        max_participants: 200,
        current_participants: 187,
        required_skills: [],
        experience_level: 'all',
        agenda: 'Three-part webinar series on career success',
        requirements: 'Internet connection, Zoom app',
        benefits: 'Career inspiration, Networking, Recording access',
        contact_email: 'success-stories@iiitnr.edu.in',
        contact_phone: '+91-123-456-7894',
        organizer_id: organizers[0]?.id || adminUser.id,
        organizer_name: 'Career Services',
        status: 'completed',
        is_published: true,
        requires_approval: false
      },
      {
        title: 'Campus Cleanup Volunteer Drive',
        description: `
          <p>A successful community service initiative where alumni and students came together to beautify the campus.</p>
          <p>Activities completed:</p>
          <ul>
            <li>Cleaning of campus gardens and common areas</li>
            <li>Planting new trees and flowers</li>
            <li>Organizing library and lab spaces</li>
            <li>Creating eco-friendly awareness boards</li>
            <li>Setting up recycling stations</li>
          </ul>
          <p>Thanks to all 35 volunteers who participated and made the campus greener!</p>
        `,
        event_type: 'volunteer',
        mode: 'offline',
        location: 'IIIT-NR Campus',
        start_datetime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        end_datetime: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // 4 hours later
        registration_deadline: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000), // 65 days ago
        max_participants: 40,
        current_participants: 35,
        required_skills: [],
        experience_level: 'all',
        agenda: 'Campus beautification and environmental awareness',
        requirements: 'Comfortable clothes, water bottle, enthusiasm',
        benefits: 'Community service certificate, Team building, Environmental impact',
        contact_email: 'green-campus@iiitnr.edu.in',
        contact_phone: '+91-123-456-7895',
        organizer_id: organizers[1]?.id || adminUser.id,
        organizer_name: 'Green Campus Initiative',
        status: 'completed',
        is_published: true,
        requires_approval: false
      }
    ];

    // Insert upcoming events
    console.log('📅 Inserting upcoming events...');
    for (const eventData of upcomingEvents) {
      const query_text = `
        INSERT INTO events (
          title, description, event_type, mode, location, start_datetime, end_datetime,
          registration_deadline, max_participants, current_participants, required_skills,
          experience_level, agenda, requirements, benefits, contact_email, contact_phone,
          organizer_id, organizer_name, status, is_published, requires_approval
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING id, title
      `;

      const values = [
        eventData.title, eventData.description, eventData.event_type, eventData.mode,
        eventData.location, eventData.start_datetime, eventData.end_datetime,
        eventData.registration_deadline, eventData.max_participants, eventData.current_participants,
        eventData.required_skills, eventData.experience_level, eventData.agenda,
        eventData.requirements, eventData.benefits, eventData.contact_email,
        eventData.contact_phone, eventData.organizer_id, eventData.organizer_name,
        eventData.status, eventData.is_published, eventData.requires_approval
      ];

      const result = await query(query_text, values);
      console.log(`  ✅ Created upcoming event: ${result.rows[0].title}`);
    }

    // Insert past events
    console.log('📚 Inserting past events...');
    for (const eventData of pastEvents) {
      const query_text = `
        INSERT INTO events (
          title, description, event_type, mode, location, start_datetime, end_datetime,
          registration_deadline, max_participants, current_participants, required_skills,
          experience_level, agenda, requirements, benefits, contact_email, contact_phone,
          organizer_id, organizer_name, status, is_published, requires_approval
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING id, title
      `;

      const values = [
        eventData.title, eventData.description, eventData.event_type, eventData.mode,
        eventData.location, eventData.start_datetime, eventData.end_datetime,
        eventData.registration_deadline, eventData.max_participants, eventData.current_participants,
        eventData.required_skills, eventData.experience_level, eventData.agenda,
        eventData.requirements, eventData.benefits, eventData.contact_email,
        eventData.contact_phone, eventData.organizer_id, eventData.organizer_name,
        eventData.status, eventData.is_published, eventData.requires_approval
      ];

      const result = await query(query_text, values);
      console.log(`  ✅ Created past event: ${result.rows[0].title}`);
    }

    // Get final count
    const finalCount = await query('SELECT COUNT(*) as count FROM events');
    const totalEvents = parseInt(finalCount.rows[0].count);

    console.log(`\n🎉 Events seeding completed!`);
    console.log(`📊 Total events created: ${totalEvents}`);
    console.log(`📅 Upcoming events: ${upcomingEvents.length}`);
    console.log(`📚 Past events: ${pastEvents.length}`);
    console.log(`\n✨ Events are ready for testing!`);

  } catch (error) {
    console.error('❌ Error seeding events:', error);
    throw error;
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  seedEvents()
    .then(() => {
      console.log('🏁 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedEvents };
