import 'dotenv/config';
import { query } from './src/config/database.js';

async function seedNewsData() {
  try {
    console.log('🌱 Seeding news data...');

    // First, create some test users to use as authors
    const testUsers = [
      {
        email: 'admin@iiitnr.edu.in',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      },
      {
        email: 'editor@iiitnr.edu.in',
        firstName: 'News',
        lastName: 'Editor',
        role: 'admin'
      },
      {
        email: 'author@iiitnr.edu.in',
        firstName: 'Content',
        lastName: 'Author',
        role: 'admin'
      }
    ];

    // Insert test users if they don't exist
    const userIds = [];
    for (const user of testUsers) {
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [user.email]);
      if (existingUser.rows.length === 0) {
        const userResult = await query(
          'INSERT INTO users (email, role, is_approved, email_verified) VALUES ($1, $2, true, true) RETURNING id',
          [user.email, user.role]
        );
        const userId = userResult.rows[0].id;
        
        // Create alumni profile for this user
        await query(
          'INSERT INTO alumni_profiles (user_id, first_name, last_name) VALUES ($1, $2, $3)',
          [userId, user.firstName, user.lastName]
        );
        
        userIds.push(userId);
        console.log(`Created test user: ${user.email}`);
      } else {
        userIds.push(existingUser.rows[0].id);
        console.log(`Using existing user: ${user.email}`);
      }
    }

    // Sample news articles
    const newsArticles = [
      {
        title: 'IIIT Naya Raipur Alumni Secures $2M Series A Funding for Tech Startup',
        content: `
          <p>We are proud to announce that Rahul Sharma (B.Tech CSE 2020), co-founder and CTO of InnovateTech Solutions, has successfully raised $2 million in Series A funding for his artificial intelligence startup.</p>
          
          <p>InnovateTech Solutions, founded in 2022, specializes in developing AI-powered solutions for healthcare diagnostics. The company's flagship product uses machine learning algorithms to detect early signs of cardiovascular diseases with 95% accuracy.</p>
          
          <p>"The education and foundation I received at IIIT Naya Raipur played a crucial role in shaping my technical skills and entrepreneurial mindset," said Rahul. "The supportive faculty and collaborative environment helped me think beyond traditional boundaries."</p>
          
          <p>The funding round was led by TechVentures Capital with participation from several angel investors, including other IIIT NR alumni. The company plans to use the funding to expand their research team and scale their product offerings.</p>
          
          <p>This achievement highlights the growing impact of IIIT Naya Raipur alumni in the startup ecosystem and their contribution to solving real-world problems through technology.</p>
        `,
        excerpt: 'IIIT NR alumnus Rahul Sharma raises $2M Series A funding for his AI healthcare startup, showcasing the entrepreneurial spirit of our graduates.',
        featured_image_url: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        author_id: userIds[0],
        category: 'achievement',
        tags: ['startup', 'funding', 'AI', 'healthcare', 'alumni-success'],
        is_published: true,
        is_featured: true,
        published_at: new Date('2024-12-15')
      },
      {
        title: 'IIIT NR Launches New Industry Partnership Program with Leading Tech Companies',
        content: `
          <p>IIIT Naya Raipur is excited to announce the launch of its Industry Partnership Program, designed to strengthen ties between academia and industry while providing students with real-world experience.</p>
          
          <p>The program has secured partnerships with leading technology companies including Microsoft, Google, Amazon, and Flipkart. These partnerships will offer students opportunities for internships, research projects, and direct placement opportunities.</p>
          
          <p>Key features of the program include:</p>
          <ul>
            <li>Industry-mentored capstone projects</li>
            <li>Regular guest lectures by industry experts</li>
            <li>Collaborative research initiatives</li>
            <li>Fast-track placement processes</li>
            <li>Alumni mentorship networks</li>
          </ul>
          
          <p>Dr. Rajesh Kumar, Director of IIIT Naya Raipur, stated, "This program represents our commitment to ensuring our students are industry-ready and equipped with the latest skills demanded by the technology sector."</p>
          
          <p>The program will commence from the Spring 2024 semester and is expected to benefit over 500 students across all branches.</p>
        `,
        excerpt: 'IIIT NR partners with Microsoft, Google, Amazon, and Flipkart to launch comprehensive Industry Partnership Program for enhanced student opportunities.',
        featured_image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        author_id: userIds[1],
        category: 'announcement',
        tags: ['partnerships', 'industry', 'students', 'placements', 'program-launch'],
        is_published: true,
        is_featured: true,
        published_at: new Date('2024-12-10')
      },
      {
        title: 'Alumni Spotlight: Priya Patel Leading AI Research at Microsoft',
        content: `
          <p>This month, we spotlight Priya Patel (M.Tech CSE 2019), who is making significant contributions to artificial intelligence research at Microsoft's Redmond campus.</p>
          
          <p>As a Principal Research Scientist in Microsoft's AI division, Priya leads a team working on natural language processing and machine learning models. Her recent work on transformer architectures has been published in top-tier conferences including NeurIPS and ICML.</p>
          
          <p>"My journey at IIIT Naya Raipur was transformative," reflects Priya. "The research-oriented curriculum and the guidance from faculty members like Dr. Sarah Johnson helped me develop a strong foundation in computer science fundamentals."</p>
          
          <p>Priya's notable achievements include:</p>
          <ul>
            <li>Lead author on 15+ peer-reviewed papers</li>
            <li>Recipient of Microsoft's Excellence in Research Award 2023</li>
            <li>Keynote speaker at International AI Conference 2024</li>
            <li>Mentor to 20+ junior researchers and interns</li>
          </ul>
          
          <p>She continues to maintain strong connections with IIIT NR, regularly mentoring current students and offering research collaboration opportunities.</p>
        `,
        excerpt: 'Meet Priya Patel, IIIT NR alumna leading groundbreaking AI research at Microsoft and inspiring the next generation of researchers.',
        featured_image_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        author_id: userIds[0],
        category: 'alumni-spotlight',
        tags: ['alumni-spotlight', 'research', 'Microsoft', 'AI', 'women-in-tech'],
        is_published: true,
        is_featured: false,
        published_at: new Date('2024-12-08')
      },
      {
        title: 'Record Placement Season: 95% Students Placed with Average Package of 12 LPA',
        content: `
          <p>IIIT Naya Raipur celebrates another successful placement season with 95% of eligible students securing job offers, marking the highest placement percentage in the institute's history.</p>
          
          <p>The placement statistics for the academic year 2023-24 are impressive:</p>
          <ul>
            <li>Overall placement percentage: 95%</li>
            <li>Average package: ₹12 LPA</li>
            <li>Highest package: ₹45 LPA (offered by Google)</li>
            <li>Companies participated: 120+</li>
            <li>Total offers made: 350+</li>
          </ul>
          
          <p>Top recruiting companies included Google, Microsoft, Amazon, Flipkart, Goldman Sachs, and many other leading technology and finance companies.</p>
          
          <p>The Computer Science and Electronics branches saw particularly strong performance, with average packages exceeding ₹15 LPA. The placement committee, led by Prof. Amit Sharma, worked tirelessly to ensure maximum opportunities for all students.</p>
          
          <p>"These results reflect the quality of education and the industry readiness of our students," said the Director. "We're proud of our students' achievements and grateful to our industry partners for their continued trust."</p>
        `,
        excerpt: 'IIIT NR achieves record 95% placement rate with average package of 12 LPA, showcasing excellent industry demand for our graduates.',
        featured_image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        author_id: userIds[2],
        category: 'achievement',
        tags: ['placements', 'statistics', 'success', 'students', 'companies'],
        is_published: true,
        is_featured: true,
        published_at: new Date('2024-12-05')
      },
      {
        title: 'Research Paper by IIIT NR Team Accepted at International Conference',
        content: `
          <p>A research team from IIIT Naya Raipur, led by Dr. Anjali Mehta and including two PhD students, has had their paper accepted at the prestigious International Conference on Computer Vision (ICCV) 2024.</p>
          
          <p>The paper, titled "Novel Approaches to Real-time Object Detection in Autonomous Vehicles," presents innovative algorithms that improve object detection accuracy by 23% while reducing computational requirements by 40%.</p>
          
          <p>The research addresses critical challenges in autonomous vehicle technology, particularly in complex urban environments with varying lighting conditions and multiple object classes.</p>
          
          <p>PhD students Vikash Singh and Ananya Rao were the primary contributors to this research, working under the guidance of Dr. Mehta over the past two years.</p>
          
          <p>"This acceptance at ICCV validates the quality of research being conducted at IIIT NR," said Dr. Mehta. "Our students have demonstrated exceptional dedication and innovation in tackling real-world problems."</p>
          
          <p>The team will present their work at the conference in October 2024, representing India among the world's top computer vision researchers.</p>
        `,
        excerpt: 'IIIT NR research team\'s breakthrough paper on autonomous vehicle object detection accepted at prestigious ICCV 2024 conference.',
        featured_image_url: 'https://images.unsplash.com/photo-1581093458791-9f3c3250e8fc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        author_id: userIds[1],
        category: 'research',
        tags: ['research', 'computer-vision', 'autonomous-vehicles', 'ICCV', 'publication'],
        is_published: true,
        is_featured: false,
        published_at: new Date('2024-12-03')
      },
      {
        title: 'Annual Alumni Meet 2024: Reconnecting Generations of Innovation',
        content: `
          <p>IIIT Naya Raipur's Annual Alumni Meet 2024 brought together over 200 alumni from across the globe, celebrating the institute's growing legacy and fostering connections across different graduating batches.</p>
          
          <p>The three-day event, held from November 15-17, featured panel discussions, technical workshops, cultural programs, and networking sessions.</p>
          
          <p>Highlights of the event included:</p>
          <ul>
            <li>Keynote by Raj Gupta (2018 batch), VP Engineering at Netflix</li>
            <li>Panel discussion on "Future of Technology and Career Paths"</li>
            <li>Alumni startup showcase featuring 12 ventures</li>
            <li>Cultural night celebrating IIIT NR traditions</li>
            <li>Campus tour showcasing new facilities</li>
          </ul>
          
          <p>The event also served as a platform to announce the establishment of the IIIT NR Alumni Scholarship Fund, which will support underprivileged students in pursuing their education.</p>
          
          <p>"Events like these strengthen our alumni network and create opportunities for mentorship and collaboration," noted the Alumni Relations Office.</p>
        `,
        excerpt: 'Over 200 alumni gathered for the Annual Alumni Meet 2024, celebrating achievements and launching new scholarship initiatives.',
        featured_image_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        author_id: userIds[0],
        category: 'event',
        tags: ['alumni-meet', 'networking', 'scholarship', 'reunion', 'community'],
        is_published: true,
        is_featured: false,
        published_at: new Date('2024-11-20')
      },
      {
        title: 'New State-of-the-Art Research Labs Inaugurated at IIIT NR',
        content: `
          <p>IIIT Naya Raipur inaugurated three new research laboratories equipped with cutting-edge technology to support advanced research in artificial intelligence, cybersecurity, and quantum computing.</p>
          
          <p>The new facilities include:</p>
          <ul>
            <li><strong>AI Research Lab:</strong> High-performance GPU clusters for deep learning research</li>
            <li><strong>Cybersecurity Lab:</strong> Advanced network simulation and penetration testing equipment</li>
            <li><strong>Quantum Computing Lab:</strong> Access to cloud-based quantum processors and simulation tools</li>
          </ul>
          
          <p>The labs were inaugurated by Dr. K. Radhakrishnan, former Chairman of ISRO, who praised the institute's commitment to fostering innovation and research excellence.</p>
          
          <p>These facilities will support ongoing research projects worth over ₹5 crores, funded by various government agencies and industry partners.</p>
          
          <p>"These labs represent our vision of positioning IIIT NR as a leading research institution in emerging technologies," said the Director during the inauguration ceremony.</p>
        `,
        excerpt: 'IIIT NR inaugurates advanced research labs for AI, cybersecurity, and quantum computing, boosting research capabilities significantly.',
        featured_image_url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        author_id: userIds[2],
        category: 'announcement',
        tags: ['research-labs', 'infrastructure', 'AI', 'cybersecurity', 'quantum-computing'],
        is_published: true,
        is_featured: false,
        published_at: new Date('2024-11-15')
      },
      {
        title: 'Student Team Wins National Hackathon with Healthcare Innovation',
        content: `
          <p>A team of four students from IIIT Naya Raipur emerged victorious at the National Healthcare Innovation Hackathon, winning ₹2 lakh prize money for their groundbreaking telemedicine solution.</p>
          
          <p>The winning team, consisting of Arjun Patel, Shruti Sharma, Karan Singh, and Meera Joshi (all from CSE final year), developed "HealthConnect" - a comprehensive telemedicine platform that bridges the gap between rural patients and urban healthcare specialists.</p>
          
          <p>Key features of their solution include:</p>
          <ul>
            <li>Real-time video consultations with AI-powered preliminary diagnosis</li>
            <li>Integration with local healthcare workers and clinics</li>
            <li>Multi-language support for better accessibility</li>
            <li>Offline functionality for areas with poor connectivity</li>
            <li>Emergency alert system for critical cases</li>
          </ul>
          
          <p>The hackathon, organized by the Ministry of Health and Family Welfare, saw participation from over 500 teams from across India.</p>
          
          <p>"This victory showcases the problem-solving capabilities and social consciousness of our students," commented Prof. Lisa Anderson, Head of CSE Department.</p>
        `,
        excerpt: 'IIIT NR students win National Healthcare Hackathon with innovative telemedicine solution, earning ₹2 lakh prize and recognition.',
        featured_image_url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        author_id: userIds[1],
        category: 'achievement',
        tags: ['hackathon', 'students', 'healthcare', 'innovation', 'telemedicine'],
        is_published: true,
        is_featured: false,
        published_at: new Date('2024-11-10')
      }
    ];

    // Insert news articles
    for (const article of newsArticles) {
      const insertQuery = `
        INSERT INTO news (
          title, content, excerpt, featured_image_url, author_id,
          category, tags, is_published, is_featured, published_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      
      await query(insertQuery, [
        article.title,
        article.content,
        article.excerpt,
        article.featured_image_url,
        article.author_id,
        article.category,
        article.tags,
        article.is_published,
        article.is_featured,
        article.published_at
      ]);
    }

    console.log('✅ News data seeded successfully!');
    console.log(`Added ${newsArticles.length} news articles`);

  } catch (error) {
    console.error('❌ Error seeding news data:', error);
  } finally {
    process.exit(0);
  }
}

seedNewsData();
