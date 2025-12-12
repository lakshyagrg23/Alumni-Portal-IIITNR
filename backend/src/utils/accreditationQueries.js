/**
 * Accreditation Dashboard V2 - Report Query Utilities
 * Batch-centric queries for realistic accreditation reporting
 */

import { query as dbQuery } from "../config/database.js";

/**
 * Get batch coverage - compares institute records with registered alumni
 */
export async function getBatchCoverage(startYear = 2015, endYear = 2025) {
  console.log("[QUERY] getBatchCoverage called with:", startYear, endYear);
  try {
    const queryText = `SELECT * FROM get_batch_coverage($1, $2)`;
    console.log("[QUERY] Executing SQL:", queryText, "with params:", [
      startYear,
      endYear,
    ]);
    const result = await dbQuery(queryText, [startYear, endYear]);
    console.log("[QUERY] Query result:", result.rows.length, "rows");
    return result.rows;
  } catch (error) {
    console.error("[QUERY] getBatchCoverage error:", error);
    throw error;
  }
}

/**
 * Get employment outcomes by batch (alumni only, excludes current students)
 */
export async function getEmploymentOutcomes(startYear = 2015, endYear = 2024) {
  const queryText = `SELECT * FROM get_employment_outcomes($1, $2)`;
  const result = await dbQuery(queryText, [startYear, endYear]);
  return result.rows;
}

/**
 * Get employment status summary (overall distribution)
 */
export async function getEmploymentSummary(startYear = 2015, endYear = 2024) {
  const queryText = `SELECT * FROM get_employment_summary($1, $2)`;
  const result = await dbQuery(queryText, [startYear, endYear]);
  return result.rows;
}

/**
 * Get top industries where alumni work
 */
export async function getTopIndustries(
  startYear = 2015,
  endYear = 2024,
  limit = 10
) {
  const queryText = `SELECT * FROM get_top_industries($1, $2, $3)`;
  const result = await dbQuery(queryText, [startYear, endYear, limit]);
  return result.rows;
}

/**
 * Get top companies where alumni are employed
 */
export async function getTopCompanies(
  startYear = 2015,
  endYear = 2024,
  limit = 15
) {
  const queryText = `SELECT * FROM get_top_companies($1, $2, $3)`;
  const result = await dbQuery(queryText, [startYear, endYear, limit]);
  return result.rows;
}

/**
 * Get geographic distribution of alumni
 */
export async function getGeographicDistribution(
  startYear = 2015,
  endYear = 2024,
  limit = 15
) {
  const queryText = `SELECT * FROM get_geographic_distribution($1, $2, $3)`;
  const result = await dbQuery(queryText, [startYear, endYear, limit]);
  return result.rows;
}

/**
 * Get profile quality metrics
 */
export async function getProfileQualityMetrics(
  startYear = 2015,
  endYear = 2024
) {
  const queryText = `SELECT * FROM get_profile_quality_metrics($1, $2)`;
  const result = await dbQuery(queryText, [startYear, endYear]);
  return result.rows;
}

/**
 * Get overall statistics for dashboard summary
 */
export async function getOverviewStats(startYear = 2015, endYear = 2024) {
  console.log("[QUERY] getOverviewStats called with:", startYear, endYear);
  try {
    const batchCoverage = await getBatchCoverage(startYear, endYear);
    console.log(
      "[QUERY] Batch coverage fetched:",
      batchCoverage.length,
      "rows"
    );

    const employmentSummary = await getEmploymentSummary(startYear, endYear);
    console.log(
      "[QUERY] Employment summary fetched:",
      employmentSummary.length,
      "rows"
    );

    // Calculate totals
    const totalAlumni = batchCoverage.reduce(
      (sum, row) => sum + parseInt(row.total_alumni),
      0
    );
    const totalRegistered = batchCoverage.reduce(
      (sum, row) => sum + parseInt(row.registered),
      0
    );
    const totalWithProfiles = batchCoverage.reduce(
      (sum, row) => sum + parseInt(row.with_profile),
      0
    );

    console.log(
      "[QUERY] Totals - Alumni:",
      totalAlumni,
      "Registered:",
      totalRegistered,
      "With Profiles:",
      totalWithProfiles
    );

    // Calculate employment metrics
    const employed = employmentSummary.find(
      (e) => e.employment_status === "Employed Full-time"
    );
    const higherEd = employmentSummary.find(
      (e) => e.employment_status === "Pursuing Higher Education"
    );
    const entrepreneur = employmentSummary.find(
      (e) => e.employment_status === "Self-Employed / Entrepreneur"
    );

    const positiveOutcomes =
      parseInt(employed?.count || 0) +
      parseInt(higherEd?.count || 0) +
      parseInt(entrepreneur?.count || 0);
    const outcomeRate =
      totalRegistered > 0
        ? Math.round((positiveOutcomes / totalRegistered) * 100 * 10) / 10
        : 0;

    console.log(
      "[QUERY] Employment metrics - Employed:",
      employed?.count,
      "Higher Ed:",
      higherEd?.count,
      "Entrepreneur:",
      entrepreneur?.count
    );

    const stats = {
      totalAlumni,
      totalRegistered,
      totalWithProfiles,
      registrationRate:
        totalAlumni > 0
          ? Math.round((totalRegistered / totalAlumni) * 100 * 10) / 10
          : 0,
      profileCompletionRate:
        totalRegistered > 0
          ? Math.round((totalWithProfiles / totalRegistered) * 100 * 10) / 10
          : 0,
      employed: parseInt(employed?.count || 0),
      higherEducation: parseInt(higherEd?.count || 0),
      entrepreneur: parseInt(entrepreneur?.count || 0),
      positiveOutcomes,
      outcomeRate,
      employmentSummary,
    };

    console.log("[QUERY] Final stats:", JSON.stringify(stats, null, 2));
    return stats;
  } catch (error) {
    console.error("[QUERY] getOverviewStats error:", error);
    throw error;
  }
}
