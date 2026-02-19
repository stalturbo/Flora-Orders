## Packages
date-fns | Date formatting for orders
framer-motion | Animation for page transitions and layout changes
recharts | Charts for the dashboard
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility for merging Tailwind CSS classes
react-day-picker | Date picker component for order delivery dates

## Notes
- Authentication is handled via Replit Auth (`/api/login`, `/api/logout`, `/api/auth/user`).
- The app uses a role-based system (OWNER, MANAGER, FLORIST, COURIER).
- Orders have a status workflow: NEW -> IN_WORK -> ASSEMBLED -> ON_DELIVERY -> DELIVERED.
- UI should be responsive and mobile-friendly as couriers/florists might use it on phones/tablets.
