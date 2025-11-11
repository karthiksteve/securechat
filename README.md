# SecureChat - End-to-End Encrypted Messaging

A secure, real-time messaging application with end-to-end encryption using AES-256-GCM and RSA-OAEP-2048.

## 🔐 Features

- **End-to-End Encryption**: Messages encrypted with AES-256-GCM
- **RSA Key Exchange**: 2048-bit RSA-OAEP for secure key distribution
- **Real-time Messaging**: Instant message delivery using Supabase Realtime
- **User Authentication**: Secure email/password authentication
- **Message History**: Encrypted message storage with selective decryption

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account ([sign up free](https://supabase.com))

### 1. Database Setup ⚠️ IMPORTANT

Before running the app, you MUST set up your database:

**See [SETUP_DATABASE.md](./SETUP_DATABASE.md) for detailed instructions.**

Quick version:
1. Go to your Supabase project's SQL Editor
2. Run the migrations in `supabase/migrations/` in order:
   - `20251111143544_29785be6-4723-4673-b7d3-c61bfe8d6183.sql`
   - `20251112000000_add_sender_encrypted_key.sql`

### 2. Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd securechat

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Add your Supabase credentials to .env:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Start development server
npm run dev
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add these environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_APP_URL` (your Vercel URL, e.g., https://yourapp.vercel.app)


## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **UI Components**: shadcn-ui + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Row Level Security)
- **Encryption**: Web Crypto API (AES-256-GCM, RSA-OAEP-2048)
- **Real-time**: Supabase Realtime subscriptions
- **Deployment**: Vercel

## 📁 Project Structure

```
├── src/
│   ├── pages/
│   │   ├── Auth.tsx          # Authentication page
│   │   ├── Chat.tsx          # Main chat interface
│   │   └── Index.tsx         # Landing page
│   ├── utils/
│   │   └── encryption.ts     # Encryption utilities
│   ├── components/ui/        # shadcn-ui components
│   └── integrations/
│       └── supabase/         # Supabase client
├── supabase/
│   └── migrations/           # Database migrations
└── public/                   # Static assets
```

## 🔒 How Encryption Works

1. **Key Generation**: Each user gets a unique RSA-2048 key pair
   - Public key stored in database
   - Private key stored in browser localStorage

2. **Sending a Message**:
   - Generate random AES-256 key
   - Encrypt message with AES key
   - Encrypt AES key with recipient's RSA public key → `encrypted_key`
   - Encrypt SAME AES key with sender's RSA public key → `sender_encrypted_key`
   - Store encrypted message + both encrypted keys + IV

3. **Reading Messages**:
   - **Received messages**: Decrypt `encrypted_key` with your private key → get AES key → decrypt message
   - **Sent messages**: Decrypt `sender_encrypted_key` with your private key → get AES key → decrypt message

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_APP_URL=http://localhost:5173  # For local dev
```

For production deployment, set `VITE_APP_URL` to your deployed URL.

## 📝 Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

```bash
# Build
npm run build

# Upload the 'dist' folder to your hosting provider
```

## ⚠️ Important Notes

- **Database Migration Required**: You MUST run the SQL migrations before the app works. See [SETUP_DATABASE.md](./SETUP_DATABASE.md)
- **Private Keys**: Stored in browser localStorage. Clearing browser data = losing access to old messages
- **Email Confirmation**: Supabase sends confirmation emails. Update Site URL in Supabase dashboard to match your domain

## 🐛 Troubleshooting

**"column 'sender_encrypted_key' does not exist"**
- Run the database migration: `supabase/migrations/20251112000000_add_sender_encrypted_key.sql`

**"Decryption failed" on sent messages**
- Clear browser data and sign in again to regenerate keys
- Old messages sent before migration won't be viewable

**Email confirmation not working**
- Set VITE_APP_URL in environment variables
- Update Supabase Site URL to match your production domain

## 📄 License

MIT

## 🤝 Contributing

This is a personal project. Feel free to fork and modify for your own use.

