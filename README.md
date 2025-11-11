# SecureChat - End-to-End Encrypted Messaging

## Project info

A secure messaging application with AES-256 and RSA encryption.

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

You can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

### Prerequisites

Before deploying, make sure you have:
1. A Supabase project set up ([supabase.com](https://supabase.com))
2. Your Supabase URL and Anon Key

### Option 1: Deploy to Vercel (Recommended)

**Step 1: Set up your environment variables**

Create a `.env` file in the root directory:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

**Step 2: Deploy using Vercel CLI**

```bash
# Login to Vercel (first time only)
vercel login

# Deploy to production
vercel --prod
```

Follow the prompts and add your environment variables when asked.

**Step 3: Or deploy via Vercel Dashboard**

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository
4. Add environment variables in the settings
5. Click "Deploy"

### Option 2: Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### Option 3: Deploy to GitHub Pages

Add this to your `package.json` scripts:
```json
"deploy": "npm run build && npx gh-pages -d dist"
```

Then run:
```bash
npm install -g gh-pages
npm run deploy
```

### Manual Deployment

For any other hosting provider:

1. Build the project: `npm run build`
2. Upload the `dist` folder to your hosting service
3. Make sure to set the environment variables in your hosting dashboard
