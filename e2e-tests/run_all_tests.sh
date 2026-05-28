#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "运行所有端到端测试"
echo "========================================="
echo ""

echo "检查服务状态..."
echo "-----------------------------------------"

if ! curl -s http://localhost:8080/api/auth/login > /dev/null 2>&1; then
  echo "❌ 后端服务未启动"
  echo ""
  echo "请先启动后端服务:"
  echo "cd server && go run cmd/server/main.go"
  exit 1
fi

echo "✅ 后端服务已启动"

echo ""
echo "========================================="
echo "测试 1: API 接口测试"
echo "========================================="
echo ""

bash "${SCRIPT_DIR}/api_test.sh"

echo ""
echo "========================================="
echo "测试 2: 完整演练流程测试"
echo "========================================="
echo ""

bash "${SCRIPT_DIR}/drill_flow_test.sh"

echo ""
echo "========================================="
echo "测试 3: WebSocket 连接测试"
echo "========================================="
echo ""

bash "${SCRIPT_DIR}/websocket_test.sh"

echo ""
echo "========================================="
echo "所有端到端测试完成"
echo "========================================="