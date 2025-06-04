// Deploys a Static Web App for hosting a static site
// This template assumes the resource group already exists (Bicep cannot create a resource group at resourceGroup scope)

@description('Name of the Static Web App')
param staticWebAppName string

@description('Location for the Static Web App')
param location string = resourceGroup().location

resource staticWebApp 'Microsoft.Web/staticSites@2024-11-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  identity: {
    type: 'SystemAssigned'
  }
}

output staticWebAppUrl string = staticWebApp.properties.defaultHostname
