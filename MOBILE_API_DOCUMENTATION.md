# thePhotoCrm Mobile API Documentation

**Version:** 1.0  
**Last Updated:** November 19, 2025  
**Target:** React Native iOS/Android App

## Table of Contents

1. [Mobile App Specifications](#mobile-app-specifications)
2. [Overview](#overview)
3. [Architecture](#architecture)
4. [Authentication](#authentication)
5. [API Endpoints](#api-endpoints)
6. [Data Models](#data-models)
7. [Mobile-Specific Considerations](#mobile-specific-considerations)
8. [Error Handling](#error-handling)
9. [Environment Variables](#environment-variables)

---

## Mobile App Specifications

### App Overview

The thePhotoCrm mobile app is a **photographer-only** iOS/Android application for managing their wedding photography business on-the-go.

**Key Principle:** The mobile app focuses exclusively on essential tasks photographers need while away from their desk - responding to clients, managing projects, and staying on top of their schedule.

**What About Clients?**

Clients do **NOT** need to download a mobile app. Instead, they access their portal through their mobile browser at `{photographer-slug}.tpcportal.co`. This approach:
- **Eliminates friction** - No app download required for clients
- **Always up-to-date** - No waiting for App Store approvals
- **Works perfectly on mobile** - The web portal is fully responsive
- **Multi-photographer friendly** - If a client hires multiple photographers, they just bookmark different portal URLs instead of managing multiple apps

This matches the proven model used by HoneyBook, the leading CRM for wedding professionals.

---

### Photographer Features (Simplified On-the-Go)

Photographers should have access to these **essential features only** on mobile:

#### ✅ Included Features

**1. Projects Dashboard**
- View all active projects in a scrollable list
- Quick status overview (stage, event date, client name)
- Tap to view project details
- Move projects between stages (drag & drop or quick action)
- Add quick notes to projects

**2. Messaging Inbox**
- View all conversations with clients
- Send/receive SMS and view email threads
- Receive messages from clients sent through their portal
- Quick replies with templates
- Attach photos from camera/library (MMS)
- Unread message badges

**3. Bookings & Calendar**
- View upcoming appointments
- See daily/weekly schedule
- Confirm or reschedule bookings
- View client booking requests

**4. Quick Actions**
- Send magic link to client
- Call/text client directly
- Mark important projects with star/flag
- Quick project creation

**5. Biometric Authentication**
- Face ID (iOS) / Fingerprint (Android) for quick login
- Optional - enable during onboarding or in settings
- Secure token storage in device keychain
- Fallback to password if biometric fails

**6. Profile & Settings**
- View business info
- Update availability
- Manage notification preferences
- Toggle Face ID/Touch ID
- Logout

#### ❌ Features NOT Included for Photographers

These features require desktop/laptop for full workflow:
- **Smart Files** (proposals, invoices, contracts) - Too complex for mobile editing
- **Automations** - Configuration requires larger screen
- **Drip Campaigns** - Email builder not mobile-optimized
- **Full Gallery Management** - Uploading 100+ photos better on desktop
- **Lead Forms** - Form builder too complex
- **Revenue Reports** - Analytics best viewed on larger screens
- **Testimonials Management** - Review and publish flow
- **Questionnaires** - Template creation and management
- **Package/Add-on Management** - Complex pricing configuration

**Why this limitation?**
- Focuses mobile app on what photographers actually need on-the-go
- Prevents complex workflows on small screens
- Keeps app simple and fast
- Encourages desktop use for important business configuration

---

### Why No Client Mobile App?

Clients access their portal through the **mobile-responsive web portal** at `{photographer-slug}.tpcportal.co` instead of downloading an app.

**Client Portal Features (Mobile Web):**
- View all projects and project details
- Sign contracts and make payments via Stripe
- Browse photo galleries with pinch-zoom
- Favorite and download photos
- Message their photographer
- Book and manage appointments
- Update contact information

**Benefits of Mobile Web for Clients:**
- **Zero friction** - Click magic link from email/SMS, instant access
- **No downloads** - Works immediately in any mobile browser
- **Always current** - No app updates required
- **Bookmarkable** - Save to home screen for app-like experience
- **Universal** - Works on any device, any platform

---

### Design System & Branding

#### Color Palette

**Primary Colors:**
```typescript
const colors = {
  // Primary brand color - dusty rose
  primary: '#8B4565',
  primaryLight: '#A65678',
  primaryDark: '#6D3650',
  
  // Neutral colors - HoneyBook inspired
  lightGray: '#F7F7F7',
  mediumGray: '#E5E5E5',
  darkGray: '#6B7280',
  
  // Semantic colors
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Background & Text
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB'
};
```

**Usage:**
- **Primary (#8B4565)** - Action buttons, active states, highlights
- **Light Gray (#F7F7F7)** - Sidebar backgrounds, card backgrounds
- **White (#FFFFFF)** - Main content areas
- **Success (#22C55E)** - Completed states, positive actions
- **Dark Gray (#6B7280)** - Secondary text, inactive icons

#### Typography

**Font Family:**
- **iOS:** SF Pro Display / SF Pro Text (system default)
- **Android:** Roboto (system default)

**Font Sizes:**
```typescript
const typography = {
  // Headers
  h1: { fontSize: 32, fontWeight: '700' },
  h2: { fontSize: 24, fontWeight: '600' },
  h3: { fontSize: 20, fontWeight: '600' },
  h4: { fontSize: 18, fontWeight: '600' },
  
  // Body
  body: { fontSize: 16, fontWeight: '400' },
  bodySmall: { fontSize: 14, fontWeight: '400' },
  
  // Special
  button: { fontSize: 16, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '400' },
  label: { fontSize: 14, fontWeight: '500' }
};
```

#### Spacing System

**8-point grid system:**
```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};
```

#### Component Styling

**Cards:**
```typescript
const cardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 3 // Android
};
```

**Buttons:**
```typescript
const primaryButton = {
  backgroundColor: '#8B4565',
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 24,
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '600'
};

const secondaryButton = {
  backgroundColor: 'transparent',
  borderWidth: 1,
  borderColor: '#8B4565',
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 24,
  color: '#8B4565'
};
```

**Inputs:**
```typescript
const inputStyle = {
  backgroundColor: '#F9FAFB',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 8,
  paddingVertical: 12,
  paddingHorizontal: 16,
  fontSize: 16
};
```

---

### Navigation Structure

The mobile app uses a **bottom tab navigation** pattern with stack navigators for each section.

```
┌─────────────────────────────────┐
│         Screen Header           │
├─────────────────────────────────┤
│                                 │
│      Main Content Area          │
│                                 │
│                                 │
├─────────────────────────────────┤
│ Projects  Inbox  Bookings  More │
└─────────────────────────────────┘
```

**Bottom Tab Bar:**
1. **Projects** (Home icon) - Projects dashboard with pipeline view
2. **Inbox** (Message icon + badge) - Messaging center for SMS/Email
3. **Bookings** (Calendar icon) - Upcoming appointments and availability
4. **More** (Menu icon) - Profile, settings, logout

**Stack Navigators:**
- **Projects Stack**: Projects List → Project Detail → Add Note → Contact Detail
- **Inbox Stack**: Conversations List → Thread Detail → Send Message
- **Bookings Stack**: Calendar View → Booking Detail → Reschedule
- **More Stack**: Profile → Settings → Edit Availability → Toggle Face ID

---

### Authentication UX Flow

#### Initial App Launch

```
App Opens
   │
   ├─ Check SecureStore for saved token
   │
   ├─ If token exists AND Face ID enabled
   │  └─ Show Face ID prompt
   │     ├─ Success → Validate token → Navigate to Dashboard
   │     └─ Fail → Show Login Screen
   │
   ├─ If token exists BUT Face ID disabled
   │  └─ Validate token → Navigate to Dashboard
   │
   └─ If no token
      └─ Show Login Screen
```

#### Login Screen

```tsx
<Screen>
  <Logo source={require('@assets/logo.png')} />
  <Heading>Welcome to thePhotoCrm</Heading>
  <Subheading>Manage your photography business on the go</Subheading>
  
  <Input 
    placeholder="Email" 
    keyboardType="email-address"
    autoCapitalize="none"
  />
  <Input 
    placeholder="Password" 
    secureTextEntry 
  />
  
  <Button onPress={handleLogin}>Log In</Button>
  
  <Divider text="OR" />
  
  <GoogleButton onPress={handleGoogleLogin}>
    Continue with Google
  </GoogleButton>
  
  <Row>
    <TextButton onPress={navigateToSignup}>
      Don't have an account? Sign up
    </TextButton>
  </Row>
  
  <TextButton onPress={navigateToForgotPassword}>
    Forgot Password?
  </TextButton>
</Screen>
```

#### Face ID Onboarding (After First Login)

```tsx
<Modal>
  <Icon name="face-id" size={64} color="#8B4565" />
  <Heading>Enable Face ID?</Heading>
  <Text>
    Use Face ID to quickly and securely log in 
    to your thePhotoCrm account
  </Text>
  
  <Button onPress={enableFaceID}>Enable Face ID</Button>
  <TextButton onPress={skipFaceID}>Not Now</TextButton>
</Modal>
```

#### Face ID Implementation

Uses `expo-local-authentication`:

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

// Check if device supports biometrics
const isAvailable = await LocalAuthentication.hasHardwareAsync();
const isEnrolled = await LocalAuthentication.isEnrolledAsync();

// Authenticate user
const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Log in to thePhotoCrm',
  fallbackLabel: 'Use Password',
  disableDeviceFallback: false
});

if (result.success) {
  // Retrieve token from SecureStore and navigate to app
}
```

---

### Key Screen Specifications

#### 1. Photographer - Projects List

**Layout:**
- Search bar at top
- Stage filter chips (horizontal scroll)
- Project cards in vertical list

**Project Card:**
```tsx
<Card>
  <Row>
    <Avatar>{clientInitials}</Avatar>
    <Column flex={1}>
      <Text weight="600">{projectTitle}</Text>
      <Text color="secondary">{clientName}</Text>
      <Row>
        <Badge color={stage.color}>{stage.name}</Badge>
        <Text size="small">{eventDate}</Text>
      </Row>
    </Column>
    <Icon name="chevron-right" />
  </Row>
</Card>
```

#### 2. Photographer - Inbox

**Layout:**
- Conversations list with unread badges
- Swipe actions (archive, star)
- Pull to refresh

**Conversation Card:**
```tsx
<Card onPress={() => navigate('Thread', { contactId })}>
  <Row>
    <Avatar>{contactInitials}</Avatar>
    <Column flex={1}>
      <Row justify="space-between">
        <Text weight="600">{contactName}</Text>
        <Text size="small" color="secondary">{timestamp}</Text>
      </Row>
      <Text numberOfLines={2} color="secondary">
        {lastMessage}
      </Text>
    </Column>
    {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
  </Row>
</Card>
```

#### 3. Bookings Calendar

**Layout:**
- Monthly calendar view
- Today indicator
- Dots on dates with bookings
- List view of upcoming appointments below calendar

**Booking Card:**
```tsx
<Card>
  <Row>
    <Column style={{ borderLeft: `4px solid ${eventType.color}` }}>
      <Text weight="600">{eventTitle}</Text>
      <Text color="secondary">{clientName}</Text>
      <Row>
        <Icon name="calendar" size={16} />
        <Text size="small">{eventDate}</Text>
      </Row>
      <Row>
        <Icon name="clock" size={16} />
        <Text size="small">{startTime} - {endTime}</Text>
      </Row>
    </Column>
    <IconButton name="more-vertical" onPress={showOptions} />
  </Row>
</Card>
```

#### 4. Project Detail

**Layout:**
- Hero section with client info and event date
- Quick actions (Call, Text, Email, Send Magic Link)
- Project timeline/status badges
- Notes section with add note button
- Recent activity feed

**Quick Actions:**
```tsx
<Row style={{ justifyContent: 'space-around' }}>
  <ActionButton 
    icon="phone" 
    label="Call"
    onPress={() => Linking.openURL(`tel:${clientPhone}`)}
  />
  <ActionButton 
    icon="message" 
    label="Text"
    onPress={() => navigateToSMS(contactId)}
  />
  <ActionButton 
    icon="mail" 
    label="Email"
    onPress={() => Linking.openURL(`mailto:${clientEmail}`)}
  />
  <ActionButton 
    icon="link" 
    label="Send Link"
    onPress={() => sendMagicLink(contactId)}
  />
</Row>
```

---

### Expo/React Native Component Recommendations

**UI Components:**
- `@react-navigation/native` + `@react-navigation/bottom-tabs` - Navigation
- `@expo/vector-icons` - Icons (MaterialCommunityIcons)
- `react-native-gesture-handler` - Swipe actions, gestures
- `react-native-calendars` - Calendar views for bookings

**Forms & Inputs:**
- `react-hook-form` + `zod` - Form validation
- `@react-native-picker/picker` - Dropdowns
- `react-native-date-picker` - Date selection

**Messaging:**
- `react-native-gifted-chat` - Chat UI (customize to match design)

**Media:**
- `expo-image-picker` - Photo attachment for MMS
- `expo-camera` - Direct camera access

**Authentication:**
- `expo-local-authentication` - Face ID / Touch ID / Fingerprint
- `expo-secure-store` - Secure token storage

**Notifications:**
- `expo-notifications` - Push notifications

**Storage:**
- `@react-native-async-storage/async-storage` - Offline data caching

**Utilities:**
- `date-fns` - Date formatting
- `react-native-mmkv` - Fast key-value storage (alternative to AsyncStorage)

---

###  Implementation Priority

**Phase 1: Core Authentication & Navigation (MVP)**
1. Login screen (email/password)
2. Google OAuth integration
3. JWT token storage in SecureStore
4. Auto-login on app launch
5. Bottom tab navigation setup (Projects, Inbox, Bookings, More)

**Phase 2: Essential Photographer Features**
6. Projects list screen with search and stage filters
7. Project detail screen with client info
8. Move project between stages
9. Add quick notes to project
10. Messaging inbox with unread badges
11. Thread detail view with message history
12. Send SMS/Email from app

**Phase 3: Calendar & Bookings**
13. Monthly calendar view with bookings
14. Upcoming appointments list
15. Booking detail view
16. Reschedule appointment functionality

**Phase 4: Polish & Advanced Features**
17. Face ID / Touch ID biometric authentication
18. Push notifications for new messages and bookings
19. Offline data caching for projects and messages
20. Quick actions (call, text, send magic link)
21. Profile & settings screens
22. Update availability preferences

---

## ⚠️ Backend Modifications Required for Mobile

The current backend is optimized for web browsers using httpOnly cookies and subdomain-based routing. Before building the mobile app, make these backend changes:

### 1. Return JWT Tokens in API Responses

**File:** `server/routes.ts`

**Modify Login Endpoint (around line 1268):**
```typescript
res.json({ 
  user: {
    id: result.user.id,
    email: result.user.email,
    role: result.user.role,
    photographerId: result.user.photographerId
  },
  token: result.token // ADD THIS LINE
});
```

**Modify Portal Token Endpoint (around line 1753):**
```typescript
const responseData: any = {
  success: true,
  user: { ... },
  photographer: { ... },
  token: jwtToken // ADD THIS LINE
};
```

### 2. Add Mobile Tenant Header Support

**File:** `server/middleware/domain-routing.ts`

**Step 2a:** Update the existing `Express.Request` interface to include `photographerId` (lines 6-11):

```typescript
declare global {
  namespace Express {
    interface Request {
      domain?: {
        type: 'photographer' | 'client_portal' | 'dev';
        photographerId?: string;        // ADD THIS LINE
        photographerSlug?: string;
        isCustomSubdomain?: boolean;
      };
    }
  }
}
```

**Step 2b:** Add mobile header support at the beginning of `detectDomain()` function (around line 24, BEFORE hostname detection):

```typescript
export function detectDomain(req: Request, res: Response, next: NextFunction) {
  // Support mobile apps via custom headers (lowercase as per HTTP spec)
  const mobilePhotographerId = req.headers['x-photographer-id'] as string | undefined;
  const mobileUserRole = req.headers['x-user-role'] as string | undefined;
  const mobilePhotographerSlug = req.headers['x-photographer-slug'] as string | undefined;

  if (mobilePhotographerId && mobileUserRole) {
    req.domain = {
      type: mobileUserRole === 'CLIENT' ? 'client_portal' : 'photographer',
      photographerId: mobilePhotographerId,
      photographerSlug: mobilePhotographerSlug,
      isCustomSubdomain: mobileUserRole === 'CLIENT'
    };
    console.log(`  → Mobile app detected: ${mobileUserRole} for photographer ${mobilePhotographerId}`);
    next();
    return;
  }
  
  // Existing hostname-based detection continues below...
  const hostname = req.hostname.toLowerCase();
  // ... rest of existing code
}
```

**Note:** Headers are lowercase (`x-photographer-id`, not `X-Photographer-Id`) as per HTTP specification.

### 3. Verify Authorization Header Support

**File:** `server/middleware/auth.ts`

✅ **Good news:** The backend already supports `Authorization: Bearer <token>` headers alongside cookie auth. No changes needed here.

The middleware checks for Bearer tokens first, then falls back to cookies. Mobile apps should use:

```typescript
fetch('/api/projects', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'x-photographer-id': photographerId,
    'x-user-role': 'PHOTOGRAPHER'
  }
});
```

---

## Overview

thePhotoCrm is a comprehensive multi-tenant CRM system for wedding photographers with a triple-domain architecture:

- **app.thephotocrm.com** - Photographer CRM dashboard
- **{slug}.tpcportal.co** - Client portal subdomains
- **thephotocrm.com** - Marketing website

The mobile app will serve BOTH photographers (CRM features) and clients (portal features) with different UI/UX based on their role.

### Key Features

**For Photographers:**
- Project & contact management
- Smart Files (proposals/invoices/contracts)
- Gallery management with native upload
- Two-way messaging (SMS/Email)
- Automation & drip campaigns
- Scheduling & availability
- Stripe Connect payments

**For Clients:**
- View projects & timelines
- Sign contracts & make payments
- Book appointments
- View & favorite gallery photos
- Message photographer

---

## Architecture

### Multi-Tenant Routing for Mobile Apps

**CRITICAL:** The web backend uses subdomain-based tenant isolation:
- Photographers: `app.thephotocrm.com`
- Clients: `{photographer-slug}.tpcportal.co`

The backend middleware (`detectDomain`, `loadPhotographerFromSubdomain`) derives tenant context from the request's `Host` header. 

**Mobile App Strategy:**

Since mobile apps can't use subdomain-based routing like browsers, you MUST implement the tenant header support described in "Backend Modifications Required" above.

**Mobile API calls should include:**

```typescript
// For photographer API calls
fetch('https://app.thephotocrm.com/api/projects', {
  headers: {
    'Authorization': `Bearer ${photographerToken}`,
    'x-photographer-id': photographerId, // UUID from token
    'x-user-role': 'PHOTOGRAPHER'
  }
});

// For client API calls
fetch('https://app.thephotocrm.com/api/client-portal/projects', {
  headers: {
    'Authorization': `Bearer ${clientToken}`,
    'x-photographer-id': photographerId, // UUID from token
    'x-user-role': 'CLIENT',
    'x-photographer-slug': photographerSlug // Optional, for portal routing
  }
});
```

**Why this is required:**
- The backend's `detectDomain` middleware derives tenant context from the request's `Host` header
- Mobile apps make all requests to the same base URL (`https://app.thephotocrm.com`)
- Custom headers (`x-photographer-id`, `x-user-role`) allow the backend to determine which tenant the request belongs to
- This approach works for both iOS and Android without platform-specific workarounds
- **Important:** Headers must be lowercase as per HTTP specification - React Native's fetch automatically lowercases all header names

**Implementation:** Make sure to apply Backend Modification #2 (tenant header support) before building the mobile app.

### Multi-Tenant Model

- Each photographer is a separate tenant with complete data isolation
- All data is scoped by `photographerId`
- Mobile app must ALWAYS include photographer context in requests

### Role-Based Access

Three user roles:
- `PHOTOGRAPHER` - Full CRM access
- `CLIENT` - Limited portal access
- `ADMIN` - Platform administration

### Authentication Flow

```
┌─────────────┐
│ Mobile App  │
└──────┬──────┘
       │
       ├─ Photographer Login: Email/Password or Google OAuth
       │  → Returns JWT with photographerId
       │
       └─ Client Login: Magic Link (passwordless)
          → Returns JWT with photographerId + clientId
```

---

## Authentication

### JWT Token Structure

**Photographer Token:**
```json
{
  "userId": "uuid",
  "email": "photographer@example.com",
  "role": "PHOTOGRAPHER",
  "photographerId": "uuid-not-slug",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Client Token:**
```json
{
  "userId": "uuid",
  "email": "client@example.com",
  "role": "CLIENT",
  "photographerId": "uuid-not-slug",
  "clientId": "uuid",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Important Notes:**
- `photographerId` is a UUID, NOT a slug
- `clientId` is included in client tokens to link to the contact record
- All tokens expire after 7 days
- Tokens are signed with JWT_SECRET environment variable

### Authentication Endpoints

#### POST /api/auth/register
Register a new photographer account.

**Request:**
```json
{
  "email": "photographer@example.com",
  "password": "securepassword",
  "businessName": "John's Photography"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "photographer@example.com",
    "role": "PHOTOGRAPHER",
    "photographerId": "photographer-id"
  },
  "token": "jwt-token-here"
}
```

#### POST /api/auth/login
Login with email and password.

**⚠️ IMPORTANT FOR MOBILE:** The current backend implementation sets an httpOnly cookie but does NOT return the JWT token in the response. For mobile app support, you'll need to modify the backend to also return the token in the JSON response.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Current Response (Web Only):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "PHOTOGRAPHER",
    "photographerId": "uuid"
  }
}
```
*Note: JWT is set as httpOnly cookie, not returned in response*

**Recommended Mobile Response (Requires Backend Change):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "PHOTOGRAPHER",
    "photographerId": "uuid"
  },
  "token": "jwt-token-here"
}
```

**Backend Modification Needed:**
In `server/routes.ts`, modify the login endpoint to include the token:
```typescript
res.json({ 
  user: {
    id: result.user.id,
    email: result.user.email,
    role: result.user.role,
    photographerId: result.user.photographerId
  },
  token: result.token // ADD THIS LINE
});
```

#### GET /api/auth/me
Get current authenticated user.

**Headers:** 
- Web: `Cookie: photographer_token=<jwt>` or `Cookie: client_token=<jwt>`
- Mobile: `Authorization: Bearer <jwt>`

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "role": "PHOTOGRAPHER",
  "photographerId": "photographer-id"
}
```

#### POST /api/client-portal/request-magic-link
Request a magic link for client login.

**Request:**
```json
{
  "email": "client@example.com",
  "photographerId": "photographer-uuid"
}
```

**Response:**
```json
{
  "message": "Magic link sent to client@example.com"
}
```

#### GET /api/portal/:token
Validate magic link token and authenticate client.

**⚠️ IMPORTANT FOR MOBILE:** This endpoint currently only sets a cookie and does NOT return the JWT token. For mobile support, modify the backend to return the token.

**Current Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "client@example.com",
    "role": "CLIENT"
  },
  "photographer": {
    "id": "uuid",
    "businessName": "John's Photography",
    "portalSlug": "johnsphotography"
  },
  "projectId": "uuid"
}
```
*Note: JWT is set as httpOnly cookie, not in response*

**Recommended Mobile Response (Backend Change Needed):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "client@example.com",
    "role": "CLIENT",
    "photographerId": "uuid"
  },
  "photographer": {
    "id": "uuid",
    "businessName": "John's Photography",
    "portalSlug": "johnsphotography"
  },
  "projectId": "uuid",
  "token": "jwt-token-here"
}
```

**Backend Modification:**
In `server/routes.ts`, add `token: jwtToken` to the responseData object around line 1753.

#### POST /api/auth/logout
Logout current user.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### Google OAuth (Photographers Only)

#### GET /api/auth/google
Initiate Google OAuth flow.

**Response:** Redirects to Google OAuth consent screen

#### GET /api/auth/google/callback
OAuth callback endpoint (handled by backend).

**Response:** Sets JWT cookie and redirects to dashboard

---

## API Endpoints

### Projects

#### GET /api/projects
List all projects for the authenticated photographer.

**Auth Required:** PHOTOGRAPHER

**Query Parameters:**
- `status` (optional): `ACTIVE` | `COMPLETED` | `CANCELLED`
- `stageId` (optional): Filter by stage

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Smith Wedding",
    "projectType": "WEDDING",
    "eventDate": "2025-06-15T00:00:00.000Z",
    "status": "ACTIVE",
    "stageId": "stage-uuid",
    "stage": {
      "id": "uuid",
      "name": "Booked",
      "color": "#22c55e"
    },
    "client": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Smith",
      "email": "john@example.com"
    }
  }
]
```

#### POST /api/projects
Create a new project.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "clientId": "contact-uuid",
  "title": "Smith Wedding",
  "projectType": "WEDDING",
  "eventDate": "2025-06-15",
  "hasEventDate": true,
  "stageId": "stage-uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Smith Wedding",
  "projectType": "WEDDING",
  "eventDate": "2025-06-15T00:00:00.000Z",
  "status": "ACTIVE",
  "createdAt": "2025-11-19T..."
}
```

#### GET /api/projects/:id
Get single project details.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
{
  "id": "uuid",
  "title": "Smith Wedding",
  "projectType": "WEDDING",
  "eventDate": "2025-06-15T00:00:00.000Z",
  "notes": "Client prefers outdoor ceremony",
  "status": "ACTIVE",
  "client": {
    "id": "uuid",
    "firstName": "John",
    "lastName": "Smith",
    "email": "john@example.com",
    "phone": "+15551234567"
  },
  "stage": {
    "id": "uuid",
    "name": "Booked",
    "color": "#22c55e"
  }
}
```

#### PUT /api/projects/:id
Update project details.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "title": "Updated Title",
  "eventDate": "2025-07-01",
  "notes": "Updated notes"
}
```

#### PUT /api/projects/:id/stage
Move project to a different stage.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "stageId": "new-stage-uuid"
}
```

### Client Portal - Projects

#### GET /api/client-portal/projects
List projects accessible to the authenticated client.

**Auth Required:** CLIENT

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Our Wedding",
    "projectType": "WEDDING",
    "eventDate": "2025-06-15T00:00:00.000Z",
    "photographerName": "John's Photography",
    "photographerLogo": "https://cloudinary.com/logo.jpg"
  }
]
```

#### GET /api/client-portal/projects/:id
Get detailed project info for client.

**Auth Required:** CLIENT

**Response:**
```json
{
  "id": "uuid",
  "title": "Our Wedding",
  "projectType": "WEDDING",
  "eventDate": "2025-06-15T00:00:00.000Z",
  "stage": {
    "name": "Booked",
    "color": "#22c55e"
  },
  "photographer": {
    "businessName": "John's Photography",
    "logoUrl": "https://...",
    "phone": "+15551234567"
  },
  "smartFiles": [...],
  "galleries": [...]
}
```

### Contacts

#### GET /api/contacts
List all contacts for photographer.

**Auth Required:** PHOTOGRAPHER

**Query Parameters:**
- `stageId` (optional): Filter by stage
- `status` (optional): `ACTIVE` | `ARCHIVED`

**Response:**
```json
[
  {
    "id": "uuid",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "phone": "+15551234567",
    "eventDate": "2025-08-20T00:00:00.000Z",
    "projectType": "WEDDING",
    "stageId": "stage-uuid",
    "stage": {
      "name": "Inquiry",
      "color": "#3b82f6"
    }
  }
]
```

#### POST /api/contacts
Create a new contact.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "+15551234567",
  "projectType": "WEDDING",
  "eventDate": "2025-08-20",
  "hasEventDate": true,
  "emailOptIn": true,
  "smsOptIn": false
}
```

#### PUT /api/contacts/:id
Update contact information.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+15559999999",
  "notes": "Referred by Sarah Jones"
}
```

#### GET /api/client-portal/contact-info
Get authenticated client's contact information.

**Auth Required:** CLIENT

**Response:**
```json
{
  "id": "uuid",
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "+15551234567"
}
```

#### PUT /api/client-portal/contact-info
Update client's own contact information.

**Auth Required:** CLIENT

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "newemail@example.com",
  "phone": "+15559999999"
}
```

### Smart Files (Proposals/Invoices/Contracts)

#### GET /api/smart-files
List all smart file templates.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Wedding Proposal Template",
    "status": "ACTIVE",
    "createdAt": "2025-01-15T..."
  }
]
```

#### POST /api/projects/:projectId/smart-files
Create a smart file from template for a project.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "smartFileTemplateId": "template-uuid",
  "customizations": {
    "packageSelections": ["package-1", "package-2"]
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "projectId": "project-uuid",
  "status": "DRAFT",
  "publicUrl": "https://app.thephotocrm.com/public/smart-files/secure-token"
}
```

#### POST /api/projects/:projectId/smart-files/:projectSmartFileId/send
Send smart file to client via email.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "subject": "Your Wedding Proposal",
  "message": "Excited to work with you!"
}
```

#### GET /api/public/smart-files/:token
Public endpoint - get smart file details (for clients).

**No Auth Required**

**Response:**
```json
{
  "id": "uuid",
  "title": "Wedding Proposal",
  "photographerName": "John's Photography",
  "pages": [
    {
      "id": "uuid",
      "type": "TEXT",
      "content": "Welcome to your proposal..."
    },
    {
      "id": "uuid",
      "type": "PACKAGE",
      "packages": [...]
    }
  ],
  "status": "SENT"
}
```

#### PATCH /api/public/smart-files/:token/accept
Client accepts the smart file (proposal/contract).

**No Auth Required**

**Request:**
```json
{
  "selectedPackageIds": ["package-uuid"],
  "selectedAddonIds": ["addon-uuid"]
}
```

#### PATCH /api/public/smart-files/:token/sign
Client signs the contract.

**No Auth Required**

**Request:**
```json
{
  "signatureData": "data:image/png;base64,..."
}
```

### Galleries

#### GET /api/galleries
List all galleries for photographer.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
[
  {
    "id": "uuid",
    "projectId": "project-uuid",
    "name": "Smith Wedding Photos",
    "coverImageUrl": "https://res.cloudinary.com/...",
    "imageCount": 250,
    "isShared": true,
    "sharedAt": "2025-06-20T...",
    "expiresAt": "2025-12-20T..."
  }
]
```

#### POST /api/galleries
Create a new gallery.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "projectId": "project-uuid",
  "name": "Smith Wedding Photos",
  "clientMessage": "Hope you love these!"
}
```

#### POST /api/galleries/:galleryId/upload
Upload photos to gallery (for mobile, use chunked multipart upload).

**Auth Required:** PHOTOGRAPHER

**Request:** `multipart/form-data`
- `file`: Image file
- `position`: Number (optional)
- `watermark`: Boolean (optional)

**Response:**
```json
{
  "id": "uuid",
  "url": "https://res.cloudinary.com/...",
  "thumbnailUrl": "https://res.cloudinary.com/...thumbnail",
  "position": 1
}
```

#### PATCH /api/galleries/:id/share
Share gallery with client.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "isShared": true,
  "expirationMonths": 6,
  "downloadEnabled": true,
  "favoritesEnabled": true
}
```

#### GET /api/galleries/:id/view
View gallery details (clients can access their galleries).

**Auth Required:** PHOTOGRAPHER or CLIENT

**Response:**
```json
{
  "id": "uuid",
  "name": "Smith Wedding Photos",
  "images": [
    {
      "id": "uuid",
      "url": "https://res.cloudinary.com/...",
      "thumbnailUrl": "https://res.cloudinary.com/...thumbnail",
      "isFavorite": false,
      "position": 1
    }
  ],
  "photographer": {
    "businessName": "John's Photography",
    "logoUrl": "https://..."
  },
  "downloadEnabled": true,
  "favoritesEnabled": true
}
```

#### POST /api/galleries/:id/favorites/:imageId
Toggle favorite status on an image.

**Auth Required:** CLIENT

**Response:**
```json
{
  "isFavorite": true
}
```

#### POST /api/galleries/:id/downloads
Request a download link for selected images.

**Auth Required:** CLIENT or PHOTOGRAPHER

**Request:**
```json
{
  "imageIds": ["uuid1", "uuid2"],
  "quality": "high"
}
```

**Response:**
```json
{
  "downloadId": "uuid",
  "status": "processing",
  "expiresAt": "2025-11-20T..."
}
```

### Messaging

#### GET /api/inbox/conversations
Get all conversations for photographer.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
[
  {
    "contactId": "uuid",
    "contactName": "John Smith",
    "lastMessage": "Thanks for the update!",
    "lastMessageAt": "2025-11-19T10:30:00Z",
    "unreadCount": 2,
    "channel": "SMS"
  }
]
```

#### GET /api/inbox/thread/:contactId
Get message thread with a specific contact.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
{
  "contact": {
    "id": "uuid",
    "name": "John Smith",
    "phone": "+15551234567",
    "email": "john@example.com"
  },
  "messages": [
    {
      "id": "uuid",
      "direction": "OUTBOUND",
      "messageBody": "Your photos are ready!",
      "channel": "SMS",
      "sentAt": "2025-11-19T10:00:00Z",
      "deliveredAt": "2025-11-19T10:00:05Z"
    },
    {
      "id": "uuid",
      "direction": "INBOUND",
      "messageBody": "Thanks! Can't wait to see them!",
      "channel": "SMS",
      "sentAt": "2025-11-19T10:01:00Z"
    }
  ]
}
```

#### POST /api/inbox/send-sms
Send SMS to a contact.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "contactId": "uuid",
  "message": "Your gallery is ready!",
  "includePortalLink": true
}
```

#### POST /api/projects/:id/send-email
Send email to project client.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "subject": "Your Photos Are Ready",
  "body": "Hi John, Your wedding photos are now available...",
  "includePortalLink": true
}
```

### Scheduling & Availability

#### GET /api/availability/templates
Get daily availability templates.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
[
  {
    "id": "uuid",
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "17:00",
    "isActive": true
  }
]
```

#### POST /api/availability/templates
Create availability template.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "17:00",
  "slotDuration": 60
}
```

#### GET /api/public/availability/:photographerId/slots/:date
Get available time slots for a specific date (public endpoint for client booking).

**No Auth Required**

**Response:**
```json
{
  "date": "2025-11-25",
  "slots": [
    {
      "id": "slot-1",
      "time": "09:00",
      "endTime": "10:00",
      "available": true
    },
    {
      "id": "slot-2",
      "time": "10:00",
      "endTime": "11:00",
      "available": false
    }
  ]
}
```

#### POST /api/public/booking/calendar/:publicToken/book/:date/:slotId
Book an appointment slot.

**No Auth Required**

**Request:**
```json
{
  "clientName": "Jane Smith",
  "clientEmail": "jane@example.com",
  "clientPhone": "+15551234567",
  "notes": "Engagement session"
}
```

#### GET /api/bookings
List all bookings for photographer.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
[
  {
    "id": "uuid",
    "clientName": "Jane Smith",
    "clientEmail": "jane@example.com",
    "appointmentDate": "2025-11-25T09:00:00Z",
    "duration": 60,
    "status": "CONFIRMED"
  }
]
```

### Payments (Stripe)

#### GET /api/stripe-connect/account-status
Get Stripe Connect account status.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
{
  "accountId": "acct_...",
  "status": "active",
  "payoutEnabled": true,
  "onboardingCompleted": true
}
```

#### POST /api/stripe-connect/create-onboarding-link
Create Stripe Connect onboarding link.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
{
  "url": "https://connect.stripe.com/setup/..."
}
```

#### GET /api/stripe-connect/earnings
Get earnings summary.

**Auth Required:** PHOTOGRAPHER

**Query Parameters:**
- `startDate`: ISO date string
- `endDate`: ISO date string

**Response:**
```json
{
  "totalEarnings": 15000.00,
  "platformFees": 750.00,
  "netEarnings": 14250.00,
  "pendingPayouts": 5000.00
}
```

#### POST /api/public/smart-files/:token/create-payment-intent
Create Stripe payment intent for smart file payment.

**No Auth Required**

**Request:**
```json
{
  "amount": 5000,
  "description": "Deposit for Smith Wedding"
}
```

**Response:**
```json
{
  "clientSecret": "pi_..._secret_...",
  "publishableKey": "pk_test_..."
}
```

### Automations

#### GET /api/automations
List all automations.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Welcome Email",
    "automationType": "COMMUNICATION",
    "enabled": true,
    "stageId": "stage-uuid",
    "stage": {
      "name": "Inquiry"
    }
  }
]
```

#### POST /api/automations
Create new automation.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "name": "Welcome Email",
  "automationType": "COMMUNICATION",
  "stageId": "stage-uuid",
  "channel": "EMAIL",
  "templateId": "template-uuid"
}
```

#### GET /api/automations/:id/steps
Get automation steps.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
[
  {
    "id": "uuid",
    "stepIndex": 0,
    "delayMinutes": 0,
    "actionType": "EMAIL",
    "templateId": "template-uuid",
    "enabled": true
  },
  {
    "id": "uuid",
    "stepIndex": 1,
    "delayDays": 2,
    "sendAtHour": 9,
    "actionType": "SMS",
    "customSmsContent": "Just checking in!",
    "enabled": true
  }
]
```

### Stages & Pipeline

#### GET /api/stages
Get all stages for photographer.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Inquiry",
    "orderIndex": 0,
    "color": "#3b82f6",
    "projectType": "WEDDING"
  },
  {
    "id": "uuid",
    "name": "Booked",
    "orderIndex": 1,
    "color": "#22c55e",
    "projectType": "WEDDING"
  }
]
```

#### POST /api/stages
Create a new stage.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "name": "Delivered",
  "projectType": "WEDDING",
  "color": "#8b5cf6",
  "orderIndex": 5
}
```

### Reports & Analytics

#### GET /api/reports/summary
Get business summary statistics.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
{
  "totalProjects": 45,
  "activeProjects": 12,
  "totalRevenue": 125000.00,
  "pendingPayments": 15000.00,
  "upcomingEvents": 8,
  "recentBookings": 3
}
```

### Photographer Settings

#### GET /api/photographers/me
Get photographer profile.

**Auth Required:** PHOTOGRAPHER

**Response:**
```json
{
  "id": "uuid",
  "businessName": "John's Photography",
  "photographerName": "John Doe",
  "email": "john@example.com",
  "phone": "+15551234567",
  "logoUrl": "https://...",
  "portalSlug": "johnsphotography",
  "timezone": "America/New_York",
  "brandPrimary": "#8B4565",
  "brandSecondary": "#F7F7F7"
}
```

#### PATCH /api/photographers/me
Update photographer profile.

**Auth Required:** PHOTOGRAPHER

**Request:**
```json
{
  "businessName": "John's Wedding Photography",
  "phone": "+15559999999",
  "website": "https://johnsphotography.com"
}
```

#### POST /api/upload/logo
Upload photographer logo.

**Auth Required:** PHOTOGRAPHER

**Request:** `multipart/form-data`
- `logo`: Image file

**Response:**
```json
{
  "logoUrl": "https://res.cloudinary.com/..."
}
```

---

## Data Models

### Core Types

#### User
```typescript
interface User {
  id: string;
  email: string;
  role: "PHOTOGRAPHER" | "CLIENT" | "ADMIN";
  photographerId?: string;
  clientId?: string;
  authProvider?: "google" | "email";
  createdAt: string;
}
```

#### Photographer
```typescript
interface Photographer {
  id: string;
  businessName: string;
  photographerName?: string;
  portalSlug?: string;
  logoUrl?: string;
  brandPrimary?: string;
  brandSecondary?: string;
  phone?: string;
  timezone: string;
  stripeConnectAccountId?: string;
  payoutEnabled: boolean;
  hasPremiumAccess: boolean;
  createdAt: string;
}
```

#### Contact
```typescript
interface Contact {
  id: string;
  photographerId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  eventDate?: string;
  hasEventDate: boolean;
  projectType: ProjectType;
  stageId?: string;
  status: "ACTIVE" | "ARCHIVED";
  emailOptIn: boolean;
  smsOptIn: boolean;
  createdAt: string;
}
```

#### Project
```typescript
interface Project {
  id: string;
  clientId: string;
  photographerId: string;
  title: string;
  projectType: ProjectType;
  eventDate?: string;
  hasEventDate: boolean;
  stageId?: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  notes?: string;
  emailOptIn: boolean;
  smsOptIn: boolean;
  enableAutomations: boolean;
  enableDripCampaigns: boolean;
  createdAt: string;
}

type ProjectType = 
  | "WEDDING"
  | "ENGAGEMENT"
  | "PORTRAIT"
  | "CORPORATE"
  | "EVENT"
  | "OTHER";
```

#### Gallery
```typescript
interface Gallery {
  id: string;
  projectId?: string;
  photographerId: string;
  name: string;
  coverImageUrl?: string;
  isShared: boolean;
  sharedAt?: string;
  expiresAt?: string;
  downloadEnabled: boolean;
  favoritesEnabled: boolean;
  watermarkEnabled: boolean;
  imageCount: number;
  viewCount: number;
  createdAt: string;
}

interface GalleryImage {
  id: string;
  galleryId: string;
  url: string;
  thumbnailUrl: string;
  originalFilename: string;
  sizeBytes: number;
  position: number;
  isFavorite: boolean;
  uploadedAt: string;
}
```

#### Smart File
```typescript
interface SmartFile {
  id: string;
  photographerId: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED";
  pages: SmartFilePage[];
  createdAt: string;
}

interface SmartFilePage {
  id: string;
  smartFileId: string;
  type: "TEXT" | "PACKAGE" | "ADDON" | "CONTRACT" | "PAYMENT" | "FORM" | "SCHEDULING";
  position: number;
  content?: any; // JSON content varies by page type
}

interface ProjectSmartFile {
  id: string;
  projectId: string;
  smartFileId: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "DEPOSIT_PAID" | "PAID";
  publicToken: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  totalAmount?: number;
  depositAmount?: number;
}
```

#### Stage
```typescript
interface Stage {
  id: string;
  photographerId: string;
  projectType: ProjectType;
  name: string;
  orderIndex: number;
  color: string;
  isDefault: boolean;
}
```

#### Message
```typescript
interface SmsLog {
  id: string;
  clientId: string;
  projectId?: string;
  direction: "OUTBOUND" | "INBOUND";
  fromPhone: string;
  toPhone: string;
  messageBody: string;
  imageUrl?: string; // MMS attachment
  status: string;
  sentAt: string;
  deliveredAt?: string;
}

interface EmailHistory {
  id: string;
  photographerId: string;
  contactEmail: string;
  subject: string;
  snippet: string;
  threadId: string;
  messageId: string;
  direction: "SENT" | "RECEIVED";
  receivedAt: string;
}
```

#### Booking
```typescript
interface Booking {
  id: string;
  photographerId: string;
  contactId?: string;
  appointmentDate: string;
  duration: number; // minutes
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  createdAt: string;
}
```

---

## Mobile-Specific Considerations

### Image Uploads

**Gallery Photo Uploads (Chunked/Resumable):**

For mobile apps uploading large photo batches, use chunked uploads:

```typescript
// 1. Get upload token
const { uploadToken } = await fetch('/api/auth/upload-token').then(r => r.json());

// 2. Use Cloudinary direct upload with the signed token
// React Native example using react-native-image-picker
import ImagePicker from 'react-native-image-picker';

const uploadPhoto = async (galleryId: string, imageUri: string) => {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  });
  
  const response = await fetch(`/api/galleries/${galleryId}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  return response.json();
};
```

**Image Compression:**

Before uploading, compress images on mobile to reduce bandwidth:

```typescript
import ImageResizer from 'react-native-image-resizer';

const compressImage = async (uri: string) => {
  return await ImageResizer.createResizedImage(
    uri,
    2048, // maxWidth
    2048, // maxHeight
    'JPEG',
    80, // quality
    0, // rotation
  );
};
```

### Push Notifications

**Recommended: Expo Push Notifications**

Use Expo's push notification service for both iOS and Android:

```typescript
import * as Notifications from 'expo-notifications';

// Register for push notifications
const registerForPushNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    return;
  }
  
  const token = await Notifications.getExpoPushTokenAsync();
  
  // Send token to backend
  await fetch('/api/photographers/me/push-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ pushToken: token.data }),
  });
};
```

**Backend Integration:**

You'll need to add a new endpoint to store push tokens and trigger notifications on events like:
- New client message
- Payment received
- Contract signed
- Gallery viewed

### Offline Support

**Critical features to cache:**

1. **Projects List** - Store in AsyncStorage/MMKV
2. **Gallery thumbnails** - Cache with react-native-fast-image
3. **Contact list** - AsyncStorage
4. **Draft messages** - Queue for retry when online

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache projects
const cacheProjects = async (projects: Project[]) => {
  await AsyncStorage.setItem('cached_projects', JSON.stringify(projects));
};

// Load from cache
const loadCachedProjects = async (): Promise<Project[]> => {
  const cached = await AsyncStorage.getItem('cached_projects');
  return cached ? JSON.parse(cached) : [];
};
```

### Stripe Payments

Use Stripe React Native SDK for in-app payments:

```typescript
import { StripeProvider, useStripe } from '@stripe/stripe-react-native';

const PaymentScreen = ({ smartFileToken }) => {
  const { confirmPayment } = useStripe();
  
  const handlePayment = async () => {
    // 1. Create payment intent
    const { clientSecret } = await fetch(
      `/api/public/smart-files/${smartFileToken}/create-payment-intent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 5000 }),
      }
    ).then(r => r.json());
    
    // 2. Confirm payment
    const { error, paymentIntent } = await confirmPayment(clientSecret, {
      paymentMethodType: 'Card',
    });
    
    if (error) {
      alert(error.message);
    } else if (paymentIntent) {
      // 3. Confirm with backend
      await fetch(
        `/api/public/smart-files/${smartFileToken}/confirm-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        }
      );
    }
  };
  
  return <StripeProvider publishableKey="pk_test_...">
    {/* Payment UI */}
  </StripeProvider>;
};
```

### Deep Linking

Configure deep links for magic link authentication:

**iOS (Info.plist):**
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>thephotocrm</string>
    </array>
  </dict>
</array>
```

**Android (AndroidManifest.xml):**
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="thephotocrm" />
</intent-filter>
```

**Handle magic link in app:**
```typescript
import * as Linking from 'expo-linking';

useEffect(() => {
  Linking.addEventListener('url', ({ url }) => {
    // Extract token from: thephotocrm://portal/abc123
    const token = url.split('/').pop();
    
    // Validate and login
    fetch(`/api/portal/${token}`)
      .then(r => r.json())
      .then(({ token: jwt, user }) => {
        // Store JWT and navigate to portal
        setAuthToken(jwt);
        navigation.navigate('ClientPortal');
      });
  });
}, []);
```

### Real-Time Updates

For real-time messaging, consider WebSockets:

```typescript
import { io } from 'socket.io-client';

const socket = io('https://app.thephotocrm.com', {
  auth: { token: authToken },
});

socket.on('new_message', (message) => {
  // Update conversation UI
  updateMessages(message);
  
  // Show local notification if app is backgrounded
  if (appState === 'background') {
    Notifications.scheduleNotificationAsync({
      content: {
        title: message.senderName,
        body: message.text,
      },
      trigger: null,
    });
  }
});
```

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "message": "Human-readable error message",
  "error": "Technical error details (optional)"
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (wrong role or tenant)
- `404` - Not found
- `500` - Server error

### Common Error Scenarios

#### 401 Unauthorized
```json
{
  "message": "Not authenticated"
}
```

**Mobile handling:**
```typescript
if (response.status === 401) {
  // Clear token and redirect to login
  await AsyncStorage.removeItem('auth_token');
  navigation.navigate('Login');
}
```

#### 403 Forbidden (Wrong Tenant)
```json
{
  "message": "Access denied - photographer mismatch"
}
```

**This happens when:**
- CLIENT tries to access another photographer's data
- Token has wrong photographerId for the resource

#### 400 Validation Error
```json
{
  "message": "First name, last name, and email are required"
}
```

**Mobile handling:**
```typescript
if (response.status === 400) {
  const { message } = await response.json();
  // Show validation error to user
  Alert.alert('Validation Error', message);
}
```

### Retry Strategy

For network errors, implement exponential backoff:

```typescript
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> => {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => 
        setTimeout(resolve, (4 - retries) * 1000)
      );
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
};
```

---

## Environment Variables

### Required for Mobile App

```bash
# API Base URL
API_BASE_URL=https://app.thephotocrm.com

# Stripe Publishable Key (for payments)
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Cloudinary Config (for image uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_UPLOAD_PRESET=your-preset

# Google OAuth (optional, for photographer login)
GOOGLE_CLIENT_ID=your-google-client-id

# Expo Push Notifications (optional)
EXPO_PROJECT_ID=your-expo-project-id
```

### Expo Configuration (app.json)

```json
{
  "expo": {
    "name": "thePhotoCrm",
    "slug": "thephotocrm",
    "scheme": "thephotocrm",
    "ios": {
      "bundleIdentifier": "com.thephotocrm.app",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Upload photos to galleries",
        "NSPhotoLibraryUsageDescription": "Select photos to upload"
      }
    },
    "android": {
      "package": "com.thephotocrm.app",
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      "@stripe/stripe-react-native"
    ]
  }
}
```

---

## Getting Started Checklist

### For Mobile Developers

1. **Setup Expo React Native Project**
   ```bash
   npx create-expo-app thephotocrm-mobile
   cd thephotocrm-mobile
   npm install @stripe/stripe-react-native
   npm install expo-image-picker expo-notifications
   npm install @react-native-async-storage/async-storage
   ```

2. **Configure Environment**
   - Create `.env` file with API_BASE_URL
   - Add Stripe publishable key
   - Configure deep linking scheme

3. **Implement Authentication**
   - Build login screen (email/password for photographers)
   - Build magic link handler for clients
   - Store JWT in AsyncStorage
   - Add authentication interceptor to all API calls

4. **Build Core Screens**
   - Photographer: Projects list, Project detail, Messaging inbox
   - Client: Projects list, Project detail, Gallery view

5. **Test on Device**
   - Install Expo Go app
   - Scan QR code from `npx expo start`
   - Test magic link flow
   - Test image uploads

---

## Support & Questions

For questions about API endpoints or mobile implementation:
- Email: support@thephotocrm.com
- Backend API runs on: https://app.thephotocrm.com
- Production Railway deployment includes CORS for mobile apps

**Next Steps:** Start with authentication flow, then build photographer dashboard, then client portal features.
