#!/bin/bash

# GTA Style Game 快速部署脚本

echo "🚀 开始更新游戏..."

# 1. 检查是否有未提交的更改
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ 没有未提交的更改"
else
    echo "📝 发现未提交的更改，正在提交..."
    
    # 显示修改的文件
    echo "修改的文件："
    git status --short
    
    # 添加所有修改
    git add .
    
    # 提交（使用默认提交信息或自定义）
    if [ -z "$1" ]; then
        COMMIT_MSG="Update game $(date '+%Y-%m-%d %H:%M:%S')"
    else
        COMMIT_MSG="$1"
    fi
    
    git commit -m "$COMMIT_MSG"
    echo "✅ 已提交: $COMMIT_MSG"
fi

# 2. 推送到 GitHub
echo "📤 推送到 GitHub..."
git push origin main
echo "✅ 已推送到 GitHub"

# 3. 部署到 GitHub Pages
echo "🌐 部署到 GitHub Pages..."
npm run deploy
echo "✅ 部署完成！"

echo ""
echo "🎮 游戏已更新！"
echo "访问: https://Tipiger.github.io/gta-style-game/"
