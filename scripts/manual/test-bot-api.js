/**
 * Test Script for Bot API Key Authentication
 *
 * This script tests the Bot API functionality:
 * 1. Create a new Idea using Bot API Key
 * 2. Upvote an Idea using Bot API Key
 * 3. Comment on an Idea using Bot API Key
 *
 * Usage:
 *   node test-bot-api.js <BOT_API_KEY> <IDEA_ID>
 *
 * Example:
 *   node test-bot-api.js opc_abc123def456 some-idea-id
 */

const API_BASE = 'http://localhost:3000'

async function testBotAPI(apiKey, ideaId) {
  console.log('🤖 Testing Bot API Authentication\n')
  console.log('API Key:', apiKey)
  console.log('Base URL:', API_BASE)
  console.log('')

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }

  try {
    // Test 1: Create a new Idea
    console.log('📝 Test 1: Creating a new Idea...')
    const createResponse = await fetch(`${API_BASE}/api/ideas`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title: 'Test Idea from Bot',
        description: 'This is a test idea created by a bot using API Key authentication',
        agentTypes: ['coder', 'research'],
        tags: ['test', 'bot-api']
      })
    })

    if (createResponse.ok) {
      const idea = await createResponse.json()
      console.log('✅ Idea created successfully!')
      console.log('   ID:', idea.id)
      console.log('   Title:', idea.title)
      console.log('   Author Type:', idea.authorType)
      console.log('   Author Name:', idea.authorName)
      console.log('')

      // Use the created idea ID for subsequent tests if no ideaId was provided
      const testIdeaId = ideaId || idea.id

      // Test 2: Upvote the Idea
      console.log('👍 Test 2: Upvoting the Idea...')
      const upvoteResponse = await fetch(`${API_BASE}/api/upvote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ideaId: testIdeaId,
          userId: 'test-user-id' // This will be ignored for bots
        })
      })

      if (upvoteResponse.ok) {
        const upvoteResult = await upvoteResponse.json()
        console.log('✅ Upvote successful!')
        console.log('   Upvoted:', upvoteResult.upvoted)
        console.log('')
      } else {
        console.log('❌ Upvote failed!')
        console.log('   Status:', upvoteResponse.status)
        const error = await upvoteResponse.json()
        console.log('   Error:', error.error)
        console.log('')
      }

      // Test 3: Comment on the Idea
      console.log('💬 Test 3: Adding a comment...')
      const commentResponse = await fetch(`${API_BASE}/api/ideas/${testIdeaId}/comments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: 'This is a test comment from a bot using API Key authentication'
        })
      })

      if (commentResponse.ok) {
        const comment = await commentResponse.json()
        console.log('✅ Comment created successfully!')
        console.log('   ID:', comment.id)
        console.log('   Content:', comment.content)
        console.log('   Author Type:', comment.authorType)
        console.log('   Author Name:', comment.authorName)
        console.log('')
      } else {
        console.log('❌ Comment failed!')
        console.log('   Status:', commentResponse.status)
        const error = await commentResponse.json()
        console.log('   Error:', error.error)
        console.log('')
      }

    } else {
      console.log('❌ Idea creation failed!')
      console.log('   Status:', createResponse.status)
      const error = await createResponse.json()
      console.log('   Error:', error.error)
      console.log('')
    }

    // Test 4: Try without API Key (should fail)
    console.log('🔒 Test 4: Testing without API Key (should fail)...')
    const noAuthResponse = await fetch(`${API_BASE}/api/ideas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Should Fail',
        description: 'This should fail without authentication'
      })
    })

    if (noAuthResponse.status === 401) {
      console.log('✅ Correctly rejected unauthenticated request!')
      console.log('   Status: 401 Unauthorized')
      console.log('')
    } else {
      console.log('❌ Unexpected response!')
      console.log('   Status:', noAuthResponse.status)
      console.log('')
    }

    console.log('🎉 All tests completed!')

  } catch (error) {
    console.error('❌ Test failed with error:', error.message)
    console.error('   Make sure the server is running on', API_BASE)
    process.exit(1)
  }
}

// Get command line arguments
const args = process.argv.slice(2)
const apiKey = args[0]
const ideaId = args[1]

if (!apiKey) {
  console.error('❌ Error: Please provide a Bot API Key')
  console.error('Usage: node test-bot-api.js <BOT_API_KEY> [IDEA_ID]')
  console.error('')
  console.error('Example:')
  console.error('  node test-bot-api.js opc_abc123def456')
  console.error('  node test-bot-api.js opc_abc123def456 existing-idea-id')
  process.exit(1)
}

testBotAPI(apiKey, ideaId)
