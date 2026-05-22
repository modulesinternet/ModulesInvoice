# Firebase Serverless Deployment Guide 🚀

This document provides a comprehensive, step-by-step guide to hosting your **Smart Accounts** full-stack application completely serverless on **Firebase Hosting** and **Firebase Cloud Functions (v2)**.

---

## Part 1: How to Acquire All GitHub Secrets (Step-by-Step)

To automate your deployments via GitHub Actions, your pipeline needs authentication credentials. Here is how to gather each required value:

### 🔑 1. `GCP_PROJECT_ID`
* **What it is**: Your unique Firebase/Google Cloud Project Identifier.
* **Your specific Project ID**: `reverberant-grammar-ptgzl`
* **How to confirm it**: 
  1. Open the [Firebase Console](https://console.firebase.google.com/).
  2. Select your project.
  3. Click the **Gear icon (Project settings)** in the top-left sidebar.
  4. Under the **General** tab, look for **Project ID**.

---

### 🔑 2. `GEMINI_API_KEY`
* **What it is**: The authorization key used by your backend server to interact with Google's Gemini models.
* **How to get it**:
  1. Go to the [Google AI Studio API Keys Page](https://aistudio.google.com/app/apikey).
  2. Log in with your Google account.
  3. Click **Create API Key**.
  4. Select your Firebase project (`reverberant-grammar-ptgzl`) or create a general key.
  5. Copy the generated string (starts with `AIzaSy...`).

---

### 🔑 3. `GCP_SA_KEY` (Google Cloud Service Account JSON Key)
This is a secure private key that allows GitHub Actions to deploy resources into your Google Cloud project.

#### Step A: Enable Required Cloud APIs
Before creating the credentials, ensure the core deployment APIs are enabled on your Google Cloud Console:
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/) for your project.
2. Search for **API Library** in the top search bar.
3. Search for and **Enable** the following APIs (if not already enabled):
   * **Cloud Functions API**
   * **Cloud Build API**
   * **Artifact Registry API**
   * **Firebase Hosting API**

#### Step B: Create a Service Account
1. Open [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) in the GCP Console.
2. Click **➕ Create Service Account** at the top.
3. Enter details:
   * **Service account name**: `github-actions-deployer`
   * **Service account ID**: (automatically fills out)
4. Click **Create and Continue**.

#### Step C: Grant Roles & Permissions
During **Step 2 (Grant this service account access to project)**, assign the following roles:
* **Firebase Admin** (Provides permissions for Hosting, Firestore, and Functions)
* **Cloud Functions Developer** (To deploy functions)
* **Service Account User** (To allow Cloud Functions to run as your runtime service account)
* **Cloud Build Editor** (Required for compiling functions on the cloud)
* **API Keys Viewer** (Optional, to retrieve keys if needed)

Click **Continue**, then click **Done**.

#### Step D: Generate and Download the Private JSON Key
1. Find your newly created Service Account (`github-actions-deployer`) in the list.
2. Click the **Three Dots (Actions)** under the "Actions" column or click on the service account name, then navigate to the **Keys** tab.
3. Click **Add Key > Create New Key**.
4. Choose **JSON** as the key type.
5. Click **Create**.
6. A `.json` file will automatically download to your computer.
   * *⚠️ Security Warning: Keep this file extremely secure. Never commit it to git or share it publicly!*

---

### ⚙️ How to Enter Secrets into GitHub Settings
1. Go to your **GitHub Repository** page.
2. Click on the ⚙️ **Settings** tab at the top-right.
3. In the left-hand menu, scroll down and look under **Security** for **Secrets and variables > Actions**.
4. Click **New repository secret** (top-right button).
5. For each secret, enter the matching `Name` and paste the raw text inside `Secret`:
   * **Secret 1**:
     * **Name**: `GCP_PROJECT_ID`
     * **Value**: `reverberant-grammar-ptgzl`
   * **Secret 2**:
     * **Name**: `GEMINI_API_KEY`
     * **Value**: (Paste your long Gemini API Key)
   * **Secret 3**:
     * **Name**: `GCP_SA_KEY`
     * **Value**: (Open the downloaded Google Cloud `.json` key file, copy everything inside, and paste it here)
6. Click **Add secret** to save.

---

## Part 2: Complete Project Setup for Serverless Deployments

Instead of a bulky virtual machine or general container running 24/7, Firebase can run your application completely Serverless!

Here is the exact setup mapped to your workspace files:

### 1. The Single Express Backend Endpoint Integration
We have modified your `/server.ts` to export the `app` instance directly so it is compatible with Firebase Functions.

### 2. Firebase Configuration File (`firebase.json`)
Replace or expand your `/firebase.json` with the following configuration:
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": ".",
    "runtime": "nodejs18",
    "codebase": "default"
  },
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### 3. Creating a Serverless Cloud Function Entry Point
To connect the exported Express app to Firebase Functions runtime, you need a lightweight handler.
Create an entry point `/index.js` in the project root:

```js
import functions from 'firebase-functions';
import { app } from './dist/server.cjs'; // Points to your compiled production server

// Export the Firebase Cloud Function matching our firebase.json rewrite definition
export const api = functions.region('us-central1').https.onRequest(app);
```

### 4. Fully Automated GitHub Action Workflow (`.github/workflows/firebase-deploy.yml`)
To deploy your application completely free and automated to Firebase on every `git push`:

Create a workflow file `.github/workflows/firebase-deploy.yml`:
```yaml
name: Deploy to Firebase Serverless (Hosting & Functions)

on:
  push:
    branches:
      - main
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repo
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build Application
        run: npm run build
        env:
          NODE_ENV: production

      - name: Authenticate with Google
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Deploy to Firebase
        uses: w9jds/firebase-action@v2.2.0
        with:
          args: deploy --only hosting,functions
        env:
          GCP_PROJECT: ${{ secrets.GCP_PROJECT_ID }}
          # Set the Gemini API key into the Firebase Functions environment
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

---

## Part 3: Running Deployment from Your Command Line (Manual)

If you have Node.js and the Firebase CLI installed on your computer, you can deploy manually:

1. **Install Firebase tools globally**:
   ```bash
   npm install -g firebase-tools
   ```
2. **Log into your account**:
   ```bash
   firebase login
   ```
3. **Switch to your project**:
   ```bash
   firebase use reverberant-grammar-ptgzl
   ```
4. **Compile and build local files**:
   ```bash
   npm run build
   ```
5. **Deploy to production**:
   ```bash
   firebase deploy --only hosting,functions
   ```

Congrats! Your app is now running with 100% serverless scale, infinite performance, and zero idle cost.
