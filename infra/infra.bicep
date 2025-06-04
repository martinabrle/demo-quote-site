param staticWebAppName string
param location string = resourceGroup().location

resource staticSite 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: 'https://github.com/martinabrle/demo-quote-site'
    branch: 'main'
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    provider: 'GitHub'
    enterpriseGradeCdnStatus: 'Disabled'
  }
}
output staticSiteName string = staticSite.name
output staticSiteUrl string = staticSite.properties.defaultHostname
output staticSiteId string = staticSite.id
