#!/bin/bash
set -e

# Retry function for curl with exponential backoff
function retry {
  local n=1
  local max=5
  local delay=2

  while true; do
    "$@" && break || {
      if [[ $n -lt $max ]]; then
        ((n++))
        echo "Command failed. Attempt $n/$max:"
        sleep $((delay**n))
      else
        echo "The command has failed after $n attempts."
        return 1
      fi
    }
  done
}

# Install Bun with retry
retry curl https://bun.sh/install | bash

# Add Bun to PATH for the current script
export BUN_INSTALL="/root/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Verify Bun installation and set executable permissions
ls -l $BUN_INSTALL/bin
chmod +x $BUN_INSTALL/bin/bun

# Attempt to execute Bun binary directly with sh
sh -c "$BUN_INSTALL/bin/bun --help" || echo "Bun binary execution failed"
sh -c "$BUN_INSTALL/bin/bun install --production" || echo "Bun install failed"
