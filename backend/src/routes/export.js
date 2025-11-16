/**
 * Export Routes for Accreditation Reports
 * Handles CSV, JSON, and formatted exports (NAAC/NIRF/NBA)
 */

import express from 'express';
const router = express.Router();
import { authenticate, requireAdmin } from '../middleware/auth.js';
import reportQueries from '../utils/reportQueries.js';
import exportHelpers from '../utils/exportHelpers.js';

// All export routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/reports/export/placements
 * Export placement data as CSV or JSON
 */
router.get('/placements', async (req, res, next) => {
    try {
        const format = req.query.format || 'csv';
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : undefined,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : undefined,
            program: req.query.program,
            department: req.query.department,
            limit: 10000 // Export all records (with reasonable limit)
        };
        
        const result = await reportQueries.getPlacementDetails(filters);
        const formattedData = exportHelpers.formatPlacementForExport(result.data);
        
        if (format === 'json') {
            res.json({
                success: true,
                data: formattedData,
                count: formattedData.length,
                filters,
                exportedAt: new Date().toISOString()
            });
        } else {
            // CSV export
            const csv = exportHelpers.toCSV(formattedData);
            const filename = exportHelpers.generateFilename('placements', 'csv');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csv);
        }
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/export/higher-education
 * Export higher education data as CSV or JSON
 */
router.get('/higher-education', async (req, res, next) => {
    try {
        const format = req.query.format || 'csv';
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : undefined,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : undefined,
            program: req.query.program,
            department: req.query.department,
            country: req.query.country,
            limit: 10000
        };
        
        const result = await reportQueries.getHigherEducationDetails(filters);
        const formattedData = exportHelpers.formatHigherEducationForExport(result.data);
        
        if (format === 'json') {
            res.json({
                success: true,
                data: formattedData,
                count: formattedData.length,
                filters,
                exportedAt: new Date().toISOString()
            });
        } else {
            const csv = exportHelpers.toCSV(formattedData);
            const filename = exportHelpers.generateFilename('higher_education', 'csv');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csv);
        }
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/export/contributions
 * Export alumni contributions as CSV or JSON
 */
router.get('/contributions', async (req, res, next) => {
    try {
        const format = req.query.format || 'csv';
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : undefined,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : undefined,
            type: req.query.type,
            limit: 10000
        };
        
        const result = await reportQueries.getContributionsSummary(filters);
        const formattedData = exportHelpers.formatContributionsForExport(result.contributions);
        
        if (format === 'json') {
            res.json({
                success: true,
                data: formattedData,
                summary: result.summary,
                count: formattedData.length,
                filters,
                exportedAt: new Date().toISOString()
            });
        } else {
            const csv = exportHelpers.toCSV(formattedData);
            const filename = exportHelpers.generateFilename('alumni_contributions', 'csv');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csv);
        }
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/export/achievements
 * Export alumni achievements as CSV or JSON
 */
router.get('/achievements', async (req, res, next) => {
    try {
        const format = req.query.format || 'csv';
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : undefined,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : undefined,
            type: req.query.type,
            recognitionLevel: req.query.recognitionLevel,
            limit: 10000
        };
        
        const result = await reportQueries.getAchievementsSummary(filters);
        const formattedData = exportHelpers.formatAchievementsForExport(result.achievements);
        
        if (format === 'json') {
            res.json({
                success: true,
                data: formattedData,
                summary: result.summary,
                count: formattedData.length,
                filters,
                exportedAt: new Date().toISOString()
            });
        } else {
            const csv = exportHelpers.toCSV(formattedData);
            const filename = exportHelpers.generateFilename('alumni_achievements', 'csv');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(csv);
        }
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/reports/export/naac
 * Generate NAAC-specific evidence package
 */
router.post('/naac', async (req, res, next) => {
    try {
        const { academicYear, startYear, endYear, program, department } = req.body;
        
        const filters = { startYear, endYear, program, department };
        
        // Fetch all required data in parallel
        const [overview, placements, higherEducation, contributions, achievements] = await Promise.all([
            reportQueries.getOverviewKPIs(filters),
            reportQueries.getPlacementTrends(filters),
            reportQueries.getHigherEducationStats(filters),
            reportQueries.getContributionsSummary({ ...filters, limit: 1000 }),
            reportQueries.getAchievementsSummary({ ...filters, limit: 1000 })
        ]);
        
        const naacData = exportHelpers.generateNAACFormat({
            overview,
            placements: placements[0] || {},
            higherEducation,
            contributions: contributions.contributions,
            achievements: achievements.achievements,
            academicYear
        });
        
        res.json({
            success: true,
            format: 'NAAC',
            data: naacData,
            exportedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/reports/export/nirf
 * Generate NIRF-specific data format
 */
router.post('/nirf', async (req, res, next) => {
    try {
        const { academicYear, startYear, endYear, program, department } = req.body;
        
        const filters = { startYear, endYear, program, department };
        
        // Fetch all required data in parallel
        const [overview, placementTrends, higherEducation, achievements] = await Promise.all([
            reportQueries.getOverviewKPIs(filters),
            reportQueries.getPlacementTrends(filters),
            reportQueries.getHigherEducationStats(filters),
            reportQueries.getAchievementsSummary({ ...filters, limit: 1000 })
        ]);
        
        // Calculate median from trends
        const latestPlacement = placementTrends[0] || {};
        
        const nirfData = exportHelpers.generateNIRFFormat({
            overview,
            placements: {
                median_salary: latestPlacement.median_salary,
                avg_salary: latestPlacement.avg_salary,
                placed_count: overview.employed_count,
                unique_companies: latestPlacement.unique_companies
            },
            higherEducation: {
                total_count: overview.higher_studies_count,
                topInstitutions: higherEducation.topInstitutions
            },
            achievements: achievements.achievements,
            academicYear
        });
        
        res.json({
            success: true,
            format: 'NIRF',
            data: nirfData,
            exportedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/admin/reports/export/nba
 * Generate NBA-specific program report
 */
router.post('/nba', async (req, res, next) => {
    try {
        const { program, graduationYear, academicYear } = req.body;
        
        if (!program || !graduationYear) {
            return res.status(400).json({
                error: 'Both program and graduationYear are required for NBA report'
            });
        }
        
        // Fetch program-specific outcomes
        const [programOutcomes, overview, achievements] = await Promise.all([
            reportQueries.getProgramOutcomes(program, parseInt(graduationYear)),
            reportQueries.getOverviewKPIs({ program, startYear: graduationYear, endYear: graduationYear }),
            reportQueries.getAchievementsSummary({ 
                startYear: graduationYear, 
                endYear: graduationYear,
                limit: 1000 
            })
        ]);
        
        const nbaData = exportHelpers.generateNBAFormat({
            overview,
            programOutcomes,
            achievements: achievements.achievements,
            academicYear
        }, program);
        
        res.json({
            success: true,
            format: 'NBA',
            data: nbaData,
            exportedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/export/complete
 * Export complete accreditation package (all data)
 */
router.get('/complete', async (req, res, next) => {
    try {
        const format = req.query.format || 'json';
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : undefined,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : undefined,
            program: req.query.program,
            department: req.query.department
        };
        
        // Fetch all data
        const [
            overview,
            placements,
            higherEducation,
            contributions,
            achievements,
            contacts,
            engagement
        ] = await Promise.all([
            reportQueries.getOverviewKPIs(filters),
            reportQueries.getPlacementDetails({ ...filters, limit: 10000 }),
            reportQueries.getHigherEducationDetails({ ...filters, limit: 10000 }),
            reportQueries.getContributionsSummary({ ...filters, limit: 10000 }),
            reportQueries.getAchievementsSummary({ ...filters, limit: 10000 }),
            reportQueries.getContactVerificationStatus(filters),
            reportQueries.getEventParticipationStats(filters)
        ]);
        
        const completeData = {
            overview,
            placements: {
                data: exportHelpers.formatPlacementForExport(placements.data),
                total: placements.total
            },
            higherEducation: {
                data: exportHelpers.formatHigherEducationForExport(higherEducation.data),
                total: higherEducation.total
            },
            contributions: {
                data: exportHelpers.formatContributionsForExport(contributions.contributions),
                summary: contributions.summary
            },
            achievements: {
                data: exportHelpers.formatAchievementsForExport(achievements.achievements),
                summary: achievements.summary
            },
            contacts,
            engagement,
            filters,
            exportedAt: new Date().toISOString(),
            institution: 'IIIT Naya Raipur'
        };
        
        if (format === 'json') {
            res.json({
                success: true,
                data: completeData
            });
        } else {
            // For CSV, we would need to create multiple files
            // Return JSON with instruction to use format=json
            res.status(400).json({
                error: 'CSV format not supported for complete export. Use format=json or export individual reports.'
            });
        }
    } catch (error) {
        next(error);
    }
});

export default router;
