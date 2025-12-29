#!/bin/bash

echo "=== TG 抖音 API 部署脚本 ==="
echo ""

# 检查是否已登录
if ! railway whoami &>/dev/null; then
    echo "📝 请先登录 Railway..."
    railway login
fi

echo ""
echo "✅ 登录成功！"
echo ""

# 初始化项目
echo "📦 初始化 Railway 项目..."
railway init --name tg-douyin-api

echo ""
echo "🗄️ 添加 PostgreSQL 数据库..."
railway add --database postgres

echo ""
echo "🔧 配置环境变量..."
railway variables set NODE_ENV=production
railway variables set PORT=3002
railway variables set JWT_SECRET=$(openssl rand -hex 32)
railway variables set JWT_EXPIRES_IN=7d
railway variables set BOT_TOKEN=8293378994:AAFVy2_wZ5oUKsvTnrej_zay4NGiARgAD_g
railway variables set FRONTEND_URL=https://douyin-nine-omega.vercel.app

echo ""
echo "🚀 开始部署..."
railway up

echo ""
echo "🌐 生成域名..."
railway domain

echo ""
echo "=== 部署完成！==="
