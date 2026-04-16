# Deploy

## Dev Environment
```bash
make dev
# Frontend: localhost:5175
# Backend: localhost:3000
```

## Production (Laptop 24/7)

### Stack
- Backend: Node.js + PM2 (port 3000)
- Database: Supabase (PostgreSQL)
- Frontend: Vercel

### Setup
1. Copy `.env.prod` and `deployment/` scripts to laptop
2. Run `deployment/start-backend.sh`
3. Run `deployment/setup-firewall.sh` (recommended)
4. Configure Vercel `VITE_API_URL` to laptop IP

### Scripts
| File | Purpose |
|------|---------|
| start-backend.sh | Build + start with PM2 |
| setup-firewall.sh | UFW + fail2ban |
| setup-nginx.sh | Rate limiting proxy |
| health-check.sh | Auto-restart if crashes |
| backup-env.sh | Encrypted backup |

See `~/projects/vespera-deployment/` for full scripts.