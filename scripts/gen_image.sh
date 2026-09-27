#!/bin/bash
# TokenDance seedream-5.0-pro 生图  $1=prompt $2=output $3=size(默认2K)
# 需要环境变量 TOKENDANCE_API_KEY(或写入 server/.env 后 source)
KEY="${TOKENDANCE_API_KEY:?请先 export TOKENDANCE_API_KEY=sk-...}"
PROMPT="$1"; OUT="$2"; SIZE="${3:-2K}"
BODY=$(python3 -c "import json,sys;print(json.dumps({'model':'seedream-5.0-pro','prompt':sys.argv[1],'size':sys.argv[2],'output_format':'png','response_format':'url','watermark':False}))" "$PROMPT" "$SIZE")
RESP=$(curl -s -m 280 https://tokendance.space/gateway/ark/v3/images/generations \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -d "$BODY")
URL=$(echo "$RESP" | python3 -c "import json,sys
try: print(json.load(sys.stdin)['data'][0]['url'])
except Exception: sys.exit(1)")
if [ -z "$URL" ]; then echo "FAIL: $(echo "$RESP" | head -c 300)"; exit 1; fi
curl -s -m 120 -o "$OUT" "$URL" && echo "OK $OUT $(stat -c%s "$OUT") bytes"
