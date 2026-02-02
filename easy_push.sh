#!/bin/bash

# エラーが発生したら停止
set -e

echo "📦 Gitへのアップロードを開始します..."

# 変更をステージング
git add .

# コミットメッセージの入力（引数がなければ入力を求める）
if [ -z "$1" ]; then
  echo "コミットメッセージを入力してください (未入力の場合は日時が入ります):"
  read -r msg
else
  msg="$1"
fi

# メッセージが空なら現在時刻を入れる
if [ -z "$msg" ]; then
    msg="Update $(date +'%Y-%m-%d %H:%M:%S')"
fi

echo "📝 コミット中: $msg"
git commit -m "$msg"

# プッシュ
echo "🚀 GitHubへプッシュ中..."
git push origin main

echo "✅ 完了しました！"
