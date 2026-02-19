# FloraOrders - Flower Delivery Management

## Overview
FloraOrders is a cross-platform flower delivery management application built with Expo/React Native + Express.js + PostgreSQL. It supports multiple user roles (OWNER, MANAGER, FLORIST, COURIER) and manages order workflows, delivery tracking, financial reporting, and employee statistics.

## Architecture
- **Frontend**: Expo SDK 54 / React Native 0.81.5, Expo Router for navigation
- **Backend**: Express.js 5, serves on port 5000
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Custom email/password sessions stored in DB
- **UI**: Custom component library with theming (ThemeContext)

## Key Directories
- `app/` - Expo Router pages (home, login, order CRUD, reports, settings, etc.)
- `components/` - Shared UI components (OrderCard, SearchBar, StatusBadge, etc.)
- `context/` - React contexts (Auth, Data, Theme)
- `lib/` - API client, types, validation utilities
- `server/` - Express backend with routes, auth, DB connection
- `shared/` - Shared schema (Drizzle ORM)

## Running
- **Server**: `npm run server:dev` (workflow: Server)
- **Expo Dev**: `npm run expo:dev`
- **Build**: `npm run expo:static:build`

## Database
- PostgreSQL via Drizzle ORM, schema in `shared/schema.ts`
- Push schema: `npx drizzle-kit push`
- Tables: organizations, users, sessions, orders, order_attachments, order_history, order_assistants, courier_locations, courier_location_latest, business_expenses, dev_settings

## Design System
- **Tokens**: `lib/tokens.ts` — unified spacing (xs=6, sm=10, md=14, lg=16, xl=20), radius (sm=12, md=16, lg=20, pill=999), font sizes (badge=11, secondary=13, body=14, title=16, header=18), touch targets (min=42, rowHeight=44)
- **Glass Card Style**: semi-transparent backgrounds (light: rgba(255,255,255,0.82), dark: rgba(30,41,59,0.85)), 1px border with borderLight, soft shadow, borderRadius 18, overflow hidden
- **GlassCard component**: `components/GlassCard.tsx` — reusable wrapper with glass effect
- **OrderCard**: structured layout — Header (order#, StatusBadge, overdue pill) / Client name / Address (2 lines max) / DateTime / Payment row (amount + payBadge) / Source row (colored circle icon) / Actions (42x42 round buttons)
- **Source colors**: PHONE #607D8B, WHATSAPP #25D366, TELEGRAM #0088cc, INSTAGRAM #E1306C, WEBSITE #2196F3, OTHER #9E9E9E
- **Pressed state**: opacity 0.96, scale 0.995

## Deploy
- **One-command deploy**: `bash deploy/package-for-vps.sh` — builds frontend + server, uploads to tmpfiles.org, outputs ready VPS command
- VPS command pattern: `cd /opt/floraorders && rm -rf dist/ server_dist/ && wget -O deploy-package.tar.gz "<URL>" && tar xzf deploy-package.tar.gz && sudo systemctl restart floraorders`

## Recent Changes (Feb 2026)
- **v1.1.0**: Major update with order filtering, auto-refresh, payment proofs, back button fix
- **Order filtering**: Florists/couriers see only their assigned orders; unassigned orders moved to "Доступные заказы" page via /api/orders/available
- **Auto-refresh**: Orders auto-refresh every 15s via polling in DataContext; order detail also polls every 15s for photos/status updates
- **Courier photos**: Couriers can now add photos to orders (was florist/manager/owner only)
- **Payment proof**: New PAYMENT_PROOF attachment type with upload/display in payment details section
- **Back button**: Persistent back button on all screens via global headerBackVisible: true; removed headerShown:false from map/dev screens
- **Courier map**: new `app/courier-map.tsx` page with Leaflet map showing courier's assigned orders, GPS position, route lines; list/map toggle view
- **Geolocation fix**: courier location now sends regardless of active order (was blocked when no ON_DELIVERY/ASSEMBLED order); broadened active order detection to include NEW/IN_WORK statuses
- **Navigate button**: redesigned with label "Маршрут" and border for better visibility on OrderCard
- **API**: added GET /api/courier/my-orders (courier's assigned orders with coords), GET /api/courier-map-page (Leaflet HTML for courier map), GET /api/orders/available (unassigned orders for florists/couriers)
- **UI redesign**: Glass card design system with unified tokens, GlassCard component, redesigned OrderCard/DashboardCard/StatusBadge/StatusFilter/SearchBar/Button
- Photo storage: photos uploaded as base64, saved to server /uploads/ directory, served via static middleware
- Photo ownership: uploadedByUserId column tracks who uploaded each photo; only uploader or MANAGER/OWNER can delete
- Photo UI: visible delete button (X icon) on photos for authorized users; photos resolve via server URL with resolvePhotoUri helper
- Courier location indicator: home screen shows green "Геолокация передаётся" badge when tracking active, red error badge if no location access
- useCourierLocationTracker now returns trackingStatus and lastSentAt for UI consumption
- Courier location auto-tracking: hook sends GPS every 30s when courier has active delivery, with 20m distance throttling
- Employee statistics fixes: miniStat values now use period-filtered data (today/week/month) instead of all-time totals
- Employee stats: revenue button now shows period-filtered revenue, canceled count also period-filtered
- Employee stats: order drill-down API accepts `?period=today|week|month` to filter results
- Employee stats: auto-refresh every 60 seconds
- Server stats API: period-filtered revenue and canceled counts added to today/week/month response objects
- VPS deploy: server bundled with esbuild into server_dist/index.js, deploy-package.tar.gz ready
- Navigate button (Yandex Maps) now available for ALL roles, not just COURIER
- Navigate uses coordinates when available for precise map links
- Search bar visible for ALL roles (was MANAGER/OWNER only)
- Search triggers on button press / Enter key instead of debounce-on-type
- "Просрочено" (Overdue) dashboard card is now clickable with sticky filter toggle
- DELIVERED/CANCELED orders sorted to bottom of order list
- Business expense categories clickable in financial reports (navigate to expenses page)
- Order expense row clickable with drill-down in financial reports

- **v1.2.0**: Large photo support, real-time SSE, available orders fix, dev panel compact
- Large photo uploads: expo-image-manipulator compresses to max 2048px/0.7 JPEG; server accepts up to 50MB per photo, 100MB JSON body limit
- Real-time SSE: /api/events endpoint broadcasts order/attachment/assignment changes to all organization members; client auto-reconnects with polling fallback
- Available orders: florists see all orders without assigned florist, couriers see all without assigned courier (excluding DELIVERED/CANCELED)
- Dev panel: compact stat cards with clickable navigation to relevant tabs, smaller buttons/spacing
- Settings stats: clickable employee statistics open EmployeeStatsModal with drill-down to individual orders
- Order detail and available-orders pages also use SSE for instant updates

## User Preferences
- App language: Russian (all UI labels in Russian)
- Currency: Russian Ruble (₽)
