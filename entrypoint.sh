#!/bin/bash

# Add Bun to PATH
export BUN_INSTALL="/root/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Run the Bun command
exec "$@"
