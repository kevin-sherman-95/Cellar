#!/bin/bash
# Test winery search functionality
# Make sure your dev server is running first!

echo "🧪 Testing Winery Search API..."
echo ""

# Test 1: Basic list
echo "1. Testing basic winery list:"
curl -s "http://localhost:3000/api/wineries?limit=3" | jq -r '.wineries[].name' 2>/dev/null || echo "❌ Server not running or jq not installed"
echo ""

# Test 2: Search for "Opus"
echo "2. Testing search for 'Opus':"
curl -s "http://localhost:3000/api/wineries?q=Opus" | jq -r '.wineries[].name' 2>/dev/null || echo "❌ Server not running"
echo ""

# Test 3: Search for "Caymus"
echo "3. Testing search for 'Caymus':"
curl -s "http://localhost:3000/api/wineries?q=Caymus" | jq -r '.wineries[].name' 2>/dev/null || echo "❌ Server not running"
echo ""

# Test 4: Search for "Napa"
echo "4. Testing search for 'Napa' (first 5 results):"
curl -s "http://localhost:3000/api/wineries?q=Napa&limit=5" | jq -r '.wineries[].name' 2>/dev/null || echo "❌ Server not running"
echo ""

echo "✅ Tests complete!"
echo ""
echo "If you see results above, the search is working!"
echo "If you see errors, make sure:"
echo "  1. Your dev server is running (npm run dev)"
echo "  2. It's accessible at http://localhost:3000"




