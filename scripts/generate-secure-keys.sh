#!/bin/bash

# Script to generate secure keys for production environment
echo "Generating secure keys for production..."

# Generate encryption password
ENCRYPTION_PASSWORD=$(openssl rand -base64 32)
echo "VITE_ENCRYPTION_PASSWORD=$ENCRYPTION_PASSWORD"

# Generate app salt
APP_SALT=$(openssl rand -base64 32)
echo "VITE_APP_SALT=$APP_SALT"

# Generate session secret
SESSION_SECRET=$(openssl rand -base64 32)
echo "SESSION_SECRET=$SESSION_SECRET"

echo ""
echo "Copy these values to your .env.production file"
echo "NEVER commit these values to version control"
echo ""
echo "For Windows users, use Git Bash or WSL to run this script"