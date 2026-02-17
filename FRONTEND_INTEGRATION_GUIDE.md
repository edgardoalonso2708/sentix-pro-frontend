# 🎨 FRONTEND MULTI-WALLET - INTEGRATION GUIDE

## ✅ Components Created

All components are ready in `app/components/`:

1. **WalletSelector.jsx** - Dropdown for selecting wallets
2. **CreateWalletModal.jsx** - Modal to create new wallets
3. **MultiWalletPortfolio.jsx** - Complete portfolio dashboard with multi-wallet support
4. **PortfolioUploadWithWallet.jsx** - CSV upload with wallet selection

---

## 🚀 Quick Integration

### Option 1: Add Multi-Wallet Tab to Existing Frontend

Edit `app/SentixProFrontend.jsx`:

```javascript
// Add import at the top
import { MultiWalletPortfolio, PortfolioUploadWithWallet } from './components';

// Inside the component, add a new tab option
const [tab, setTab] = useState("dashboard");
// Options: "dashboard", "signals", "portfolio", "multiWallet", "alerts"

// Add tab button in navigation
<button
  onClick={() => setTab("multiWallet")}
  style={tab === "multiWallet" ? activeTabStyle : inactiveTabStyle}
>
  💼 Multi-Wallet
</button>

// Add tab content
{tab === "multiWallet" && (
  <div>
    <MultiWalletPortfolio
      userId="default-user"  // Replace with actual user ID
      apiUrl={API_URL}
    />

    <div style={{ marginTop: 32 }}>
      <PortfolioUploadWithWallet
        userId="default-user"  // Replace with actual user ID
        apiUrl={API_URL}
        onSuccess={() => {
          // Refresh portfolio data
          fetchPortfolio();
        }}
      />
    </div>
  </div>
)}
```

### Option 2: Replace Existing Portfolio Tab

Replace the old portfolio section with the new multi-wallet version:

```javascript
{tab === "portfolio" && (
  <MultiWalletPortfolio
    userId="default-user"
    apiUrl={API_URL}
  />
)}
```

### Option 3: Standalone Page

Create a new page `app/portfolio/page.tsx`:

```typescript
import { MultiWalletPortfolio } from '../components';

export default function PortfolioPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '24px' }}>
      <MultiWalletPortfolio
        userId="default-user"
        apiUrl={API_URL}
      />
    </div>
  );
}
```

---

## 📋 Component Props

### MultiWalletPortfolio

```typescript
<MultiWalletPortfolio
  userId="user-123"           // User ID (required)
  apiUrl="https://api..."     // API base URL (required)
/>
```

**Features**:
- Toggle between Consolidated and By Wallet views
- Create new wallets
- View P&L by wallet and consolidated
- Color-coded wallet cards

### PortfolioUploadWithWallet

```typescript
<PortfolioUploadWithWallet
  userId="user-123"           // User ID (required)
  apiUrl="https://api..."     // API base URL (required)
  onSuccess={() => {...}}     // Callback after successful upload (optional)
/>
```

**Features**:
- Wallet selection dropdown
- File upload with validation
- Template download
- Success/error messages

### WalletSelector

```typescript
<WalletSelector
  userId="user-123"           // User ID (required)
  onWalletSelect={(wallet) => {...}}  // Callback when wallet selected (required)
  selectedWalletId="uuid"     // Currently selected wallet ID (optional)
  apiUrl="https://api..."     // API base URL (required)
/>
```

### CreateWalletModal

```typescript
<CreateWalletModal
  isOpen={true}               // Modal visibility (required)
  onClose={() => {...}}       // Close callback (required)
  onSuccess={(wallet) => {...}}  // Success callback (required)
  userId="user-123"           // User ID (required)
  apiUrl="https://api..."     // API base URL (required)
/>
```

---

## 🎨 Styling

All components use **CSS-in-JS with styled-jsx** for zero configuration.

### Color Scheme

Components use the same dark theme as the existing frontend:

```javascript
background: #0f172a    // App background
card: #1e293b          // Card background
border: #334155        // Borders
text: #e2e8f0          // Primary text
muted: #94a3b8         // Secondary text
primary: #6366f1       // Primary color (gradients)
```

### Customization

To customize colors, edit the inline styles in each component or create a global theme file.

---

## 🔌 API Integration

Components automatically integrate with these endpoints:

```
GET    /api/wallets/:userId
POST   /api/wallets
PATCH  /api/wallets/:walletId
DELETE /api/wallets/:walletId
GET    /api/wallets/:userId/summary
POST   /api/portfolio/upload
GET    /api/portfolio/:userId
GET    /api/portfolio/:userId/wallet/:walletId
GET    /api/portfolio/:userId/consolidated
```

---

## 🧪 Testing

### 1. Start Backend

```bash
cd /c/proyectos/Sentix-pro
npm start
# Backend should be running on http://localhost:3001
```

### 2. Start Frontend

```bash
cd sentix-pro-frontend
npm run dev
# Frontend should be running on http://localhost:3000
```

### 3. Test Flow

1. Navigate to Multi-Wallet tab/page
2. Click "New Wallet"
3. Create a wallet (e.g., "Binance Main")
4. Upload a CSV file to that wallet
5. View P&L in Consolidated and By Wallet views

---

## 📦 CSV Upload Format

Template CSV:
```csv
Asset,Amount,Buy Price,Purchase Date,Notes,Transaction ID
bitcoin,0.5,42000,2024-01-15,Initial purchase,tx_123abc
ethereum,5.0,2500,2024-01-20,DCA entry,tx_456def
solana,100,85,2024-02-01,Swing trade,tx_789ghi
```

**Supported Assets**:
- Full names: `bitcoin`, `ethereum`, `solana`, `cardano`, `ripple`, `polkadot`, `dogecoin`, `binancecoin`, `avalanche-2`, `chainlink`
- Symbols: `BTC`, `ETH`, `SOL`, `ADA`, `XRP`, `DOT`, `DOGE`, `BNB`, `AVAX`, `LINK`

---

## 🐛 Troubleshooting

### Components not appearing

**Check**:
1. All components are in `app/components/` folder
2. Import path is correct: `import { MultiWalletPortfolio } from './components'`
3. Props are passed correctly (userId, apiUrl required)

### "Failed to fetch wallets"

**Check**:
1. Backend is running on correct URL
2. `API_URL` environment variable is set correctly
3. CORS is enabled in backend
4. Supabase migration was run

### Upload fails with "Wallet ID is required"

**Check**:
1. A wallet is selected in WalletSelector
2. Wallet was created successfully
3. selectedWalletId is being passed to upload component

### Styling looks broken

**Check**:
1. styled-jsx is installed: `npm install styled-jsx`
2. No CSS conflicts with global styles
3. Parent container has proper dark background

---

## 🚢 Deployment

### Vercel (Recommended for Next.js)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy
cd sentix-pro-frontend
vercel

# 3. Set environment variable
# In Vercel dashboard: Settings → Environment Variables
# Add: NEXT_PUBLIC_API_URL = https://your-railway-url.up.railway.app
```

### Netlify

```bash
# 1. Build
cd sentix-pro-frontend
npm run build

# 2. Deploy .next folder
netlify deploy --prod --dir=.next

# 3. Set environment variable in Netlify dashboard
```

### Manual

```bash
# 1. Build
npm run build

# 2. Start production server
npm start

# 3. Set environment variables
export NEXT_PUBLIC_API_URL=https://your-backend.com
```

---

## 📚 Component Architecture

```
MultiWalletPortfolio
├── WalletSelector (dropdown)
├── CreateWalletModal (modal)
├── ConsolidatedSummary (cards)
├── ConsolidatedAssets (table)
└── WalletCard (expandable cards)

PortfolioUploadWithWallet
├── WalletSelector (dropdown)
└── File upload with validation
```

---

## ✅ Features Included

### MultiWalletPortfolio
- ✅ Toggle: Consolidated vs By Wallet views
- ✅ Summary cards: Total Value, Invested, P&L
- ✅ Assets table with multi-wallet aggregation
- ✅ Color-coded wallet cards
- ✅ Real-time P&L calculation
- ✅ Empty states with clear CTAs

### PortfolioUploadWithWallet
- ✅ Step-by-step upload flow
- ✅ Wallet selection required
- ✅ File validation (CSV only)
- ✅ Template download
- ✅ Success/error feedback
- ✅ Disabled states

### CreateWalletModal
- ✅ 17 provider options
- ✅ Color picker for visual identification
- ✅ Form validation
- ✅ Duplicate name detection
- ✅ Loading states

---

## 🔜 Future Enhancements

- [ ] Edit wallet details
- [ ] Delete positions
- [ ] Historical P&L charts
- [ ] Export to PDF/CSV
- [ ] Wallet transfer feature
- [ ] Advanced filters (by asset, timeframe)
- [ ] Mobile responsive improvements

---

## 📞 Support

**Issues?**
- Check console for errors
- Verify API endpoints in Network tab
- Check props are passed correctly
- Review backend logs

**Questions?**
- See PHASE2_MULTI_WALLET_GUIDE.md for backend details
- See component source code for implementation details

---

**🎉 You're all set! Your frontend now supports professional multi-wallet portfolio management!**
