#!/bin/zsh

source /home/ubuntu/.zshrc

cd /home/ubuntu/projects/leetcode-contests

node dayZero.js
git add .
git commit -m "add contests"
git push
