#!/bin/bash
# TokenDance seedream-5.0-pro 生图  $1=prompt $2=output $3=size(默认2K)
PROMPT="$1"; OUT="$2"; SIZE="${3:-2K}"
BODY=$(python3 -c "import json,sys;print(json.dumps({'model':'seedream-5.0-pro','prompt':sys.argv[1],'size':sys.argv[2],'output_format':'png','response_format':'url','watermark':False}))" "$PROMPT" "$SIZE")
RESP=$(curl -s -m 280 https://tokendance.space/gateway/ark/v3/images/generations \
  -H "Authorization: Bearer sk-f931bd31af8d28a526c71e50001a17028111fd9d12452b44" \
  -H "Content-Type: application/json" -d "$BODY")
URL=$(echo "$RESP" | python3 -c "import json,sys
try: print(json.load(sys.stdin)['data'][0]['url'])
except Exception as e: sys.exit(1)")
if [ -z "$URL" ]; then echo "FAIL: $(echo "$RESP" | head -c 300)"; exit 1; fi
curl -s -m 120 -o "$OUT" "$URL" && echo "OK $OUT $(stat -c%s "$OUT") bytes"
