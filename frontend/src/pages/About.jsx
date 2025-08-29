import React from 'react'
import { Helmet } from 'react-helmet-async'

const About = () => {
  return (
    <>
      <Helmet>
        <title>About - IIIT Naya Raipur Alumni Portal</title>
      </Helmet>
      
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>About IIIT Naya Raipur</h1>
        <p>Learn more about our institute and alumni community.</p>
        <p><em>This page is under development.</em></p>
      </div>
    </>
  )
}

export default About
