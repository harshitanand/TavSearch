const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Direct Tavily API test
 */
async function testTavilyDirect() {
  console.log('🔍 Testing Tavily API directly...');

  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    console.error('❌ TAVILY_API_KEY not found in environment variables');
    return false;
  }

  if (!apiKey.startsWith('tvly-')) {
    console.warn('⚠️  Warning: Tavily API key should start with "tvly-"');
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: 'AI market trends',
        search_depth: 'basic',
        max_results: 3,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    console.log(`📡 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Tavily API error: ${response.status} - ${errorText}`);
      return false;
    }

    const data = await response.json();
    console.log('✅ Tavily API test successful!');
    console.log(`📊 Results returned: ${data.results?.length || 0}`);

    if (data.results?.length > 0) {
      console.log('📄 Sample result:', {
        title: data.results[0].title,
        url: data.results[0].url,
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Tavily API test failed:', error.message);
    return false;
  }
}

/**
 * Test the fixed LangChain workflow
 */
async function testWorkflow() {
  console.log('\n🤖 Testing fixed LangChain Multi-Agent workflow...');

  try {
    // Import the fixed class
    const LangChainMultiAgent = require('../src/workflows/LangChainMultiAgent');

    const config = {
      apiKeys: {
        openai: process.env.OPENAI_API_KEY,
        tavily: process.env.TAVILY_API_KEY,
      },
    };

    // Validate config
    if (!config.apiKeys.openai) {
      console.error('❌ OPENAI_API_KEY not found');
      return false;
    }

    if (!config.apiKeys.tavily) {
      console.error('❌ TAVILY_API_KEY not found');
      return false;
    }

    // Create workflow instance
    const workflow = new LangChainMultiAgent(config);
    console.log('✅ Workflow instance created successfully');

    // Test with simple query
    console.log('🚀 Starting test analysis...');
    const result = await workflow.execute('AI market trends 2024', 'test-user');

    if (result.success) {
      console.log('✅ Workflow completed successfully!');
      console.log(`📊 Data sources found: ${result.data.rawData?.length || 0}`);
      console.log(`⚠️  Errors encountered: ${result.data.errors?.length || 0}`);
      console.log(`📝 Report length: ${result.data.finalReport?.length || 0} characters`);

      // Show any errors
      if (result.data.errors?.length > 0) {
        console.log('\n⚠️  Errors encountered:');
        result.data.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.agent}: ${error.error}`);
        });
      }

      return true;
    } else {
      console.error('❌ Workflow failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
    return false;
  }
}

/**
 * Test environment setup
 */
function testEnvironment() {
  console.log('🔧 Checking environment setup...');

  const requiredVars = ['OPENAI_API_KEY', 'TAVILY_API_KEY'];
  const missing = requiredVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
    console.log('\n📝 Create a .env file with:');
    console.log('OPENAI_API_KEY=your_openai_key_here');
    console.log('TAVILY_API_KEY=your_tavily_key_here');
    return false;
  }

  console.log('✅ All required environment variables found');
  return true;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Starting Tavily API Fix Tests\n');

  // Test 1: Environment
  const envOk = testEnvironment();
  if (!envOk) {
    process.exit(1);
  }

  // Test 2: Direct API
  const apiOk = await testTavilyDirect();
  if (!apiOk) {
    console.log('\n❌ Direct API test failed. Check your Tavily API key.');
    process.exit(1);
  }

  // Test 3: Full workflow
  const workflowOk = await testWorkflow();
  if (!workflowOk) {
    console.log('\n❌ Workflow test failed.');
    process.exit(1);
  }

  console.log('\n🎉 All tests passed! The Tavily API fix is working correctly.');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = {
  testTavilyDirect,
  testWorkflow,
  testEnvironment,
};
