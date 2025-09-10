#!/bin/bash
cd /home/kavia/workspace/code-generation/qa-interaction-platform-33485-33494/q_and_a_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

