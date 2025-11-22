# MealTogether Frontend

React + TypeScript application for collaborative meal planning.

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher

## Development Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration:
# VITE_API_URL=http://localhost:5000
# VITE_WS_URL=http://localhost:5000
```

### 3. Start Development Server

```bash
npm run dev
```

Application runs at: http://localhost:5173

## Available Scripts

### Development
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
npm run format       # Format code with Prettier (if configured)
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   ├── features/       # Feature-specific components
│   │   └── layout/         # Layout components
│   ├── contexts/           # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── FamilyContext.tsx
│   │   └── WebSocketContext.tsx
│   ├── pages/              # Page components
│   │   ├── auth/           # Login, Register
│   │   ├── recipes/        # Recipe management
│   │   ├── shopping/       # Shopping lists
│   │   └── cooking/        # Cooking sessions
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API client and WebSocket
│   ├── types/              # TypeScript type definitions
│   ├── lib/                # Library configurations
│   ├── router.tsx          # Route definitions
│   ├── App.tsx             # Root component
│   └── main.tsx            # Entry point
├── public/                 # Static assets
├── dist/                   # Build output
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies
```

## Key Technologies

- **React 18** - UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Socket.IO Client** - WebSocket communication
- **Tailwind CSS** - Utility-first CSS framework
- **React Hook Form** - Form handling
- **Zod** - Schema validation

## Build Optimization

The build is optimized for production with:
- Code splitting by route
- Tree shaking
- Minification with Terser
- Console log removal
- Vendor chunk splitting
- Gzip/Brotli compression

View bundle analysis:
```bash
npm run build
open dist/stats.html
```

## Development Tips

### Hot Reload
Vite provides instant hot module replacement (HMR). Changes to components, styles, and most code will reflect immediately without full page reload.

### TypeScript Errors
TypeScript checks run during development. Fix type errors before committing:
```bash
npm run type-check
```

### React DevTools
Install React DevTools browser extension for debugging:
- Component tree inspection
- Props and state inspection
- Performance profiling

### API Development
Backend must be running at `http://localhost:5000`. Update `VITE_API_URL` in `.env.local` if using different port.

## WebSocket Connection

The app establishes WebSocket connection on login:
1. Connect to Socket.IO server
2. Emit `authenticate` with JWT token
3. Emit `join_family` to subscribe to family updates
4. Receive real-time updates for shopping lists, timers, etc.

## State Management

### Server State (TanStack Query)
- API data caching
- Background refetching
- Optimistic updates
- Automatic retry logic

### Client State (React Context)
- Authentication state
- Current family selection
- WebSocket connection state

### Local State (useState/useReducer)
- Form state
- UI state (modals, dropdowns)
- Temporary data

## Performance Considerations

- Routes are lazy-loaded to reduce initial bundle size
- List components are memoized to prevent unnecessary re-renders
- Context values are memoized to avoid cascading updates
- Images use lazy loading
- API requests are debounced where appropriate

## Production Build

```bash
# Build for production
npm run build

# Output in dist/ directory
# Deploy contents to web server
```

## Troubleshooting

### Build Fails
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors
```bash
# Check for errors
npm run type-check

# Common fixes:
# - Add missing type definitions
# - Update imports
# - Fix component props
```

### API Connection Issues
```bash
# Verify backend is running
curl http://localhost:5000/health

# Check environment variables
cat .env.local
```

### WebSocket Connection Issues
- Check backend WebSocket server is running
- Verify JWT token is valid
- Check browser console for connection errors
- Ensure CORS is configured correctly on backend

## Deployment

See `DEPLOYMENT.md` in project root for full deployment instructions.

Quick deployment to Lightsail:
```bash
# Build locally
npm run build

# Deploy to server
ssh -i ~/.ssh/LightsailDefaultKey-us-east-1.pem ubuntu@44.211.71.114
cd /opt/applications/meal-together/frontend
git pull
npm run build
sudo systemctl reload nginx
```
