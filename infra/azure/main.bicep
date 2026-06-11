// BizSocial360 — Azure infrastructure starter.
// Provisions Azure Database for PostgreSQL Flexible Server plus a Linux App
// Service plan hosting the API and web apps.
//
// Deploy:
//   az group create -n bizsocial360-rg -l westeurope
//   az deployment group create -g bizsocial360-rg \
//     -f infra/azure/main.bicep -p infra/azure/main.parameters.json
//
// NOTE: For production, move DATABASE_URL into Azure Key Vault and reference it
// from app settings instead of passing the password inline (see ADR-0004).

@description('Azure region for all resources.')
param location string = resourceGroup().location

@description('Short name prefix for resource names.')
param namePrefix string = 'bizsocial360'

@description('PostgreSQL administrator login.')
param postgresAdminUser string

@description('PostgreSQL administrator password.')
@secure()
param postgresAdminPassword string

@description('PostgreSQL major version.')
param postgresVersion string = '16'

@description('Name of the application database.')
param databaseName string = 'bizsocial360'

var postgresServerName = '${namePrefix}-pg-${uniqueString(resourceGroup().id)}'
var appPlanName = '${namePrefix}-plan'
var apiAppName = '${namePrefix}-api-${uniqueString(resourceGroup().id)}'
var webAppName = '${namePrefix}-web-${uniqueString(resourceGroup().id)}'

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: postgresAdminUser
    administratorLoginPassword: postgresAdminPassword
    version: postgresVersion
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: databaseName
}

// Allows Azure-hosted services (e.g. App Service) to reach the database.
resource allowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource appPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appPlanName
  location: location
  kind: 'linux'
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true
  }
}

var databaseUrl = 'postgresql://${postgresAdminUser}:${postgresAdminPassword}@${postgres.properties.fullyQualifiedDomainName}:5432/${databaseName}?sslmode=require'

resource apiApp 'Microsoft.Web/sites@2023-12-01' = {
  name: apiAppName
  location: location
  properties: {
    serverFarmId: appPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appSettings: [
        { name: 'NODE_ENV', value: 'production' }
        { name: 'PORT', value: '8080' }
        { name: 'DATABASE_URL', value: databaseUrl }
        { name: 'CORS_ORIGIN', value: 'https://${webAppName}.azurewebsites.net' }
      ]
    }
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  properties: {
    serverFarmId: appPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appSettings: [
        { name: 'NODE_ENV', value: 'production' }
        { name: 'API_URL', value: 'https://${apiAppName}.azurewebsites.net' }
      ]
    }
  }
}

output postgresHost string = postgres.properties.fullyQualifiedDomainName
output apiUrl string = 'https://${apiApp.properties.defaultHostName}'
output webUrl string = 'https://${webApp.properties.defaultHostName}'
