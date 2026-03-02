# Architecture Overview

This project is a full-stack mobile application for point-of-sale operations in car tire shops. It demonstrates modern mobile and backend development practices.

## System Design

### Frontend
- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **State Management:** React Context + Hooks, TanStack React Query
- **Persistance:** 
  - Local caching with RxDB/WatermelonDB for offline-first support
  - Automatic sync when online
  - Conflict resolution for concurrent updates

### Backend
- **Platform:** Appwrite (Backend-as-a-Service)
- **Databases:** Appwrite Collections (Inventory, Customers, Sales, Audit logs)
- **Authentication:** 
  - Google OAuth (native sign-in)
  - Session-based with user roles
- **Server-side Logic:** Custom Appwrite Functions (`functions/`)
  - Google native sign-in handler
  - Permission sync automation
  - Audit trail generation

### Key Features

#### 1. Role-Based Access Control (RBAC)
- Admin, Manager, Staff roles with fine-grained permissions
- Permission system synchronized to local database
- Audit logs tracking all permission changes and user actions

#### 2. Offline-First Sync
- When offline: app uses local RxDB/WatermelonDB
- When online: automatic two-way sync via Appwrite
- Conflict resolution via timestamps and sync metadata
- No data loss during connectivity gaps

#### 3. Core Business Features
- **Inventory Management:** Track tire stock with QR scanning
- **Customer Management:** Store and autofill customer data
- **Sales Tracking:** Record sales with automatic calculations
- **Thermal Printing:** Direct print to thermal receipt printers (Android)
- **Location Tracking:** GPS location capture at point-of-sale
- **Permissions:** Granular features hidden/shown based on user role

### Data Flow

```
Mobile App (React Native)
    ↓
Local Storage (RxDB/WatermelonDB) ← Offline support
    ↓
Appwrite SDK
    ↓
Appwrite Backend
    ├─ Collections (Inventory, Customers, Sales, Roles, Permissions, Audit)
    ├─ Authentication (Google OAuth)
    └─ Functions (Sync, Permissions, Auditing)
```

### Development & DevOps

- **Language:** TypeScript + React (type safety)
- **Linting:** ESLint + basic config
- **Testing:** Jest configured
- **CI/CD:** GitHub Actions workflow
  - Runs on every PR to `main`
  - TypeScript type-checking
  - Automated tests
  - ESLint validation
- **Package Management:** npm with legacy peer-deps for React 19 compatibility
- **Environment:** `.env.example` for secure credential management

### Deployment Readiness

- ✅ No hardcoded secrets (all in `.env`)
- ✅ Automated tests and type-checking
- ✅ CI/CD pipeline configured
- ✅ Clean git history with atomic commits
- ✅ Comprehensive README with setup instructions
- ✅ Organized folder structure (scripts/, components/, utils/, etc.)

## Decisions & Trade-offs

### Why RxDB + WatermelonDB?
- Powerful offline support for mobile
- Automatic sync when online
- Handles conflict resolution for concurrent edits
- Better than plain AsyncStorage for complex data

### Why Appwrite?
- All-in-one backend (auth, DB, functions, files)
- No infrastructure management needed
- Real-time sync support
- Custom functions for business logic

### Why React Native + Expo?
- Single codebase for Android/iOS
- Fast development iteration
- Over-the-air updates capability
- Large ecosystem

## Future Enhancements

- Advanced analytics dashboard
- Machine learning for demand forecasting
- Multi-store support with central admin
- Mobile payment integration
- Advanced conflict resolution UI

---

For development setup, see [README.md](README.md).
For contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md) (if available).
