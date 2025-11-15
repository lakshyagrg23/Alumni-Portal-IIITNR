require('dotenv').config({ path: '.env' });
const queries = require('./src/utils/reportQueries');

async function test() {
    try {
        console.log('Testing Contributions Query...');
        const contrib = await queries.getContributionsSummary({ limit: 5 });
        console.log('✓ Contributions:', {
            count: contrib.contributions.length,
            summary: contrib.summary.length
        });
        if (contrib.contributions.length > 0) {
            console.log('  Sample:', {
                type: contrib.contributions[0].contribution_type,
                title: contrib.contributions[0].title
            });
        }
        
        console.log('\nTesting Achievements Query...');
        const achieve = await queries.getAchievementsSummary({ limit: 5 });
        console.log('✓ Achievements:', {
            count: achieve.achievements.length,
            summary: achieve.summary.length
        });
        if (achieve.achievements.length > 0) {
            console.log('  Sample:', {
                type: achieve.achievements[0].achievement_type,
                title: achieve.achievements[0].title
            });
        }
        
        console.log('\n✓ All queries successful!');
        process.exit(0);
    } catch (err) {
        console.error('✗ Error:', err.message);
        process.exit(1);
    }
}

test();
