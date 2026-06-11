# Infrastructure

## Local development (Docker)

Start a local PostgreSQL instance that mirrors the Azure database:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Then point `apps/api/.env` at it:

```
DATABASE_URL=postgresql://bizsocial:bizsocial@localhost:5432/bizsocial360?schema=public
```

Apply the schema:

```bash
npm run db:migrate --workspace apps/api
```

Stop and remove (data is preserved in the named volume):

```bash
docker compose -f infra/docker-compose.yml down
```

## Azure deployment

The `azure/main.bicep` template provisions:

- **Azure Database for PostgreSQL — Flexible Server** (+ database, firewall rule)
- A **Linux App Service plan** hosting the **API** and **web** apps

Deploy:

```bash
az group create -n bizsocial360-rg -l westeurope

# Copy the example parameters and set a strong password (or pass --parameters inline)
cp azure/main.parameters.example.json azure/main.parameters.json

az deployment group create \
  -g bizsocial360-rg \
  -f azure/main.bicep \
  -p azure/main.parameters.json
```

The deployment outputs `postgresHost`, `apiUrl`, and `webUrl`.

### Production hardening (follow-ups)

- Store `DATABASE_URL` / DB password in **Azure Key Vault** and reference it from
  App Service settings instead of inlining the password (see ADR-0004).
- Restrict the database firewall to specific App Service outbound IPs or use
  VNet integration / Private Endpoint.
- Add staging and production deployment slots.
- Confirm the resource API versions and `linuxFxVersion` runtime against the
  latest Azure availability before deploying.
