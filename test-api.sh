#!/bin/bash

# Script de test pour l'API RudyProtect

API_URL="http://localhost:8080/api"
API_TOKEN="your-api-token-for-bot-communication-1234567890"

echo "🧪 Test API RudyProtect"
echo "========================="

# Test 1: Init Database
echo -e "\n1️⃣ Test init-db..."
curl -s "$API_URL/init-db" | jq .

# Test 2: Discord OAuth Authorization
echo -e "\n2️⃣ Test Discord OAuth..."
curl -s -X POST "$API_URL/auth/discord/authorize" | jq .

# Test 3: Health Check Bot API
echo -e "\n3️⃣ Test Bot API Health..."
curl -s -X POST "$API_URL/../bot-health" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" | jq .

echo -e "\n✅ Tests terminés!"
