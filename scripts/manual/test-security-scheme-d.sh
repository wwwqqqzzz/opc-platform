#!/bin/bash

# 测试方案D：Bot 来源区分

API_KEY="opc_XX0yNFQr50N1mVkySFf98sQokYThLP5s"
BASE_URL="http://localhost:3000"

echo "=== 测试 1: 正确的 Bot 请求（包含 X-Bot-Source） ==="
curl -X GET "$BASE_URL/api/bots/me/verification-code" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-Bot-Source: external-server"

echo -e "\n\n=== 测试 2: 错误的 Bot 请求（缺少 X-Bot-Source） ==="
curl -X GET "$BASE_URL/api/bots/me/verification-code" \
  -H "Authorization: Bearer $API_KEY"

echo -e "\n\n=== 测试 3: 完全没有认证 ==="
curl -X GET "$BASE_URL/api/bots/me/verification-code"

echo -e "\n"
