# 🔍 Solana Exposure Scanner

> **Privacy Auditing Tool for Solana Wallets** - Analyze on-chain privacy exposure and identify potential KYC linkages, clustering risks, and identity correlations.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/solana-exposure-scanner)

![Solana Exposure Scanner](https://img.shields.io/badge/Solana-Mainnet-14F195?style=for-the-badge&logo=solana)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

## ✨ Features

- 🎯 **Real-Time Analysis** - Scan any Solana wallet address for privacy exposure
- 🔐 **KYC Detection** - Identify direct transfers to/from centralized exchanges
- 🕸️ **Clustering Analysis** - Detect wallet relationship patterns and interaction networks
- 💰 **Financial Exposure** - Calculate net worth and trading activity visibility
- 📚 **Educational Modal** - Learn about surveillance techniques, chain analysis, and real-world consequences
- ⏱️ **Timeline Visualization** - See your transaction history with surveillance level indicators
- 🎨 **Beautiful UI** - Modern, responsive design with dark mode
- ⚡ **Fast & Efficient** - Powered by Helius API for instant blockchain data access
- 🤖 **AI-Powered Insights** - Advanced pattern recognition for exposure scoring
- 🚨 **Concrete Examples** - Specific explanations of how each transaction exposes you

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- [Helius API Key](https://helius.dev) (free tier available)
- [Birdeye API Key](https://birdeye.so) (optional, for enhanced PnL data)

### Local Development

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/yourusername/solana-exposure-scanner.git
   cd solana-exposure-scanner
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configure environment variables**
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`
   
   Edit \`.env.local\` and add your API keys:
   \`\`\`env
   HELIUS_API_KEY=your_helius_api_key_here
   BIRDEYE_API_KEY=your_birdeye_api_key_here  # Optional
   \`\`\`

4. **Start development servers**
   \`\`\`bash
   # Start both frontend and backend
   npm run dev:all
   
   # Or start separately:
   npm run dev          # Frontend only (port 3000)
   npm run dev:server   # Backend only (port 3001)
   \`\`\`

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🌐 Deploy to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/solana-exposure-scanner)

### Manual Deployment

1. **Install Vercel CLI**
   \`\`\`bash
   npm i -g vercel
   \`\`\`

2. **Deploy**
   \`\`\`bash
   vercel
   \`\`\`

3. **Set Environment Variables**
   
   In your Vercel dashboard, add:
   - \`HELIUS_API_KEY\` - Your Helius API key
   - \`BIRDEYE_API_KEY\` - Your Birdeye API key (optional)

4. **Redeploy**
   \`\`\`bash
   vercel --prod
   \`\`\`

## 📖 How It Works

The Solana Exposure Scanner analyzes wallet privacy across five key dimensions:

### 1. **KYC Links** (30% weight)
- Detects transfers to/from known CEX addresses (Binance, Coinbase, Kraken, etc.)
- Identifies potential identity linkage through KYC platforms

### 2. **Clustering** (25% weight)
- Analyzes wallet interaction patterns
- Identifies frequently interacted addresses
- Detects potential wallet ownership clusters

### 3. **Activity Patterns** (20% weight)
- Transaction frequency analysis
- Historical activity fingerprinting
- Behavioral pattern detection

### 4. **Financial Exposure** (15% weight)
- Net worth calculation
- Portfolio visibility assessment
- Trading activity exposure

### 5. **Identity Metadata** (10% weight)
- SNS domain ownership detection
- NFT metadata analysis
- On-chain identity markers

## 🏗️ Architecture

\`\`\`
solana-exposure-scanner/
├── api/                    # Vercel serverless functions
│   └── index.ts           # API handler
├── server/                # Backend logic
│   ├── config/           # Environment configuration
│   ├── routes/           # API routes
│   ├── services/         # External API services
│   │   ├── helius.ts    # Helius blockchain data
│   │   ├── birdeye.ts   # Birdeye PnL data
│   │   └── analyzer.ts  # Exposure analysis engine
│   └── constants/        # Known addresses (CEX, protocols)
├── components/           # React components
├── hooks/               # Custom React hooks
├── lib/                # Utility functions
└── types/              # TypeScript definitions
\`\`\`

## 🔧 Tech Stack

**Frontend:**
- React 19 with TypeScript
- Vite for blazing-fast builds
- TailwindCSS (via CDN)
- React Router for navigation
- TanStack Query for data fetching
- Recharts for visualizations

**Backend:**
- Express.js serverless functions
- Helius API for blockchain data
- Birdeye API for PnL analytics
- TypeScript for type safety

**Deployment:**
- Vercel for hosting
- Serverless architecture
- Edge network CDN

## 📊 API Endpoints

### Health Check
\`\`\`
GET /api/health
\`\`\`

Response:
\`\`\`json
{
  "status": "ok",
  "timestamp": "2026-01-11T05:00:00.000Z",
  "heliusConfigured": true,
  "birdeyeConfigured": true
}
\`\`\`

### Scan Wallet
\`\`\`
GET /api/scan/:address
\`\`\`

Response:
\`\`\`json
{
  "exposureScore": 75,
  "scoreBreakdown": {
    "identity": 60,
    "kycLinks": 85,
    "financial": 50,
    "clustering": 70,
    "activity": 80
  },
  "netWorthUsd": 15420.50,
  "risks": [...],
  "links": {...}
}
\`\`\`

## 🔐 Privacy & Security

- **No Data Storage** - All analysis is performed in real-time, no wallet data is stored
- **Client-Side First** - Sensitive operations happen in your browser
- **Open Source** - Full transparency, audit the code yourself
- **API Key Security** - Environment variables never exposed to client

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and informational purposes only. Exposure scores are probabilistic estimates based on observable public data. Privacy in Web3 requires proactive measures beyond simple wallet separation.

## 🙏 Acknowledgments

- [Helius](https://helius.dev) - Blockchain data infrastructure
- [Birdeye](https://birdeye.so) - DeFi analytics
- [Solana](https://solana.com) - High-performance blockchain

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for the Solana ecosystem**
