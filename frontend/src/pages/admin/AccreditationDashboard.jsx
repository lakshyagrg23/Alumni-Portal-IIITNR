import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import styles from './AccreditationDashboard.module.css';

const COLORS = ['#1e3a8a', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4'];

const AccreditationDashboard = () => {
  const [activeTab, setActiveTab] = useState('coverage');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [yearRange, setYearRange] = useState({
    startYear: 2015,
    endYear: 2024
  });

  // State for all data
  const [overviewData, setOverviewData] = useState(null);
  const [batchCoverage, setBatchCoverage] = useState([]);
  const [employmentOutcomes, setEmploymentOutcomes] = useState([]);
  const [employmentSummary, setEmploymentSummary] = useState([]);
  const [topIndustries, setTopIndustries] = useState([]);
  const [topCompanies, setTopCompanies] = useState([]);
  const [geographicDistribution, setGeographicDistribution] = useState([]);
  const [profileQuality, setProfileQuality] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, [yearRange]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { startYear, endYear } = yearRange;
      const token = localStorage.getItem('token');
      const config = {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { startYear, endYear }
      };

      // Fetch all data in parallel
      const [
        overviewRes,
        coverageRes,
        outcomesRes,
        summaryRes,
        industriesRes,
        companiesRes,
        geoRes,
        qualityRes
      ] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/admin/accreditation/overview`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/admin/accreditation/batch-coverage`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/admin/accreditation/employment-outcomes`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/admin/accreditation/employment-summary`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/admin/accreditation/top-industries`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/admin/accreditation/top-companies`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/admin/accreditation/geographic-distribution`, config),
        axios.get(`${import.meta.env.VITE_API_URL}/admin/accreditation/profile-quality`, config)
      ]);

      setOverviewData(overviewRes.data.data);
      setBatchCoverage(coverageRes.data.data);
      setEmploymentOutcomes(outcomesRes.data.data);
      setEmploymentSummary(summaryRes.data.data);
      setTopIndustries(industriesRes.data.data);
      setTopCompanies(companiesRes.data.data);
      setGeographicDistribution(geoRes.data.data);
      setProfileQuality(qualityRes.data.data);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching accreditation data:', err);
      setError('Failed to load accreditation data');
      setLoading(false);
    }
  };

  const handleYearChange = (e) => {
    const { name, value } = e.target;
    setYearRange(prev => ({ ...prev, [name]: parseInt(value) }));
  };

  const exportToExcel = () => {
    // Simple CSV export
    let csvContent = "IIIT Naya Raipur - Accreditation Dashboard Report\n";
    csvContent += `Generated on: ${new Date().toLocaleDateString()}\n`;
    csvContent += `Year Range: ${yearRange.startYear} - ${yearRange.endYear}\n\n`;

    // Overview Stats
    csvContent += "OVERVIEW STATISTICS\n";
    csvContent += `Total Alumni (from Institute Records),${overviewData?.totalAlumni || 0}\n`;
    csvContent += `Registered Alumni,${overviewData?.totalRegistered || 0}\n`;
    csvContent += `Registration Rate,${overviewData?.registrationRate || 0}%\n`;
    csvContent += `Alumni with Complete Profiles,${overviewData?.totalWithProfiles || 0}\n`;
    csvContent += `Profile Completion Rate,${overviewData?.profileCompletionRate || 0}%\n`;
    csvContent += `Employed,${overviewData?.employed || 0}\n`;
    csvContent += `Higher Education,${overviewData?.higherEducation || 0}\n`;
    csvContent += `Entrepreneurs,${overviewData?.entrepreneur || 0}\n`;
    csvContent += `Positive Outcome Rate,${overviewData?.outcomeRate || 0}%\n\n`;

    // Batch Coverage
    csvContent += "BATCH-WISE COVERAGE\n";
    csvContent += "Batch,Total Alumni,Registered,With Profile,Coverage %,Profile %\n";
    batchCoverage.forEach(row => {
      csvContent += `${row.batch},${row.total_alumni},${row.registered},${row.with_profile},${row.coverage_pct}%,${row.profile_pct}%\n`;
    });
    csvContent += "\n";

    // Employment Outcomes
    csvContent += "EMPLOYMENT OUTCOMES BY BATCH\n";
    csvContent += "Batch,Total,Employed,Entrepreneur,Higher Ed,Freelancing,Looking,Career Break,Positive Outcomes,Outcome Rate %\n";
    employmentOutcomes.forEach(row => {
      csvContent += `${row.batch},${row.total_registered},${row.employed},${row.entrepreneur},${row.higher_education},${row.freelancing},${row.looking},${row.career_break},${row.positive_outcome},${row.outcome_rate}%\n`;
    });

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `accreditation_report_${yearRange.startYear}_${yearRange.endYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading accreditation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={fetchAllData} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Accreditation Dashboard</h1>
          <p className={styles.subtitle}>
            Alumni-only metrics based on registered users (not current students)
          </p>
        </div>

        <div className={styles.controls}>
          <div className={styles.yearFilter}>
            <label>
              From:
              <input
                type="number"
                name="startYear"
                value={yearRange.startYear}
                onChange={handleYearChange}
                min="2000"
                max={new Date().getFullYear()}
              />
            </label>
            <label>
              To:
              <input
                type="number"
                name="endYear"
                value={yearRange.endYear}
                onChange={handleYearChange}
                min="2000"
                max={new Date().getFullYear()}
              />
            </label>
          </div>
          <button onClick={exportToExcel} className={styles.exportButton}>
            📊 Export to CSV
          </button>
        </div>
      </div>

      {/* Overview KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <h3>Total Alumni</h3>
          <p className={styles.kpiValue}>{overviewData?.totalAlumni || 0}</p>
          <p className={styles.kpiLabel}>From Institute Records</p>
        </div>
        <div className={styles.kpiCard}>
          <h3>Registered</h3>
          <p className={styles.kpiValue}>{overviewData?.totalRegistered || 0}</p>
          <p className={styles.kpiLabel}>{overviewData?.registrationRate || 0}% Coverage</p>
        </div>
        <div className={styles.kpiCard}>
          <h3>Complete Profiles</h3>
          <p className={styles.kpiValue}>{overviewData?.totalWithProfiles || 0}</p>
          <p className={styles.kpiLabel}>{overviewData?.profileCompletionRate || 0}% of Registered</p>
        </div>
        <div className={styles.kpiCard}>
          <h3>Positive Outcomes</h3>
          <p className={styles.kpiValue}>{overviewData?.positiveOutcomes || 0}</p>
          <p className={styles.kpiLabel}>{overviewData?.outcomeRate || 0}% Rate</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={activeTab === 'coverage' ? styles.activeTab : ''}
          onClick={() => setActiveTab('coverage')}
        >
          Coverage & Registration
        </button>
        <button
          className={activeTab === 'employment' ? styles.activeTab : ''}
          onClick={() => setActiveTab('employment')}
        >
          Employment Outcomes
        </button>
        <button
          className={activeTab === 'insights' ? styles.activeTab : ''}
          onClick={() => setActiveTab('insights')}
        >
          Career Insights
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'coverage' && (
          <CoverageTab
            batchCoverage={batchCoverage}
            profileQuality={profileQuality}
          />
        )}

        {activeTab === 'employment' && (
          <EmploymentTab
            employmentOutcomes={employmentOutcomes}
            employmentSummary={employmentSummary}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsTab
            topIndustries={topIndustries}
            topCompanies={topCompanies}
            geographicDistribution={geographicDistribution}
          />
        )}
      </div>
    </div>
  );
};

// Coverage Tab Component
const CoverageTab = ({ batchCoverage, profileQuality }) => {
  return (
    <div className={styles.tabPanel}>
      <div className={styles.section}>
        <h2>Batch-wise Registration Coverage</h2>
        <p className={styles.sectionNote}>
          Shows how many alumni from each batch have registered compared to total alumni records
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={batchCoverage}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="batch" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="total_alumni" fill="#94a3b8" name="Total Alumni" />
            <Bar dataKey="registered" fill="#1e3a8a" name="Registered" />
            <Bar dataKey="with_profile" fill="#10b981" name="With Profile" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.section}>
        <h2>Registration Rate by Batch</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={batchCoverage}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="batch" />
            <YAxis />
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend />
            <Line type="monotone" dataKey="coverage_pct" stroke="#1e3a8a" name="Registration %" strokeWidth={2} />
            <Line type="monotone" dataKey="profile_pct" stroke="#10b981" name="Profile Completion %" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.section}>
        <h2>Batch-wise Details</h2>
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Total Alumni</th>
                <th>Registered</th>
                <th>Coverage %</th>
                <th>With Profile</th>
                <th>Profile %</th>
              </tr>
            </thead>
            <tbody>
              {batchCoverage.map(row => (
                <tr key={row.batch}>
                  <td><strong>{row.batch}</strong></td>
                  <td>{row.total_alumni}</td>
                  <td>{row.registered}</td>
                  <td><span className={styles.badge}>{row.coverage_pct}%</span></td>
                  <td>{row.with_profile}</td>
                  <td><span className={styles.badge}>{row.profile_pct}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Profile Quality Metrics</h2>
        <div className={styles.qualityGrid}>
          {profileQuality.map((metric, idx) => (
            <div key={idx} className={styles.qualityCard}>
              <h4>{metric.metric_name}</h4>
              <p className={styles.qualityValue}>{metric.count}</p>
              <p className={styles.qualityPercentage}>{metric.percentage}%</p>
              <p className={styles.qualityTotal}>of {metric.total_profiles} profiles</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Employment Tab Component
const EmploymentTab = ({ employmentOutcomes, employmentSummary }) => {
  return (
    <div className={styles.tabPanel}>
      <div className={styles.section}>
        <h2>Employment Status Distribution</h2>
        <p className={styles.sectionNote}>Overall distribution across all registered alumni</p>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={employmentSummary}
              dataKey="count"
              nameKey="employment_status"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={(entry) => `${entry.employment_status}: ${entry.percentage}%`}
            >
              {employmentSummary.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.section}>
        <h2>Batch-wise Employment Outcomes</h2>
        <p className={styles.sectionNote}>
          Positive outcomes = Employed + Higher Education + Entrepreneurship
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={employmentOutcomes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="batch" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="employed" fill="#1e3a8a" name="Employed" stackId="a" />
            <Bar dataKey="higher_education" fill="#10b981" name="Higher Ed" stackId="a" />
            <Bar dataKey="entrepreneur" fill="#f97316" name="Entrepreneur" stackId="a" />
            <Bar dataKey="freelancing" fill="#8b5cf6" name="Freelancing" stackId="a" />
            <Bar dataKey="looking" fill="#f59e0b" name="Looking" stackId="a" />
            <Bar dataKey="career_break" fill="#94a3b8" name="Career Break" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.section}>
        <h2>Positive Outcome Rate by Batch</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={employmentOutcomes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="batch" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend />
            <Line type="monotone" dataKey="outcome_rate" stroke="#10b981" name="Positive Outcome %" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.section}>
        <h2>Detailed Employment Outcomes by Batch</h2>
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Total</th>
                <th>Employed</th>
                <th>Higher Ed</th>
                <th>Entrepreneur</th>
                <th>Freelancing</th>
                <th>Looking</th>
                <th>Positive Rate</th>
              </tr>
            </thead>
            <tbody>
              {employmentOutcomes.map(row => (
                <tr key={row.batch}>
                  <td><strong>{row.batch}</strong></td>
                  <td>{row.total_registered}</td>
                  <td>{row.employed}</td>
                  <td>{row.higher_education}</td>
                  <td>{row.entrepreneur}</td>
                  <td>{row.freelancing}</td>
                  <td>{row.looking}</td>
                  <td>
                    <span className={styles.outcomeBadge}>
                      {row.outcome_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Insights Tab Component
const InsightsTab = ({ topIndustries, topCompanies, geographicDistribution }) => {
  return (
    <div className={styles.tabPanel}>
      <div className={styles.section}>
        <h2>Top Industries</h2>
        <p className={styles.sectionNote}>Where employed alumni are working</p>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={topIndustries} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="industry" type="category" width={150} />
            <Tooltip />
            <Bar dataKey="count" fill="#1e3a8a" name="Alumni Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.twoColumnSection}>
        <div className={styles.section}>
          <h2>Top Companies</h2>
          <div className={styles.listContainer}>
            {topCompanies.map((company, idx) => (
              <div key={idx} className={styles.listItem}>
                <span className={styles.listRank}>{idx + 1}</span>
                <span className={styles.listName}>{company.company}</span>
                <span className={styles.listCount}>{company.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h2>Geographic Distribution</h2>
          <div className={styles.listContainer}>
            {geographicDistribution.map((loc, idx) => (
              <div key={idx} className={styles.listItem}>
                <span className={styles.listRank}>{idx + 1}</span>
                <span className={styles.listName}>
                  {loc.city}, {loc.country}
                </span>
                <span className={styles.listCount}>{loc.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Industry Distribution</h2>
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Industry</th>
                <th>Alumni Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {topIndustries.map((industry, idx) => (
                <tr key={idx}>
                  <td>{industry.industry}</td>
                  <td>{industry.count}</td>
                  <td><span className={styles.badge}>{industry.percentage}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccreditationDashboard;
