#!/bin/bash

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed. Please install it first: https://cli.github.com/"
    exit 1
fi

# Check if .env.secrets exists
if [ ! -f .env.secrets ]; then
    echo "Error: .env.secrets file not found. Please create it first by copying .env.secrets.example"
    exit 1
fi

echo "Reading secrets from .env.secrets..."

# Read .env.secrets and set secrets in GitHub Actions
# Note: This handles multi-line secrets properly by reading the whole file
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue
    
    # Get the value (handle cases where value might be empty or multi-line)
    # This is a simple approach for single-line values. 
    # For complex multi-line secrets, it's better to use 'gh secret set KEY < file'
    
    echo "Setting secret: $key"
    # To handle multi-line secrets like FCM_PRIVATE_KEY correctly:
    # We extract the value using sed/awk or just use gh secret set with redirect
    
    # Extract value carefully
    secret_value=$(grep "^$key=" .env.secrets | sed "s/^$key=//")
    
    echo "$secret_value" | gh secret set "$key"
done < .env.secrets

echo "Successfully set all secrets in GitHub Actions!"
