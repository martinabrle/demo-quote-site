# demo-quote-site

A static HTML quote site with Microsoft Entra ID (Azure AD) authentication for external identities, deployed as an Azure Static Web App.

## Features
- Random quote display
- Microsoft Entra ID (Azure AD) authentication using MSAL.js
- Supports external/B2B users (if configured in Entra ID)
- Automated Azure deployment scripts and Bicep infrastructure

## Getting Started

### Prerequisites
- Azure subscription
- Azure CLI
- Node.js (for local development, optional)

### Deployment

1. **Configure Azure Resource Group**
   ```bash
   az group create --name <resource-group> --location <location>
   ```

2. **Deploy Static Web App Infrastructure**
   ```bash
   az deployment group create \
     --resource-group <resource-group> \
     --template-file infra/infra.bicep \
     --parameters staticWebAppName=<your-static-web-app-name>
   ```

3. **Register Azure AD App (Entra ID)**
   - Go to Azure Portal > Entra ID > App registrations > New registration
   - Set redirect URI to: `https://<your-static-web-app-name>.azurestaticapps.net/.auth/login/aad/callback`
   - Copy the Application (client) ID and update it in `script.js` (MSAL config)

4. **Deploy Static Files**
   - Use Azure Static Web Apps deployment or upload files via Azure Portal

### GitHub Actions (CI/CD)
- See `infra/deploy.yml` for automated deployment and Azure AD App registration
- Set required secrets in your GitHub repository

## External Identities
- To allow external/B2B users, configure your Entra ID tenant for external collaboration or use Entra ID B2C for social logins
- Update MSAL config in `script.js` as needed

---

