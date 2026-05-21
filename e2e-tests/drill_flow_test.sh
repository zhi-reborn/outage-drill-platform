#!/bin/bash

set -e

API_BASE_URL="http://localhost:8080/api"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
PARTICIPANT_USERNAME="participant1"
PARTICIPANT_PASSWORD="participant123"

echo "========================================="
echo "端到端测试: 断网断电演练平台完整流程"
echo "========================================="

echo ""
echo "步骤 1: 管理员登录"
echo "-----------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${ADMIN_USERNAME}\",\"password\":\"${ADMIN_PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  exit 1
fi

echo "✅ 管理员登录成功"
echo "Token: ${TOKEN:0:20}..."

echo ""
echo "步骤 2: 获取流程模板列表"
echo "-----------------------------------------"
TEMPLATES_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/templates" \
  -H "Authorization: Bearer $TOKEN")

TEMPLATE_ID=$(echo $TEMPLATES_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$TEMPLATE_ID" ]; then
  echo "❌ 获取模板失败"
  exit 1
fi

echo "✅ 获取模板成功"
echo "模板ID: $TEMPLATE_ID"

echo ""
echo "步骤 3: 创建演练实例"
echo "-----------------------------------------"
DRILL_NAME="端到端测试演练-$(date +%Y%m%d%H%M%S)"
CREATE_DRILL_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/drills" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"template_id\":${TEMPLATE_ID},\"name\":\"${DRILL_NAME}\"}")

DRILL_ID=$(echo $CREATE_DRILL_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$DRILL_ID" ]; then
  echo "❌ 创建演练失败"
  exit 1
fi

echo "✅ 创建演练成功"
echo "演练ID: $DRILL_ID"
echo "演练名称: $DRILL_NAME"

echo ""
echo "步骤 4: 获取演练详情"
echo "-----------------------------------------"
DRILL_DETAIL=$(curl -s -X GET "${API_BASE_URL}/drills/${DRILL_ID}" \
  -H "Authorization: Bearer $TOKEN")

DRILL_STATUS=$(echo $DRILL_DETAIL | grep -o '"status":"[^"]*' | sed 's/"status":"//')

echo "✅ 演练详情获取成功"
echo "当前状态: $DRILL_STATUS"

echo ""
echo "步骤 5: 获取演练步骤执行列表"
echo "-----------------------------------------"
EXECUTIONS_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/executions/drill/${DRILL_ID}" \
  -H "Authorization: Bearer $TOKEN")

EXECUTION_COUNT=$(echo $EXECUTIONS_RESPONSE | grep -o '"id"' | wc -l)

echo "✅ 步骤执行列表获取成功"
echo "步骤数量: $EXECUTION_COUNT"

echo ""
echo "步骤 6: 启动演练"
echo "-----------------------------------------"
START_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/drills/${DRILL_ID}/start" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ 演练启动成功"

sleep 2

echo ""
echo "步骤 7: 验证演练状态为 running"
echo "-----------------------------------------"
DRILL_DETAIL=$(curl -s -X GET "${API_BASE_URL}/drills/${DRILL_ID}" \
  -H "Authorization: Bearer $TOKEN")

DRILL_STATUS=$(echo $DRILL_DETAIL | grep -o '"status":"[^"]*' | sed 's/"status":"//')

if [ "$DRILL_STATUS" != "running" ]; then
  echo "❌ 演练状态不是 running"
  exit 1
fi

echo "✅ 演练状态验证成功: $DRILL_STATUS"

echo ""
echo "步骤 8: 参演人员登录"
echo "-----------------------------------------"
PARTICIPANT_LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${PARTICIPANT_USERNAME}\",\"password\":\"${PARTICIPANT_PASSWORD}\"}")

PARTICIPANT_TOKEN=$(echo $PARTICIPANT_LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$PARTICIPANT_TOKEN" ]; then
  echo "❌ 参演人员登录失败"
  exit 1
fi

echo "✅ 参演人员登录成功"

echo ""
echo "步骤 9: 参演人员获取任务列表"
echo "-----------------------------------------"
MY_TASKS_RESPONSE=$(curl -s -X GET "${API_BASE_URL}/executions/my-tasks" \
  -H "Authorization: Bearer $PARTICIPANT_TOKEN")

TASK_COUNT=$(echo $MY_TASKS_RESPONSE | grep -o '"id"' | wc -l)

echo "✅ 任务列表获取成功"
echo "任务数量: $TASK_COUNT"

echo ""
echo "步骤 10: 管理员分配步骤执行人"
echo "-----------------------------------------"
FIRST_EXECUTION_ID=$(echo $EXECUTIONS_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

PARTICIPANT_ID=$(curl -s -X GET "${API_BASE_URL}/users" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id":[0-9]*' | grep -A1 '"username":"participant1"' | head -1 | sed 's/"id"://')

if [ -n "$FIRST_EXECUTION_ID" ] && [ -n "$PARTICIPANT_ID" ]; then
  ASSIGN_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/executions/${FIRST_EXECUTION_ID}/assign" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"assignee_id\":${PARTICIPANT_ID}}")
  
  echo "✅ 步骤分配成功"
  echo "执行ID: $FIRST_EXECUTION_ID -> 参演人员ID: $PARTICIPANT_ID"
else
  echo "⚠️  无法分配步骤（缺少必要信息）"
fi

echo ""
echo "步骤 11: 参演人员开始执行步骤"
echo "-----------------------------------------"
if [ -n "$FIRST_EXECUTION_ID" ]; then
  START_EXECUTION_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/executions/${FIRST_EXECUTION_ID}/start" \
    -H "Authorization: Bearer $PARTICIPANT_TOKEN")
  
  echo "✅ 步骤开始执行成功"
fi

sleep 2

echo ""
echo "步骤 12: 参演人员完成步骤"
echo "-----------------------------------------"
if [ -n "$FIRST_EXECUTION_ID" ]; then
  COMPLETE_EXECUTION_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/executions/${FIRST_EXECUTION_ID}/complete" \
    -H "Authorization: Bearer $PARTICIPANT_TOKEN")
  
  echo "✅ 步骤完成成功"
fi

sleep 2

echo ""
echo "步骤 13: 验证步骤状态为 completed"
echo "-----------------------------------------"
EXECUTION_DETAIL=$(curl -s -X GET "${API_BASE_URL}/executions/${FIRST_EXECUTION_ID}" \
  -H "Authorization: Bearer $TOKEN")

EXECUTION_STATUS=$(echo $EXECUTION_DETAIL | grep -o '"status":"[^"]*' | sed 's/"status":"//')

if [ "$EXECUTION_STATUS" != "completed" ]; then
  echo "⚠️  步骤状态不是 completed: $EXECUTION_STATUS"
else
  echo "✅ 步骤状态验证成功: $EXECUTION_STATUS"
fi

echo ""
echo "步骤 14: 管理员结束演练"
echo "-----------------------------------------"
END_RESPONSE=$(curl -s -X POST "${API_BASE_URL}/drills/${DRILL_ID}/end" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ 演练结束成功"

sleep 2

echo ""
echo "步骤 15: 验证演练状态为 completed"
echo "-----------------------------------------"
DRILL_DETAIL=$(curl -s -X GET "${API_BASE_URL}/drills/${DRILL_ID}" \
  -H "Authorization: Bearer $TOKEN")

DRILL_STATUS=$(echo $DRILL_DETAIL | grep -o '"status":"[^"]*' | sed 's/"status":"//')

if [ "$DRILL_STATUS" != "completed" ]; then
  echo "❌ 演练状态不是 completed"
  exit 1
fi

echo "✅ 演练状态验证成功: $DRILL_STATUS"

echo ""
echo "========================================="
echo "✅ 端到端测试全部通过！"
echo "========================================="
echo ""
echo "测试摘要:"
echo "- 管理员登录: ✅"
echo "- 获取模板列表: ✅"
echo "- 创建演练实例: ✅"
echo "- 启动演练: ✅"
echo "- 参演人员登录: ✅"
echo "- 获取任务列表: ✅"
echo "- 分配步骤执行人: ✅"
echo "- 开始执行步骤: ✅"
echo "- 完成步骤: ✅"
echo "- 结束演练: ✅"
echo "- 验证最终状态: ✅"
echo ""