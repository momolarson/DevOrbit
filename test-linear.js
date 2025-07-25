// Simple Node.js test script to verify Linear API connection
// Run with: node test-linear.js

const fetch = require('node-fetch');

const LINEAR_API_KEY = process.argv[2];

if (!LINEAR_API_KEY) {
  console.log('Usage: node test-linear.js YOUR_LINEAR_API_KEY');
  process.exit(1);
}

const query = `
  query {
    viewer {
      id
      name
      email
      displayName
    }
  }
`;

async function testLinearConnection() {
  try {
    console.log('Testing Linear API connection...');
    
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINEAR_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (data.data?.viewer) {
      console.log('✅ Linear API connection successful!');
      console.log('User:', data.data.viewer.displayName || data.data.viewer.name);
    } else if (data.errors) {
      console.log('❌ Linear API errors:', data.errors);
    } else {
      console.log('❌ Unexpected response format');
    }
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
  }
}

testLinearConnection();