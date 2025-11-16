/**
 * Export Utilities for Accreditation Reports
 * Handles CSV and JSON exports
 */

import { Parser } from 'json2csv';

/**
 * Convert data to CSV format
 */
function toCSV(data, fields = null) {
    try {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('No data provided for CSV export');
        }
        
        // If fields not specified, use all keys from first object
        const csvFields = fields || Object.keys(data[0]);
        
        const json2csvParser = new Parser({ fields: csvFields });
        const csv = json2csvParser.parse(data);
        
        return csv;
    } catch (error) {
        throw new Error(`CSV conversion error: ${error.message}`);
    }
}

/**
 * Format placement data for export
 */
function formatPlacementForExport(placements) {
    return placements.map(p => ({
        'Student ID': p.student_id || 'N/A',
        'Alumni Name': p.is_anonymous ? 'Anonymous' : `${p.first_name} ${p.last_name}`,
        'Program': p.program,
        'Department': p.department,
        'Graduation Year': p.graduation_year,
        'Company': p.show_company ? p.company_name : 'Confidential',
        'Job Title': p.job_title,
        'Job Location': p.job_location,
        'Job Type': p.job_type,
        'Salary Package (LPA)': p.show_salary ? p.salary_package : 'N/A',
        'Industry': p.industry_sector,
        'Company Type': p.company_type,
        'Placement Type': p.placement_type,
        'Placement Year': p.placement_year,
        'CGPA': p.cgpa,
        'Verification Status': p.verification_status
    }));
}

/**
 * Format higher education data for export
 */
function formatHigherEducationForExport(data) {
    return data.map(h => ({
        'Student ID': h.student_id || 'N/A',
        'Alumni Name': `${h.first_name} ${h.last_name}`,
        'UG Program': h.ug_program,
        'UG Department': h.ug_department,
        'UG Graduation Year': h.ug_graduation_year,
        'UG CGPA': h.ug_cgpa,
        'Institution': h.institution_name,
        'Country': h.institution_country,
        'Program Level': h.program_level,
        'Program Name': h.program_name,
        'Field of Study': h.field_of_study,
        'Admission Year': h.admission_year,
        'Status': h.status,
        'Funding Type': h.funding_type,
        'Institution Ranking': h.institution_ranking || 'N/A',
        'Verification Status': h.verification_status
    }));
}

/**
 * Format contributions for export
 */
function formatContributionsForExport(contributions) {
    return contributions.map(c => ({
        'Alumni Name': `${c.first_name} ${c.last_name}`,
        'Graduation Year': c.graduation_year,
        'Program': c.program,
        'Contribution Type': c.type,
        'Title': c.title,
        'Description': c.description,
        'Organization': c.organization,
        'Amount (INR)': c.amount || 'N/A',
        'Contribution Date': c.contribution_date,
        'Academic Year': c.academic_year,
        'Students Impacted': c.students_impacted || 'N/A',
        'Duration (Hours)': c.duration_hours || 'N/A',
        'Verification Status': c.verification_status
    }));
}

/**
 * Format achievements for export
 */
function formatAchievementsForExport(achievements) {
    return achievements.map(a => ({
        'Alumni Name': `${a.first_name} ${a.last_name}`,
        'Graduation Year': a.graduation_year,
        'Program': a.program,
        'Achievement Type': a.type,
        'Title': a.title,
        'Description': a.description,
        'Organization': a.organization,
        'Achievement Date': a.achievement_date,
        'Recognition Level': a.recognition_level,
        'Years After Graduation': a.years_after_graduation,
        'Verification Status': a.verification_status
    }));
}

/**
 * Generate NAAC format data
 * NAAC Criterion 5: Student Support and Progression
 */
function generateNAACFormat(data) {
    const { overview, placements, higherEducation, contributions, achievements } = data;
    
    return {
        'Criterion 5.2': {
            'Metric 5.2.1': {
                name: 'Percentage of placement of outgoing students',
                data: {
                    totalStudents: overview.total_alumni,
                    studentsPlaced: overview.employed_count,
                    placementPercentage: overview.placement_rate,
                    academicYear: data.academicYear || '2024-25'
                }
            },
            'Metric 5.2.2': {
                name: 'Percentage of students progressing to higher education',
                data: {
                    totalStudents: overview.total_alumni,
                    higherEducation: overview.higher_studies_count,
                    higherEducationPercentage: overview.higher_studies_rate,
                    academicYear: data.academicYear || '2024-25'
                }
            },
            'Metric 5.2.3': {
                name: 'Average median salary',
                data: {
                    averageSalary: placements.avg_salary,
                    numberOfStudents: placements.placed_count,
                    academicYear: data.academicYear || '2024-25'
                }
            }
        },
        'Criterion 5.3': {
            'Metric 5.3.1': {
                name: 'Number of awards/medals for outstanding performance',
                count: achievements.filter(a => a.type === 'award').length
            },
            'Metric 5.3.3': {
                name: 'Number of sports and cultural activities',
                count: data.events || 0
            }
        },
        generatedAt: new Date().toISOString(),
        institution: 'IIIT Naya Raipur'
    };
}

/**
 * Generate NIRF format data
 * NIRF: National Institutional Ranking Framework
 */
function generateNIRFFormat(data) {
    const { overview, placements, higherEducation, achievements } = data;
    
    return {
        'Graduating Students': {
            totalGraduated: overview.total_alumni,
            placedStudents: overview.employed_count,
            higherStudies: overview.higher_studies_count,
            entrepreneurs: overview.entrepreneur_count
        },
        'Placement Details': {
            medianSalary: placements.median_salary || placements.avg_salary,
            numberOfStudentsPlaced: placements.placed_count,
            numberOfRecruiters: placements.unique_companies
        },
        'Higher Education': {
            numberOfStudents: higherEducation.total_count,
            topUniversities: higherEducation.topInstitutions?.slice(0, 10) || []
        },
        'Research & Innovation': {
            patents: achievements.filter(a => a.type === 'patent').length,
            publications: achievements.filter(a => a.type === 'publication').length,
            startups: achievements.filter(a => a.type === 'startup_founded').length
        },
        academicYear: data.academicYear || '2024-25',
        generatedAt: new Date().toISOString(),
        institution: 'IIIT Naya Raipur'
    };
}

/**
 * Generate NBA format data (Program-specific)
 * NBA: National Board of Accreditation
 */
function generateNBAFormat(data, program) {
    const { overview, placements, higherEducation, achievements, programOutcomes } = data;
    
    return {
        programName: program,
        academicYear: data.academicYear || '2024-25',
        'PO Attainment': {
            'Graduate Employability': {
                totalStudents: programOutcomes.total_students,
                employedStudents: programOutcomes.placed_count,
                averageSalary: programOutcomes.avg_salary,
                placementPercentage: programOutcomes.placement_percentage
            },
            'Higher Education': {
                studentsAdmitted: programOutcomes.higher_ed_count,
                foreignUniversities: programOutcomes.foreign_admits,
                fundedAdmissions: programOutcomes.funded_admits,
                percentage: programOutcomes.higher_ed_percentage
            },
            'Entrepreneurship': {
                startupsInitiated: programOutcomes.entrepreneurs
            },
            'Research & Innovation': {
                patents: programOutcomes.patents,
                publications: programOutcomes.publications
            }
        },
        'Program Outcomes': {
            avgCGPA: programOutcomes.avg_cgpa,
            uniqueRecruiters: programOutcomes.unique_recruiters
        },
        generatedAt: new Date().toISOString(),
        institution: 'IIIT Naya Raipur'
    };
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-z0-9_-]/gi, '_')
        .replace(/_+/g, '_')
        .toLowerCase();
}

/**
 * Generate filename with timestamp
 */
function generateFilename(prefix, extension = 'csv') {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${sanitizeFilename(prefix)}_${timestamp}.${extension}`;
}

export default {
    toCSV,
    formatPlacementForExport,
    formatHigherEducationForExport,
    formatContributionsForExport,
    formatAchievementsForExport,
    generateNAACFormat,
    generateNIRFFormat,
    generateNBAFormat,
    sanitizeFilename,
    generateFilename
};
