#!/bin/bash

set -e

API_BASE_URL="http://localhost:8080/api"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"

echo "========================================="
echo "API 接口测试"
echo "========================================="

echo ""
echo "测试 1: 认证接口"
echo "-----------------------------------------"

echo "1.1 登录接口测试"
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${ADMIN_USERNAME}\",\"password\":\"${ADMIN_PASSWORD}\"}")

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -1)
BODY=$(echo "$LOGIN_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 登录接口返回 200"
else
  echo "❌ 登录接口返回 $HTTP_CODE"
fi

TOKEN=$(echo $BODY | grep -o '"token":"[^"]*' | sed 's/"token":"//')

echo "1.2 错误密码测试"
WRONG_LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${ADMIN_USERNAME}\",\"password\":\"wrongpassword\"}")

HTTP_CODE=$(echo "$WRONG_LOGIN_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ 错误密码返回 401"
else
  echo "❌ 错误密码返回 $HTTP_CODE"
fi

echo ""
echo "测试 2: 用户管理接口"
echo "-----------------------------------------"

echo "2.1 获取用户列表（需要认证）"
UNAUTHORIZED_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE_URL}/users")

HTTP_CODE=$(echo "$UNAUTHORIZED_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ 未认证请求返回 401"
else
  echo "❌ 未认证请求返回 $HTTP_CODE"
fi

echo "2.2 获取用户列表（已认证）"
USERS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE_URL}/users" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$USERS_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 已认证请求返回 200"
else
  echo "❌ 已认证请求返回 $HTTP_CODE"
fi

echo "2.3 获取当前用户信息"
ME_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE_URL}/users/me" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$ME_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 获取当前用户返回 200"
else
  echo "❌ 获取当前用户返回 $HTTP_CODE"
fi

echo ""
echo "测试 3: 模板管理接口"
echo "-----------------------------------------"

echo "3.1 获取模板列表"
TEMPLATES_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE_URL}/templates" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$TEMPLATES_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 获取模板列表返回 200"
else
  echo "❌ 获取模板列表返回 $HTTP_CODE"
fi

TEMPLATE_ID=$(echo "$TEMPLATES_RESPONSE" | head -n -1 | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

echo "3.2 获取单个模板"
TEMPLATE_DETAIL_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE_URL}/templates/${TEMPLATE_ID}" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$TEMPLATE_DETAIL_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 获取单个模板返回 200"
else
  echo "❌ 获取单个模板返回 $HTTP_CODE"
fi

echo ""
echo "测试 4: 演练管理接口"
echo "-----------------------------------------"

echo "4.1 创建演练"
CREATE_DRILL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/drills" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"template_id\":${TEMPLATE_ID},\"name\":\"API测试演练\"}")

HTTP_CODE=$(echo "$CREATE_DRILL_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ 创建演练返回 201"
else
  echo "❌ 创建演练返回 $HTTP_CODE"
fi

DRILL_ID=$(echo "$CREATE_DRILL_RESPONSE" | head -n -1 | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

echo "4.2 获取演练列表"
DRILLS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE_URL}/drills" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$DRILLS_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 获取演练列表返回 200"
else
  echo "❌ 获取演练列表返回 $HTTP_CODE"
fi

echo "4.3 获取单个演练"
DRILL_DETAIL_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE_URL}/drills/${DRILL_ID}" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$DRILL_DETAIL_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 获取单个演练返回 200"
else
  echo "❌ 获取单个演练返回 $HTTP_CODE"
fi

echo "4.4 启动演练"
START_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/drills/${DRILL_ID}/start" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$START_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 启动演练返回 200"
else
  echo "❌ 启动演练返回 $HTTP_CODE"
fi

echo "4.5 结束演练"
END_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/drills/${DRILL_ID}/end" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$END_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 结束演练返回 200"
else
  echo "❌ 结束演练返回 $HTTP_CODE"
fi

echo ""
echo "测试 5: 步骤执行接口"
echo "-----------------------------------------"

echo "5.1 获取演练步骤执行列表"
EXECUTIONS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE_URL}/executions/drill/${DRILL_ID}" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$EXECUTIONS_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 获取步骤执行列表返回 200"
else
  echo "❌ 获取步骤执行列表返回 $HTTP_CODE"
fi

echo "5.2 获取我的任务"
MY_TASKS_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE_URL}/executions/my-tasks" \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$MY_TASKS_RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 获取我的任务返回 200"
else
  echo "❌ 获取我的任务返回 $HTTP_CODE"
fi

echo ""
echo "========================================="
echo "✅ API 接口测试完成"
echo "========================================="