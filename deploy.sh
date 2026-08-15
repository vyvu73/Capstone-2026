#!/bin/bash
echo "🚀 Deploying to VPS..."
git push vps main
ssh vivi@104.248.222.51 "~/update.sh"
echo "✅ Deploy complete!"
