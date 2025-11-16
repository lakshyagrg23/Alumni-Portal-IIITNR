import React from 'react'
import styles from '../AdminPanel.module.css'

export const PlacementTable = ({ data }) => {
  if (!data || !data.data || data.data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No placement data available</div>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Alumni Name</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Company</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Position</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Salary (LPA)</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Year</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Type</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((item, index) => (
            <tr key={item.id || index} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '0.75rem' }}>{item.alumni_name || 'N/A'}</td>
              <td style={{ padding: '0.75rem' }}>{item.display_company_name || item.company_name || 'N/A'}</td>
              <td style={{ padding: '0.75rem' }}>{item.position || 'N/A'}</td>
              <td style={{ padding: '0.75rem' }}>
                {item.show_salary && item.salary_package ? `₹${parseFloat(item.salary_package).toFixed(2)}` : 'Confidential'}
              </td>
              <td style={{ padding: '0.75rem' }}>{item.placement_year || 'N/A'}</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  background: item.placement_type === 'Campus Placement' ? '#e0f2fe' : '#fef3c7',
                  color: item.placement_type === 'Campus Placement' ? '#0369a1' : '#92400e',
                  borderRadius: '4px',
                  fontSize: '0.75rem'
                }}>
                  {item.placement_type || 'N/A'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.total > data.data.length && (
        <div style={{ marginTop: '1rem', textAlign: 'center', color: '#666', fontSize: '0.875rem' }}>
          Showing {data.data.length} of {data.total} records
        </div>
      )}
    </div>
  )
}

export const HigherEducationTable = ({ data }) => {
  if (!data || !data.data || data.data.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No higher education data available</div>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Alumni Name</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Institution</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Program</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Level</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Country</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Year</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((item, index) => (
            <tr key={item.id || index} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '0.75rem' }}>{`${item.first_name || ''} ${item.last_name || ''}`.trim() || 'N/A'}</td>
              <td style={{ padding: '0.75rem' }}>{item.institution_name || 'N/A'}</td>
              <td style={{ padding: '0.75rem' }}>{item.program_name || 'N/A'}</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  background: '#f0f9ff',
                  color: '#0369a1',
                  borderRadius: '4px',
                  fontSize: '0.75rem'
                }}>
                  {item.program_level || 'N/A'}
                </span>
              </td>
              <td style={{ padding: '0.75rem' }}>{item.institution_country || 'N/A'}</td>
              <td style={{ padding: '0.75rem' }}>{item.admission_year || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.total > data.data.length && (
        <div style={{ marginTop: '1rem', textAlign: 'center', color: '#666', fontSize: '0.875rem' }}>
          Showing {data.data.length} of {data.total} records
        </div>
      )}
    </div>
  )
}

export const ContributionsTable = ({ data }) => {
  if (!data || !data.contributions || data.contributions.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No contribution data available</div>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Alumni Name</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Type</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Description</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Amount</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Date</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Impact</th>
          </tr>
        </thead>
        <tbody>
          {data.contributions.map((item, index) => (
            <tr key={item.id || index} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '0.75rem' }}>{`${item.first_name || ''} ${item.last_name || ''}`.trim() || 'N/A'}</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  background: '#fef3c7',
                  color: '#92400e',
                  borderRadius: '4px',
                  fontSize: '0.75rem'
                }}>
                  {item.type?.replace(/_/g, ' ') || 'N/A'}
                </span>
              </td>
              <td style={{ padding: '0.75rem', maxWidth: '200px' }}>{item.description?.substring(0, 50) || 'N/A'}</td>
              <td style={{ padding: '0.75rem' }}>
                {item.amount ? `₹${parseFloat(item.amount).toLocaleString()}` : '-'}
              </td>
              <td style={{ padding: '0.75rem' }}>
                {item.contribution_date ? new Date(item.contribution_date).toLocaleDateString() : 'N/A'}
              </td>
              <td style={{ padding: '0.75rem' }}>
                {item.students_impacted ? `${item.students_impacted} students` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const AchievementsTable = ({ data }) => {
  if (!data || !data.achievements || data.achievements.length === 0) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No achievement data available</div>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Alumni Name</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Type</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Title</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Recognition</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Date</th>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Featured</th>
          </tr>
        </thead>
        <tbody>
          {data.achievements.map((item, index) => (
            <tr key={item.id || index} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '0.75rem' }}>{`${item.first_name || ''} ${item.last_name || ''}`.trim() || 'N/A'}</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  background: '#fce7f3',
                  color: '#9f1239',
                  borderRadius: '4px',
                  fontSize: '0.75rem'
                }}>
                  {item.type?.replace(/_/g, ' ') || 'N/A'}
                </span>
              </td>
              <td style={{ padding: '0.75rem', maxWidth: '250px' }}>{item.title || 'N/A'}</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  background: item.recognition_level === 'International' ? '#f0f9ff' : '#f0fdf4',
                  color: item.recognition_level === 'International' ? '#0369a1' : '#166534',
                  borderRadius: '4px',
                  fontSize: '0.75rem'
                }}>
                  {item.recognition_level || 'N/A'}
                </span>
              </td>
              <td style={{ padding: '0.75rem' }}>
                {item.achievement_date ? new Date(item.achievement_date).toLocaleDateString() : 'N/A'}
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                {item.is_featured ? '⭐' : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
