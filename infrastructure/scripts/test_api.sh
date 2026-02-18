#!/bin/bash
# ================================================
# Test API Endpoints
# ================================================

BASE_URL="http://localhost:8000/api/v1"
TENANT="demo"

echo "================================================"
echo "🧪  MATCHCOTA API TESTS"
echo "================================================"
echo "Base URL: $BASE_URL"
echo "Tenant:   $TENANT"
echo ""

# 1. Health Check
echo "👉 1. Checking Health..."
curl -s -X GET "$BASE_URL/health" | jq . || curl -s -X GET "$BASE_URL/health"
echo ""
echo ""

# 2. Get Public Tenant Info
echo "👉 2. Getting Tenant Info (Public)..."
curl -s -X GET "$BASE_URL/tenants/current" \
  -H "X-Tenant-Slug: $TENANT" | jq . || curl -s -X GET "$BASE_URL/tenants/current" \
  -H "X-Tenant-Slug: $TENANT"
echo ""
echo ""

# 3. List Animals (Public)
echo "👉 3. Listing Animals (Public)..."
curl -s -X GET "$BASE_URL/animals" \
  -H "X-Tenant-Slug: $TENANT" | jq . || curl -s -X GET "$BASE_URL/animals" \
  -H "X-Tenant-Slug: $TENANT"
echo ""
echo ""

# 4. Login (Get Token)
echo "👉 4. Logging in as Admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "X-Tenant-Slug: $TENANT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@demo.com&password=admin123")

echo "$LOGIN_RESPONSE" | jq . || echo "$LOGIN_RESPONSE"
echo ""

# Extract Token (simple grep/sed if jq not available, but assuming jq for now or raw output)
# Try to extract token using grep/sed for compatibility if jq missing
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Connect Failed to get token"
else
    echo "✅ Token Token acquired"
    echo ""
    
    # 5. Get Protected User Info
    echo "👉 5. Getting Current User Info (Protected)..."
    curl -s -X GET "$BASE_URL/auth/me" \
      -H "X-Tenant-Slug: $TENANT" \
      -H "Authorization: Bearer $TOKEN" | jq . || curl -s -X GET "$BASE_URL/auth/me" \
      -H "X-Tenant-Slug: $TENANT" \
      -H "Authorization: Bearer $TOKEN"
fi

echo ""
echo "================================================"
echo "✅ Tests Completed"
echo "================================================"
