import React from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#1e3a8a', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4']

export const PlacementTrendsChart = ({ data }) => {
  if (!data || data.length === 0) return <div>No data available</div>

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="placement_year" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="total_placements" stroke="#1e3a8a" strokeWidth={2} name="Placements" />
        <Line yAxisId="right" type="monotone" dataKey="avg_salary" stroke="#f97316" strokeWidth={2} name="Avg Salary (LPA)" />
      </LineChart>
    </ResponsiveContainer>
  )
}

export const IndustryDistributionChart = ({ data }) => {
  if (!data || data.length === 0) return <div>No data available</div>

  const chartData = data.slice(0, 6).map(item => ({
    name: item.industry_sector || 'Other',
    value: parseInt(item.alumni_count) || 0
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

export const EmploymentStatusChart = ({ data }) => {
  if (!data) return <div>No data available</div>

  const chartData = [
    { name: 'Employed', value: parseInt(data.employed_count) || 0, color: '#10b981' },
    { name: 'Higher Studies', value: parseInt(data.higher_studies_count) || 0, color: '#1e3a8a' },
    { name: 'Entrepreneur', value: parseInt(data.entrepreneur_count) || 0, color: '#f97316' },
    { name: 'Self-employed', value: parseInt(data.self_employed_count) || 0, color: '#8b5cf6' }
  ].filter(item => item.value > 0)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#1e3a8a">
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export const TopEmployersChart = ({ data }) => {
  if (!data || data.length === 0) return <div>No data available</div>

  const chartData = data.slice(0, 10).map(item => ({
    name: item.company_name?.substring(0, 20) || 'Unknown',
    hires: parseInt(item.hire_count) || 0,
    avgSalary: parseFloat(item.avg_salary) || 0
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" width={150} />
        <Tooltip />
        <Legend />
        <Bar dataKey="hires" fill="#1e3a8a" name="Number of Hires" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export const HigherEducationChart = ({ data }) => {
  if (!data || !data.byProgramLevel || data.byProgramLevel.length === 0) {
    return <div>No data available</div>
  }

  const chartData = data.byProgramLevel.map(item => ({
    name: item.program_level || 'Unknown',
    value: parseInt(item.student_count) || 0
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

export const ContributionsChart = ({ data }) => {
  if (!data || !data.summary || data.summary.length === 0) {
    return <div>No data available</div>
  }

  const chartData = data.summary.map(item => ({
    name: item.type?.replace(/_/g, ' ').toUpperCase() || 'Unknown',
    count: parseInt(item.count) || 0,
    amount: parseFloat(item.total_amount) || 0
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" fill="#1e3a8a" name="Number of Contributions" />
      </BarChart>
    </ResponsiveContainer>
  )
}
