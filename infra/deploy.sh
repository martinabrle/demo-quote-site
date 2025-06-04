#!/bin/bash
# Deploy Azure Static Web App and guide for Entra ID/MSAL setup
# Usage: ./deploy.sh <staticWebAppName> <resourceGroup> <location>

set -e

if [ $# -ne 3 ]; then
  echo "Usage: $0 <staticWebAppName> <resourceGroup> <location>"
  exit 1
fi

STATIC_WEBAPP_NAME=$1
RESOURCE_GROUP=$2
LOCATION=$3

# Create resource group if it doesn't exist
echo "Creating resource group..."
az group create --name "$RESOURCE_GROUP" --location "$LOCATION"

echo "Deploying Static Web App..."
az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file infra/infra.bicep \
  --parameters staticWebAppName="$STATIC_WEBAPP_NAME" location="$LOCATION"

HOSTNAME=$(az staticwebapp show --name "$STATIC_WEBAPP_NAME" --resource-group "$RESOURCE_GROUP" --query "defaultHostname" -o tsv)

echo "\nDeployment complete!"
echo "Static Web App URL: https://$HOSTNAME"
echo "\nNext steps:"
echo "1. Go to Azure Portal > Entra ID > App registrations. Register a new app."
echo "2. Set the redirect URI to: https://$HOSTNAME/.auth/login/aad/callback"
echo "3. Copy the Application (client) ID and paste it in script.js (msalConfig)."
echo "4. Deploy your static files to the Static Web App."
