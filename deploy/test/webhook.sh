# 1. Your secret token
SECRET="4390aef4b11cc66e920a660a4a3693005f3a390d100a5e5838a54a12176e6b4c"

# 2. Exact payload you are sending
PAYLOAD='{"ref":"refs/heads/develop"}'

# 3. Hash the payload using your secret via HMAC-SHA256
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

# 4. Pass the hash via the -H header in curl
  curl -X POST https://qa.buildingcode.aot-technologies.com/hooks/redeploy-app  \
   -H "Content-Type: application/json" -H "X-GitHub-Event: push" \
   -H "X-GitHub-Delivery: manual-test" -H "X-Hub-Signature-256: sha256=$SIG" \
   -d "$PAYLOAD"