# Zenova Admin Panel — Backend Implementation Plan

---

## Existing Infrastructure We Leverage

| Component | Status |
|---|---|
| Role model (`Super Administrator`, `Administrator`, `Moderator`, `instructor`, `User`) | ✅ Exists |
| Permission model (controller + action RBAC) | ✅ Exists |
| JWT auth middleware (`authenticate.js`) | ✅ Exists |
| User model with `roles` field (ObjectId array → roles collection) | ✅ Exists |
| Paginate plugin on Role model | ✅ Exists |
| All 15+ tracking log models with `userId` + `timestamps` | ✅ Exists |

> [!IMPORTANT]
> **No admin routes, controllers, or services exist yet.** We are building the entire admin layer from scratch.

---

## Architecture Overview

```
src/
├── middlewares/
│   └── authorize.js              [NEW] — Role-based authorization guard
├── routes/
│   └── adminRoutes.js            [NEW] — All admin route definitions
├── controllers/
│   └── adminController.js        [NEW] — Admin endpoint handlers
├── services/
│   └── adminService.js           [NEW] — Business logic + aggregation queries
├── models/
│   ├── auditLogModel.js          [NEW] — Admin action audit trail
│   └── foodCacheModel.js         [NEW] — Cached food/nutrition API data (Future)
├── routes/
│   └── index.js                  [MODIFY] — Register admin routes
└── config/
    └── initialData.js            [MODIFY] — Seed admin permissions
```

---

## Category 1: 🟢 BASIC (Core Admin Panel — Build First)

These are the essential routes that every admin panel needs. They provide **user oversight, platform analytics, and management capabilities**.

---

### 1.1 Dashboard Analytics

High-level KPIs for the admin dashboard home screen.

| # | Route | Method | Description |
|---|---|---|---|
| 1 | `/api/admin/dashboard/overview` | GET | Total users, new users today/this week/this month, active users (logged in last 7 days), total NovaCoins in circulation |
| 2 | `/api/admin/dashboard/user-growth` | GET | User registration trend — daily/weekly/monthly counts with `?period=7d|30d|90d|1y` |
| 3 | `/api/admin/dashboard/activity-summary` | GET | Total logs across all categories (meals, workouts, sleep, etc.) for a given date range |
| 4 | `/api/admin/dashboard/top-features` | GET | Most-used tracking features ranked by log count (e.g., meal > workout > mood) |

**MongoDB Pattern** (example for user-growth):
```js
// Aggregation: Users grouped by registration date
User.aggregate([
  { $match: { createdAt: { $gte: startDate } } },
  { $group: {
    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
    count: { $sum: 1 }
  }},
  { $sort: { _id: 1 } }
]);
```

---

### 1.2 User Management

Full CRUD + search + filters on the users collection.

| # | Route | Method | Description |
|---|---|---|---|
| 5 | `/api/admin/users` | GET | List all users with pagination, search (fullName, email, phone), filter by role, sort by createdAt/lastActiveAt |
| 6 | `/api/admin/users/:userId` | GET | Get single user full profile (includes roles, gamification stats, onboarding status) |
| 7 | `/api/admin/users/:userId` | PATCH | Update user fields (fullName, email, roles, isVerified, etc.) |
| 8 | `/api/admin/users/:userId` | DELETE | Soft-delete or hard-delete a user account |
| 9 | `/api/admin/users/:userId/ban` | PATCH | Ban/unban a user (adds `isBanned` flag — requires minor schema addition) |
| 10 | `/api/admin/users/:userId/activity` | GET | Get activity timeline for a specific user — all tracking logs across categories with pagination |
| 11 | `/api/admin/users/:userId/stats` | GET | Get user's gamification stats (medals, rank, level, streaks, NovaCoins, quests completed) |
| 12 | `/api/admin/users/export` | GET | Export user list as JSON (filterable) |

**Query params for GET `/users`:**
```
?page=1&limit=20&search=john&role=User&sortBy=createdAt&order=desc&isOnboarded=true
```

---

### 1.3 User Activity & Engagement Analytics

Drill-down into how users are engaging with the platform.

| # | Route | Method | Description |
|---|---|---|---|
| 13 | `/api/admin/analytics/daily-active-users` | GET | DAU count for the last N days |
| 14 | `/api/admin/analytics/monthly-active-users` | GET | MAU count for the last N months |
| 15 | `/api/admin/analytics/retention` | GET | Retention rate — % of users who returned after Day 1, Day 7, Day 30 |
| 16 | `/api/admin/analytics/onboarding-funnel` | GET | How many users completed onboarding vs. dropped off |
| 17 | `/api/admin/analytics/feature-usage` | GET | Breakdown of which tracking features are used most (per day/week) |

**DAU aggregation pattern:**
```js
User.aggregate([
  { $match: { lastActiveAt: { $gte: last30Days } } },
  { $group: {
    _id: { $dateToString: { format: "%Y-%m-%d", date: "$lastActiveAt" } },
    uniqueUsers: { $addToSet: "$_id" }
  }},
  { $project: { date: "$_id", count: { $size: "$uniqueUsers" } } },
  { $sort: { date: 1 } }
]);
```

---

### 1.4 Role & Permission Management

Manage the RBAC system.

| # | Route | Method | Description |
|---|---|---|---|
| 18 | `/api/admin/roles` | GET | List all roles with their permissions |
| 19 | `/api/admin/roles` | POST | Create a new role |
| 20 | `/api/admin/roles/:roleId` | PATCH | Update role (name, description, permissions) |
| 21 | `/api/admin/roles/:roleId` | DELETE | Delete a role (prevent deleting built-in roles) |
| 22 | `/api/admin/permissions` | GET | List all available permissions |

---

### 1.5 Notification Management

View and manage push notifications.

| # | Route | Method | Description |
|---|---|---|---|
| 23 | `/api/admin/notifications` | GET | List all notifications (paginated, filterable by status/category) |
| 24 | `/api/admin/notifications/send` | POST | Send a push notification to a specific user or broadcast to all |
| 25 | `/api/admin/notifications/stats` | GET | Notification delivery stats (sent, read, dismissed rates) |

---

## Category 2: 🟡 EXTRA (Enhanced Admin Features — Build Second)

These are features that significantly **enhance admin power** — things a mature admin panel needs but are often forgotten.

---

### 2.1 Gamification Management

Control the gamification economy from the admin panel.

| # | Route | Method | Description |
|---|---|---|---|
| 26 | `/api/admin/gamification/economy-overview` | GET | Total NovaCoins earned/spent across all users, avg coins per user, top earners |
| 27 | `/api/admin/gamification/transactions` | GET | Browse all NovaTransaction records with filters (type, category, date range, userId) |
| 28 | `/api/admin/gamification/adjust-coins` | POST | Admin-adjust a user's NovaCoins (type: `admin_adjustment`) with reason |
| 29 | `/api/admin/gamification/leaderboard` | GET | Global leaderboard — top users by medals, level, or NovaCoins |

---

### 2.2 Quest Management

CRUD for quests (currently only seeded).

| # | Route | Method | Description |
|---|---|---|---|
| 30 | `/api/admin/quests` | GET | List all quests (active/inactive, by category) |
| 31 | `/api/admin/quests` | POST | Create new quest (title, description, condition, rewardCoins, badge, category, resetPeriod) |
| 32 | `/api/admin/quests/:questId` | PATCH | Update quest details |
| 33 | `/api/admin/quests/:questId` | DELETE | Deactivate/delete a quest |
| 34 | `/api/admin/quests/:questId/completions` | GET | See which users completed a specific quest |

---

### 2.3 AI & Chat Monitoring

Observe how users interact with the AI bots.

| # | Route | Method | Description |
|---|---|---|---|
| 35 | `/api/admin/ai/chat-stats` | GET | Total messages sent, msgs per bot (Calia/Noura/Aeron), avg messages per user |
| 36 | `/api/admin/ai/chat-history/:userId` | GET | View a specific user's chat history (for moderation/debugging) |
| 37 | `/api/admin/ai/api-usage` | GET | OpenRouter API call count, estimated cost, failures (requires adding a log model or counter) |

---

### 2.4 Content & Data Management

Manage exercises, workout plans, and meditation content.

| # | Route | Method | Description |
|---|---|---|---|
| 38 | `/api/admin/exercises` | GET | List all exercises |
| 39 | `/api/admin/exercises` | POST | Add a new exercise |
| 40 | `/api/admin/exercises/:id` | PATCH | Update exercise |
| 41 | `/api/admin/exercises/:id` | DELETE | Delete exercise |
| 42 | `/api/admin/meal-plans` | GET | List all AI-generated and static meal plans |

---

### 2.5 System Health & Monitoring

| # | Route | Method | Description |
|---|---|---|---|
| 43 | `/api/admin/system/health` | GET | Server uptime, memory usage, MongoDB connection status, Redis status |
| 44 | `/api/admin/system/logs` | GET | Recent application error logs (from Winston logger) |
| 45 | `/api/admin/system/cron-status` | GET | Status of cron jobs (notification scheduler, weekly/daily stat resets) |

---

### 2.6 Audit Log

Track every admin action for accountability.

| # | Route | Method | Description |
|---|---|---|---|
| 46 | `/api/admin/audit-logs` | GET | List all admin actions (who did what, when, on which resource) |

**New Model — `auditLogModel.js`:**
```js
{
  adminId: ObjectId → users,       // Who performed the action
  action: String,                  // 'user.update', 'user.delete', 'quest.create', etc.
  targetModel: String,             // 'users', 'quests', 'roles', etc.
  targetId: ObjectId,              // Which document was affected
  changes: Object,                 // { before: {...}, after: {...} }
  ipAddress: String,
  createdAt: Date
}
```

---

## Category 3: 🔵 FUTURE (Advanced Features — Build Later)

These are the features you specifically mentioned about **caching external API data** (food/nutrition lookups) so we don't have to call the API repeatedly.

---

### 3.1 Food & Nutrition Data Cache

> **The Concept**: When a user searches for a food item (e.g., "kitchen food" or "chicken biryani"), the app calls an external API (like Nutritionix, Edamam, or the OpenRouter Imagine API) to get nutritional values. Instead of calling the API every time, we **cache the result in MongoDB** so future lookups are instant and free.

| # | Route | Method | Description |
|---|---|---|---|
| 47 | `/api/admin/food-cache` | GET | List all cached food items (paginated, searchable) |
| 48 | `/api/admin/food-cache` | POST | Manually add a food item with its nutritional values |
| 49 | `/api/admin/food-cache/:id` | PATCH | Edit cached nutritional values (admin correction) |
| 50 | `/api/admin/food-cache/:id` | DELETE | Remove a cached food entry |
| 51 | `/api/admin/food-cache/stats` | GET | Cache hit rate, total cached items, most searched items |
| 52 | `/api/admin/food-cache/bulk-import` | POST | Bulk import food data from CSV/JSON |

**New Model — `foodCacheModel.js`:**
```js
{
  name: String,                    // "Chicken Biryani", "Paneer Tikka"
  nameNormalized: String,          // lowercase, trimmed for fast lookup
  category: String,                // "Indian", "Italian", "Snack", etc.
  calories: Number,
  protein: Number,
  carbs: Number,
  fats: Number,
  fiber: Number,
  servingSize: String,             // "1 plate", "100g", "1 cup"
  source: String,                  // "nutritionix", "openrouter", "admin_manual"
  imageUrl: String,                // cached image if from Imagine API
  metadata: Object,                // raw API response for reference
  searchCount: Number,             // how many times this was looked up (popularity)
  isVerified: Boolean,             // admin-verified = true
  createdAt: Date,
  updatedAt: Date
}
```

**How caching works (flow):**
```
User searches "Chicken Biryani"
       │
       ▼
  Check foodCache collection
       │
  ┌────┴────┐
  │ Found?  │
  ├── YES ──┤──→ Return cached data (FREE, instant)
  │         │    Increment searchCount
  └── NO ───┘
       │
       ▼
  Call External API (Nutritionix / OpenRouter)
       │
       ▼
  Save response → foodCache collection
       │
       ▼
  Return data to user
```

---

### 3.2 AI Response Cache

Cache AI-generated content to reduce API costs.

| # | Route | Method | Description |
|---|---|---|---|
| 53 | `/api/admin/ai-cache` | GET | View cached AI responses (recommendations, meal plans) |
| 54 | `/api/admin/ai-cache/:id` | DELETE | Invalidate specific cached responses |
| 55 | `/api/admin/ai-cache/settings` | PATCH | Configure cache TTL, enable/disable caching per module |

---

### 3.3 App Configuration (Feature Flags)

| # | Route | Method | Description |
|---|---|---|---|
| 56 | `/api/admin/config` | GET | Get all app configuration flags |
| 57 | `/api/admin/config` | PATCH | Toggle features on/off (e.g., disable meal AI, enable new tracker) |

---

## New Files Summary

| File | Type | Category |
|---|---|---|
| [NEW] `src/middlewares/authorize.js` | Middleware | Basic |
| [NEW] `src/routes/adminRoutes.js` | Routes | Basic |
| [NEW] `src/controllers/adminController.js` | Controller | Basic |
| [NEW] `src/services/adminService.js` | Service | Basic |
| [NEW] `src/models/auditLogModel.js` | Model | Extra |
| [NEW] `src/models/foodCacheModel.js` | Model | Future |
| [MODIFY] `src/routes/index.js` | Routes | Basic |
| [MODIFY] `src/config/initialData.js` | Seed data | Basic |
| [MODIFY] `src/models/userModel.js` | Model | Basic (add `isBanned` field) |

---

## Authorization Middleware Design

```js
// src/middlewares/authorize.js
// Usage: router.get('/admin/users', authenticate(), authorize('Super Administrator', 'Administrator'), handler)

const authorize = (...allowedRoles) => async (req, res, next) => {
  const user = await User.findById(req.user.id).populate('roles', 'name');
  const userRoles = user.roles.map(r => r.name);
  const hasAccess = allowedRoles.some(role => userRoles.includes(role));
  
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      data: {},
      message: 'Forbidden — insufficient permissions'
    });
  }
  next();
};
```

---

## Route Registration

```js
// In src/routes/index.js — add:
import adminRoutes from './adminRoutes';
router.use('/admin', adminRoutes);
// All admin routes will be under: /api/admin/*
```

---

## Delivery Phases

| Phase | Category | Routes | Estimated Effort |
|---|---|---|---|
| **Phase 1** | 🟢 Basic | #1 – #25 | Core priority |
| **Phase 2** | 🟡 Extra | #26 – #46 | Secondary priority |
| **Phase 3** | 🔵 Future | #47 – #57 | When external API integration is ready |

---

## Complete Route Summary Table

| # | Category | Method | Route | Purpose |
|---|---|---|---|---|
| 1 | 🟢 Basic | GET | `/api/admin/dashboard/overview` | Platform KPIs |
| 2 | 🟢 Basic | GET | `/api/admin/dashboard/user-growth` | Registration trends |
| 3 | 🟢 Basic | GET | `/api/admin/dashboard/activity-summary` | Tracking activity totals |
| 4 | 🟢 Basic | GET | `/api/admin/dashboard/top-features` | Feature usage ranking |
| 5 | 🟢 Basic | GET | `/api/admin/users` | List/search/filter users |
| 6 | 🟢 Basic | GET | `/api/admin/users/:userId` | User full profile |
| 7 | 🟢 Basic | PATCH | `/api/admin/users/:userId` | Update user |
| 8 | 🟢 Basic | DELETE | `/api/admin/users/:userId` | Delete user |
| 9 | 🟢 Basic | PATCH | `/api/admin/users/:userId/ban` | Ban/unban user |
| 10 | 🟢 Basic | GET | `/api/admin/users/:userId/activity` | User activity timeline |
| 11 | 🟢 Basic | GET | `/api/admin/users/:userId/stats` | User gamification stats |
| 12 | 🟢 Basic | GET | `/api/admin/users/export` | Export users |
| 13 | 🟢 Basic | GET | `/api/admin/analytics/daily-active-users` | DAU |
| 14 | 🟢 Basic | GET | `/api/admin/analytics/monthly-active-users` | MAU |
| 15 | 🟢 Basic | GET | `/api/admin/analytics/retention` | User retention |
| 16 | 🟢 Basic | GET | `/api/admin/analytics/onboarding-funnel` | Onboarding completion |
| 17 | 🟢 Basic | GET | `/api/admin/analytics/feature-usage` | Feature breakdown |
| 18 | 🟢 Basic | GET | `/api/admin/roles` | List roles |
| 19 | 🟢 Basic | POST | `/api/admin/roles` | Create role |
| 20 | 🟢 Basic | PATCH | `/api/admin/roles/:roleId` | Update role |
| 21 | 🟢 Basic | DELETE | `/api/admin/roles/:roleId` | Delete role |
| 22 | 🟢 Basic | GET | `/api/admin/permissions` | List permissions |
| 23 | 🟢 Basic | GET | `/api/admin/notifications` | List notifications |
| 24 | 🟢 Basic | POST | `/api/admin/notifications/send` | Send notification |
| 25 | 🟢 Basic | GET | `/api/admin/notifications/stats` | Notification stats |
| 26 | 🟡 Extra | GET | `/api/admin/gamification/economy-overview` | NovaCoins economy |
| 27 | 🟡 Extra | GET | `/api/admin/gamification/transactions` | All NC transactions |
| 28 | 🟡 Extra | POST | `/api/admin/gamification/adjust-coins` | Admin coin adjustment |
| 29 | 🟡 Extra | GET | `/api/admin/gamification/leaderboard` | Global leaderboard |
| 30 | 🟡 Extra | GET | `/api/admin/quests` | List quests |
| 31 | 🟡 Extra | POST | `/api/admin/quests` | Create quest |
| 32 | 🟡 Extra | PATCH | `/api/admin/quests/:questId` | Update quest |
| 33 | 🟡 Extra | DELETE | `/api/admin/quests/:questId` | Delete quest |
| 34 | 🟡 Extra | GET | `/api/admin/quests/:questId/completions` | Quest completions |
| 35 | 🟡 Extra | GET | `/api/admin/ai/chat-stats` | AI chat statistics |
| 36 | 🟡 Extra | GET | `/api/admin/ai/chat-history/:userId` | User chat history |
| 37 | 🟡 Extra | GET | `/api/admin/ai/api-usage` | API usage stats |
| 38 | 🟡 Extra | GET | `/api/admin/exercises` | List exercises |
| 39 | 🟡 Extra | POST | `/api/admin/exercises` | Add exercise |
| 40 | 🟡 Extra | PATCH | `/api/admin/exercises/:id` | Update exercise |
| 41 | 🟡 Extra | DELETE | `/api/admin/exercises/:id` | Delete exercise |
| 42 | 🟡 Extra | GET | `/api/admin/meal-plans` | List meal plans |
| 43 | 🟡 Extra | GET | `/api/admin/system/health` | Server health check |
| 44 | 🟡 Extra | GET | `/api/admin/system/logs` | Error logs |
| 45 | 🟡 Extra | GET | `/api/admin/system/cron-status` | Cron job status |
| 46 | 🟡 Extra | GET | `/api/admin/audit-logs` | Admin audit trail |
| 47 | 🔵 Future | GET | `/api/admin/food-cache` | List cached foods |
| 48 | 🔵 Future | POST | `/api/admin/food-cache` | Add food item |
| 49 | 🔵 Future | PATCH | `/api/admin/food-cache/:id` | Edit food item |
| 50 | 🔵 Future | DELETE | `/api/admin/food-cache/:id` | Remove food item |
| 51 | 🔵 Future | GET | `/api/admin/food-cache/stats` | Cache statistics |
| 52 | 🔵 Future | POST | `/api/admin/food-cache/bulk-import` | Bulk import foods |
| 53 | 🔵 Future | GET | `/api/admin/ai-cache` | View AI response cache |
| 54 | 🔵 Future | DELETE | `/api/admin/ai-cache/:id` | Invalidate AI cache |
| 55 | 🔵 Future | PATCH | `/api/admin/ai-cache/settings` | Cache settings |
| 56 | 🔵 Future | GET | `/api/admin/config` | App feature flags |
| 57 | 🔵 Future | PATCH | `/api/admin/config` | Toggle features |

---

## Verification Plan

### Automated Tests
- Test each admin route via Postman/REST client
- Verify authorization — regular `User` role gets 403 on all admin routes
- Test pagination, search, and filtering on `/admin/users`
- Verify aggregation queries return correct counts against known test data

### Manual Verification
- Seed test users and verify dashboard numbers match
- Test ban/unban flow end-to-end
- Verify audit logs record every admin action
- Test notification broadcast reaches target users

---

## Open Questions

> [!IMPORTANT]
> **1. Soft-delete vs Hard-delete for users?**  
> Should deleting a user permanently remove their data, or just mark them as `isDeleted: true` and hide from active queries? Soft-delete is recommended for data retention.

> [!IMPORTANT]
> **2. Which external API for food nutrition data?**  
> For the Future category food caching, which API will be used? Options: Nutritionix, Edamam, CalorieNinja, or OpenRouter-based custom lookup. This affects the `foodCacheModel` schema.

> [!NOTE]
> **3. Admin panel access level split?**  
> Currently, the existing roles are: `Super Administrator` (full access), `Administrator` (user management), `Moderator` (read-only user management). Should we keep this hierarchy or modify it for admin panel access?
