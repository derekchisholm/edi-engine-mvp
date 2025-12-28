# Cloud-Native EDI Engine

![Build Status](https://img.shields.io/github/actions/workflow/status/derekchisholm/edi-engine-mvp/deploy.yaml?branch=main&label=Azure%20Deployment)
![Azure](https://img.shields.io/badge/azure-%230072C6.svg?style=flat&logo=microsoftazure&logoColor=white)
![Terraform](https://img.shields.io/badge/terraform-%235835CC.svg?style=flat&logo=terraform&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)

A serverless, full-stack Electronic Data Interchange (EDI) platform capable of generating and parsing X12 business documents without relying on expensive commercial EDI libraries.

This project demonstrates a complete **GitOps workflow**, taking a TypeScript application from local development to production on **Azure Container Apps** via completely automated pipelines.

---

## 🏗 Architecture

The system is designed as a Microservice-style architecture using containerized components:

- **Frontend:** React 18 + TypeScript (Vite). Served via Nginx in a minimal Alpine container.
- **Backend:** Node.js (Fastify) + TypeScript. Implements a custom X12 lexer/parser engine.
- **Infrastructure:** Azure Container Apps (Serverless Kubernetes) for auto-scaling and zero-downtime deployments.
- **IaC:** Terraform manages all Azure resources (ACR, Container Apps, Log Analytics).
- **CI/CD:** GitHub Actions handles multi-stage Docker builds and blue/green-style deployments.

## 🚀 Features

- **Zero-Dependency EDI Engine:** Custom implementation of the ANSI X12 standard.
- **940 Generator:** Creates Warehouse Shipping Orders from web forms.
- **997 Generator:** Generates Functional Acknowledgments (Success/Failure receipts).
- **850 Parser:** Ingests raw X12 Purchase Order strings and converts them to JSON.
- **Dark Mode UI:** Modern, responsive interface built with CSS variables.

## 🛠️ Project Structure

```text
.
├── frontend/           # React application (Vite)
│   ├── Dockerfile      # Multi-stage build (Node -> Nginx)
│   └── nginx.conf      # Custom server config for SPA routing
├── infra/              # Terraform Infrastructure as Code
│   ├── main.tf         # Azure Container Apps & Networking definitions
│   └── outputs.tf      # Exposes dynamic Ingress URLs
├── src/                # Backend API & EDI Engine
│   ├── generators/     # Logic for creating X12 segments (940, 997)
│   ├── parsers/        # Logic for reading X12 (850)
│   └── server.ts       # Fastify entrypoint
├── Dockerfile          # Backend multi-stage build
└── .github/workflows/  # CI/CD Pipeline definitions
```

## 💻 Getting Started Locally

**Prerequisites**

- Node.js v20+
- Docker Desktop (optional, for container testing)

1. **Run the Backend (API)**
   The backend runs on port 3000.

```bash
# Install dependencies
npm install

# Start development server (hot-reload)
npm run start
```

2. **Run the Frontend (UI)**
   The frontend runs on port 5173.

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 to view the app.

---

## ☁️ Deployment (DevOps)

Deployment is fully automated. Pushing to the `main` branch triggers the GitHub Action.

**Infrastructure Provisioning**
Infrastructure is managed via Terraform.

```bash
cd infra
terraform init
terraform apply
```

This provisions:

1. Azure Resource Group
2. Azure Container Registry (ACR) for storing Docker images.
3. Container Apps Environment (Managed Kubernetes environment).
4. Container Apps (UI and API) with Ingress rules.

**CI/CD Pipeline**
The workflow defined in .github/workflows/deploy.yaml performs the following:

1. Builds the Backend & Frontend Docker images.
2. Pushes artifacts to Azure Container Registry (ACR) tagged with the Git SHA.
3. Updates the Azure Container Apps to point to the specific Git SHA image.
4. Injects the dynamic Backend URL into the Frontend build process at runtime.

---

## 📸 Screenshots

(Add screenshots of your Dashboard here)

---

### Pro Tip: The "Status Badge"

At the very top of the markdown, you'll see a line starting with `![Build Status]`.

To make this actually work (so it shows "Passing" in bright green):

1.  Replace `<YOUR_GITHUB_USERNAME>` with your actual GitHub handle.
2.  Replace `<YOUR_REPO_NAME>` with your repository name.

This is a huge green flag for hiring managers. It proves the code in the repo actually builds.
