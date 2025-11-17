# Development Guide - Estatus Web

## Prerequisites

### Required Software
- **Node.js:** v18+ or v20+ (ES2020 support required)
- **npm:** v9+ (comes with Node.js)
- **TypeScript:** v5.2+ (included in devDependencies)
- **Git:** For version control

### System Requirements
- **OS:** Linux, macOS, or Windows (WSL2 recommended for Windows)
- **Memory:** 2GB+ RAM recommended
- **Disk Space:** 500MB+ for dependencies

---

## Initial Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd estatus-web
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

---

## Environment Configuration

### Frontend Configuration

No `.env` file required for basic development. Vite proxy is pre-configured.

**Proxy Configuration** (`vite.config.ts`):
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    }
  }
}
```

### Backend Configuration

**Environment Variables** (Optional):
```bash
# backend/.env (create if needed)
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

**Default Values:**
- `PORT`: 3001
- `CORS_ORIGIN`: http://localhost:5173

**Server Configuration:**

Edit `backend/servers.json` to configure monitored servers:

```json
[
  {
    "id": "server-001",
    "name": "Server Name",
    "ip": "192.168.1.10",
    "dnsAddress": "server.domain.com",
    "snmp": {
      "enabled": true,
      "disks": [
        { "index": 1, "name": "C:\\" },
        { "index": 2, "name": "D:\\" }
      ]
    },
    "netapp": {
      "enabled": false,
      "apiType": "rest",
      "username": "admin",
      "password": "password",
      "luns": [
        { "name": "lun1", "path": "/vol/volume/lun1" }
      ]
    }
  }
]
```

---

## Development Commands

### Frontend Development

**Start Dev Server:**
```bash
npm run dev
```
- Starts Vite dev server on http://localhost:5173
- Hot Module Replacement (HMR) enabled
- Auto-compiles TypeScript and React components
- Proxies `/api` requests to backend

**Build for Production:**
```bash
npm run build
```
- Compiles TypeScript
- Bundles with Vite
- Outputs to `dist/`
- Minifies and optimizes assets

**Preview Production Build:**
```bash
npm run preview
```
- Serves production build locally
- Test before deployment

**Lint Code:**
```bash
npm run lint
```
- Runs ESLint on `.ts` and `.tsx` files
- Checks for code quality issues
- Max warnings: 0 (strict mode)

---

### Backend Development

**Start Dev Server (Watch Mode):**
```bash
cd backend
npm run dev
```
- Starts Express server on http://localhost:3001
- Uses `tsx watch` for hot reload
- Auto-restarts on file changes
- Monitors servers defined in `servers.json`

**Build for Production:**
```bash
cd backend
npm run build
```
- Compiles TypeScript to JavaScript
- Outputs to `backend/dist/`
- Generates source maps and declaration files

**Start Production Server:**
```bash
cd backend
npm start
```
- Runs compiled JavaScript from `dist/`
- No hot reload
- Use PM2 or systemd for production deployment

**Lint Code:**
```bash
cd backend
npm run lint
```
- Runs ESLint on backend TypeScript files

---

## Running Both Parts Concurrently

**Option 1: Two Terminal Windows**
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd backend
npm run dev
```

**Option 2: Using tmux/screen**
```bash
tmux new -s estatus
# Split panes and run commands
```

**Option 3: Add Concurrently Script** (Recommended)
```bash
npm install --save-dev concurrently
```

Update root `package.json`:
```json
{
  "scripts": {
    "dev:frontend": "vite",
    "dev:backend": "cd backend && npm run dev",
    "dev": "concurrently \"npm:dev:frontend\" \"npm:dev:backend\""
  }
}
```

Then run:
```bash
npm run dev
```

---

## Testing

### Current State
- ⚠️ **No test files currently in project**
- Test frameworks need to be added

### Recommended Testing Setup

**Frontend Testing:**
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

**Backend Testing:**
```bash
cd backend
npm install --save-dev jest ts-jest @types/jest supertest @types/supertest
```

**Create Test Directories:**
```
src/__tests__/              # Frontend tests
backend/src/__tests__/      # Backend tests
```

---

## Code Quality

### TypeScript Configuration

**Frontend (`tsconfig.json`):**
- Target: ES2020
- Module: ESNext
- Strict mode enabled
- JSX: react-jsx

**Backend (`backend/tsconfig.json`):**
- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Output: dist/

### Linting

**ESLint Configuration:**
- Based on TypeScript ESLint recommended rules
- React hooks plugin enabled (frontend)
- Unused variables and parameters not allowed
- Max warnings: 0 (strict)

**Run Linting:**
```bash
# Frontend
npm run lint

# Backend
cd backend && npm run lint
```

---

## Common Development Tasks

### Adding a New React Component
1. Create component file: `src/components/NewComponent.tsx`
2. Define TypeScript interface for props
3. Implement functional component with hooks
4. Export component
5. Import and use in parent component

### Adding a New API Endpoint
1. Define route handler in `backend/src/routes/`
2. Implement business logic in `backend/src/services/`
3. Add TypeScript types to `backend/src/types/server.ts`
4. Update API client in `src/services/api.ts` (if needed)

### Adding a New Server to Monitor
1. Edit `backend/servers.json`
2. Add server object with required fields
3. Restart backend server
4. Server will appear in dashboard automatically

### Updating Tailwind Styles
1. Edit `tailwind.config.js` for theme changes
2. Use Tailwind classes in component `.tsx` files
3. Vite will auto-rebuild CSS

---

## Debugging

### Frontend Debugging

**Browser DevTools:**
- Open Chrome/Firefox DevTools
- Use React DevTools extension
- Check Console for errors
- Network tab for API calls

**Vite Logs:**
```bash
npm run dev
# Check terminal for compilation errors
```

### Backend Debugging

**Console Logging:**
- Backend logs to stdout/stderr
- Check terminal running `npm run dev`
- Includes request logging middleware

**Debug Mode (VS Code):**
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "cwd": "${workspaceFolder}/backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

---

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

### CORS Errors
- Ensure backend CORS_ORIGIN matches frontend URL
- Check `backend/src/config/constants.ts`
- Verify Vite proxy configuration

### TypeScript Compilation Errors
```bash
# Frontend
npx tsc --noEmit

# Backend
cd backend && npx tsc --noEmit
```

### Missing Dependencies
```bash
# Frontend
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
```

### SSE Connection Issues
- Check backend is running on port 3001
- Verify firewall allows connections
- Check browser console for EventSource errors
- Inspect Network tab for `/api/events` connection

---

## Hot Reload Behavior

**Frontend:**
- ✅ Instant HMR for React components
- ✅ Instant CSS updates
- ✅ Preserves component state when possible

**Backend:**
- ✅ Auto-restart on file changes (tsx watch)
- ⚠️ Clears monitoring state on restart
- ⚠️ SSE connections drop and reconnect

---

## Build Artifacts

**Frontend Build Output (`dist/`):**
- `index.html` - Entry HTML
- `assets/` - Bundled JS, CSS, fonts
- Source maps (for debugging)

**Backend Build Output (`backend/dist/`):**
- Compiled JavaScript files
- Type declaration files (`.d.ts`)
- Source maps

**Gitignore:**
- `node_modules/`
- `dist/`
- `*.log`
- `.env`

---

## Performance Tips

1. **Frontend:**
   - Use React DevTools Profiler
   - Monitor bundle size with `npm run build -- --analyze`
   - Lazy load components if needed

2. **Backend:**
   - Monitor ping service intervals
   - Adjust SNMP polling frequency
   - Use PM2 cluster mode for production

---

## Next Steps

After setup:
1. ✅ Verify both servers start successfully
2. ✅ Open browser to http://localhost:5173
3. ✅ Check server cards appear
4. ✅ Test real-time updates (stop/start monitored servers)
5. ✅ Review audio notifications on status changes
6. 📝 Add tests (recommended)
7. 📝 Set up CI/CD pipeline (recommended)
8. 📝 Add Docker support (recommended)
