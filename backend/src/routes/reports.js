/**
 * Reports API Routes for Accreditation Dashboard
 * Provides endpoints for generating accreditation reports
 */

import express from 'express';
const router = express.Router();
import { authenticate, requireAdmin } from '../middleware/auth.js';
import reportQueries from '../utils/reportQueries.js';
import pool from '../config/database.js';

// All report routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/reports/overview
 * Get dashboard overview with key KPIs
 */
router.get('/overview', async (req, res, next) => {
    try {
        console.log('reports: GET /overview called with query:', req.query);
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : undefined,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : undefined,
            program: req.query.program,
            department: req.query.department
        };
        
        const data = await reportQueries.getOverviewKPIs(filters);

        res.json({
            success: true,
            data,
            filters,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        // Log detailed debug info before passing to error handler
        console.error('reports: error in /overview route', {
            message: error && error.message,
            stack: error && error.stack
        });
        next(error);
    }
});

/**
 * GET /api/admin/reports/placements
 * Get detailed placement data
 */
router.get('/placements', async (req, res, next) => {
    try {
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : undefined,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : undefined,
            program: req.query.program,
            department: req.query.department,
            companyName: req.query.companyName,
            limit: req.query.limit ? parseInt(req.query.limit) : 100,
            offset: req.query.offset ? parseInt(req.query.offset) : 0
        };
        
        const data = await reportQueries.getPlacementDetails(filters);
        
        res.json({
            success: true,
            ...data,
            filters,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/placements/trends
 * Get year-wise placement trends
 */
router.get('/placements/trends', async (req, res, next) => {
    try {
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : 2015,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : new Date().getFullYear(),
            program: req.query.program,
            department: req.query.department
        };
        
        const data = await reportQueries.getPlacementTrends(filters);
        
        res.json({
            success: true,
            data,
            filters,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/employers
 * Get top employers and hiring statistics
 */
router.get('/employers', async (req, res, next) => {
    try {
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : undefined,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : 20
        };
        
        const topEmployers = await reportQueries.getTopEmployers(filters);
        const industryDistribution = await reportQueries.getIndustryDistribution(filters);
        
        res.json({
            success: true,
            data: {
                topEmployers,
                industryDistribution
            },
            filters,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/higher-studies
 * Get higher education statistics
 */
router.get('/higher-studies', async (req, res, next) => {
    try {
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : undefined,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : undefined,
            program: req.query.program,
            department: req.query.department,
            country: req.query.country,
            limit: req.query.limit ? parseInt(req.query.limit) : 100,
            offset: req.query.offset ? parseInt(req.query.offset) : 0
        };
        
        const [details, stats] = await Promise.all([
            reportQueries.getHigherEducationDetails(filters),
            reportQueries.getHigherEducationStats(filters)
        ]);
        
        res.json({
            success: true,
            details: details.data,
            stats,
            pagination: {
                total: details.total,
                limit: details.limit,
                offset: details.offset
            },
            filters,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/contributions
 * Get alumni contributions summary
 */
router.get('/contributions', async (req, res, next) => {
    try {
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : undefined,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : undefined,
            type: req.query.type,
            limit: req.query.limit ? parseInt(req.query.limit) : 50
        };
        
        const data = await reportQueries.getContributionsSummary(filters);
        
        res.json({
            success: true,
            ...data,
            filters,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/achievements
 * Get alumni achievements summary
 */
router.get('/achievements', async (req, res, next) => {
    try {
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : undefined,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : undefined,
            type: req.query.type,
            recognitionLevel: req.query.recognitionLevel,
            limit: req.query.limit ? parseInt(req.query.limit) : 50
        };
        
        const data = await reportQueries.getAchievementsSummary(filters);
        
        res.json({
            success: true,
            ...data,
            filters,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/contacts
 * Get contact verification status
 */
router.get('/contacts', async (req, res, next) => {
    try {
        const filters = {
            program: req.query.program,
            department: req.query.department,
            graduationYear: req.query.graduationYear ? parseInt(req.query.graduationYear) : undefined
        };
        
        const data = await reportQueries.getContactVerificationStatus(filters);
        
        res.json({
            success: true,
            data,
            filters,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/engagement
 * Get event participation and engagement statistics
 */
router.get('/engagement', async (req, res, next) => {
    try {
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : undefined,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : undefined
        };
        
        const data = await reportQueries.getEventParticipationStats(filters);
        
        res.json({
            success: true,
            data,
            filters,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/program-outcomes
 * Get program-specific outcomes (for NBA accreditation)
 */
router.get('/program-outcomes', async (req, res, next) => {
    try {
        const { program, graduationYear } = req.query;
        
        if (!program || !graduationYear) {
            return res.status(400).json({
                error: 'Both program and graduationYear are required'
            });
        }
        
        const data = await reportQueries.getProgramOutcomes(
            program,
            parseInt(graduationYear)
        );
        
        res.json({
            success: true,
            data,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/summary
 * Get comprehensive summary of all metrics (for quick dashboard load)
 */
router.get('/summary', async (req, res, next) => {
    try {
        const filters = {
            startYear: req.query.startYear ? parseInt(req.query.startYear) : undefined,
            endYear: req.query.endYear ? parseInt(req.query.endYear) : undefined,
            program: req.query.program,
            department: req.query.department
        };
        
        // Fetch multiple reports in parallel
        const [
            overview,
            placementTrends,
            topEmployers,
            higherEdStats,
            contributions,
            achievements,
            contacts,
            engagement
        ] = await Promise.all([
            reportQueries.getOverviewKPIs(filters),
            reportQueries.getPlacementTrends({ 
                ...filters, 
                startYear: filters.startYear || 2020 
            }),
            reportQueries.getTopEmployers({ ...filters, limit: 10 }),
            reportQueries.getHigherEducationStats(filters),
            reportQueries.getContributionsSummary({ ...filters, limit: 10 }),
            reportQueries.getAchievementsSummary({ ...filters, limit: 10 }),
            reportQueries.getContactVerificationStatus(filters),
            reportQueries.getEventParticipationStats(filters)
        ]);
        
        res.json({
            success: true,
            data: {
                overview,
                placementTrends: placementTrends.slice(0, 5), // Last 5 years
                topEmployers: topEmployers.slice(0, 10),
                higherEducation: higherEdStats,
                contributions: {
                    summary: contributions.summary,
                    recent: contributions.contributions.slice(0, 5)
                },
                achievements: {
                    summary: achievements.summary,
                    recent: achievements.achievements.slice(0, 5)
                },
                contacts,
                engagement
            },
            filters,
            generatedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/admin/reports/filters/options
 * Get available filter options (programs, departments, years)
 */
router.get('/filters/options', async (req, res, next) => {
    try {
        // use the imported pool instance
        // const pool = require('../config/database'); (converted to ES module import at top)
        
        const [programs, departments, years] = await Promise.all([
            pool.query(`
                SELECT DISTINCT program 
                FROM alumni_profiles 
                WHERE program IS NOT NULL 
                ORDER BY program
            `),
            pool.query(`
                SELECT DISTINCT department 
                FROM alumni_profiles 
                WHERE department IS NOT NULL 
                ORDER BY department
            `),
            pool.query(`
                SELECT DISTINCT graduation_year 
                FROM alumni_profiles 
                WHERE graduation_year IS NOT NULL 
                ORDER BY graduation_year DESC
            `)
        ]);
        
        res.json({
            success: true,
            data: {
                programs: programs.rows.map(r => r.program),
                departments: departments.rows.map(r => r.department),
                years: years.rows.map(r => r.graduation_year),
                contributionTypes: [
                    'donation', 'guest_lecture', 'mentorship', 
                    'internship_offered', 'job_recruitment', 
                    'workshop_conducted', 'advisory_board'
                ],
                achievementTypes: [
                    'promotion', 'award', 'startup_founded', 
                    'publication', 'patent', 'conference_speaker', 
                    'certification'
                ],
                recognitionLevels: [
                    'International', 'National', 'State', 
                    'University', 'Local', 'Corporate'
                ]
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;
