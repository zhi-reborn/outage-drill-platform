#!/bin/bash

echo "========================================="
echo "WebSocket 连接测试"
echo "========================================="

API_BASE_URL="http://localhost:8080/api"
WS_URL="ws://localhost:8080/api/ws"

echo ""
echo "步骤 1: 获取认证 Token"
echo "-----------------------------------------"

LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败，无法获取 Token"
  exit 1
fi

echo "✅ Token 获取成功"

echo ""
echo "步骤 2: 测试 WebSocket 连接"
echo "-----------------------------------------"

if command -v wscat &> /dev/null; then
  echo "使用 wscat 测试 WebSocket 连接..."
  
  timeout 10s wscat -c "${WS_URL}?token=${TOKEN}" || echo "WebSocket 连接测试完成"
else
  echo "⚠️  wscat 未安装，跳过 WebSocket 连接测试"
  echo ""
  echo "安装 wscat 的方法:"
  echo "npm install -g wscat"
  echo ""
  echo "手动测试 WebSocket 连接的方法:"
  echo "1. 在浏览器中打开 http://localhost:3000"
  echo "2. 登录后打开开发者工具"
  echo "3. 在 Console 中执行:"
  echo "   const ws = new WebSocket('${WS_URL}?token=${TOKEN}')"
  echo "   ws.onopen = () => console.log('WebSocket connected')"
  echo "   ws.onmessage = (e) => console.log('Message:', e.data)"
fi

echo ""
echo "========================================="
echo "WebSocket 测试完成"
echo "========================================="