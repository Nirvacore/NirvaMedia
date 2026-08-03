# Mobile App Development - Phase 13

## Overview

This document outlines the architecture, implementation, and deployment of the NMD Platform mobile application (iOS/Android). The app provides full content management, analytics, and collaboration capabilities on mobile devices.

**Technology Stack:**
- **Framework:** React Native + Expo (for rapid development)
- **State Management:** Redux Toolkit + Redux Persist (offline support)
- **Navigation:** React Navigation (stack, tab, drawer)
- **UI Framework:** React Native Paper (Material Design 3)
- **API Client:** Custom NMD SDK wrapper with offline queue
- **Database:** SQLite + WatermelonDB (local-first)
- **Authentication:** JWT + Secure Storage + Biometric
- **Push Notifications:** Firebase Cloud Messaging (FCM) + APNs
- **Analytics:** Segment + Mixpanel
- **Testing:** Jest + Detox (E2E)

**Platform Support:**
- iOS 13.0+ (iPhone, iPad)
- Android 8.0+ (phones, tablets)
- Web (React Native Web - optional)

**Target Release:** Q2 2025
**Estimated Development:** 16-20 weeks

---

## 1. Project Structure

```
mobile/
├── app.json                    # Expo configuration
├── app.config.js               # Dynamic app configuration
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
│
├── src/
│   ├── api/                    # API client & SDK wrapper
│   │   ├── client.ts           # NMD API client wrapper
│   │   ├── offlineQueue.ts     # Offline request queue
│   │   ├── auth.ts             # Authentication endpoints
│   │   └── hooks/              # API hooks (useContent, useAnalytics, etc.)
│   │
│   ├── screens/                # Screen components
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── SignupScreen.tsx
│   │   │   └── BiometricScreen.tsx
│   │   ├── home/
│   │   │   ├── HomeScreen.tsx
│   │   │   └── DashboardScreen.tsx
│   │   ├── content/
│   │   │   ├── ContentListScreen.tsx
│   │   │   ├── ContentDetailScreen.tsx
│   │   │   ├── ContentEditScreen.tsx
│   │   │   └── ContentCreateScreen.tsx
│   │   ├── analytics/
│   │   │   ├── AnalyticsScreen.tsx
│   │   │   ├── MetricsDetailScreen.tsx
│   │   │   └── ReportsScreen.tsx
│   │   ├── collaboration/
│   │   │   ├── CommentsScreen.tsx
│   │   │   ├── ApprovalsScreen.tsx
│   │   │   └── TeamScreen.tsx
│   │   └── settings/
│   │       ├── SettingsScreen.tsx
│   │       ├── ProfileScreen.tsx
│   │       └── NotificationsScreen.tsx
│   │
│   ├── components/             # Reusable components
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── LoadingIndicator.tsx
│   │   ├── content/
│   │   │   ├── ContentCard.tsx
│   │   │   ├── ContentListItem.tsx
│   │   │   └── ContentForm.tsx
│   │   ├── analytics/
│   │   │   ├── MetricCard.tsx
│   │   │   ├── Chart.tsx
│   │   │   └── KPICard.tsx
│   │   └── navigation/
│   │       ├── BottomTabNavigator.tsx
│   │       ├── AuthNavigator.tsx
│   │       └── RootNavigator.tsx
│   │
│   ├── redux/                  # Redux store
│   │   ├── store.ts
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── contentSlice.ts
│   │   │   ├── analyticsSlice.ts
│   │   │   ├── userSlice.ts
│   │   │   └── uiSlice.ts
│   │   └── middleware/
│   │       ├── offlineMiddleware.ts
│   │       └── syncMiddleware.ts
│   │
│   ├── services/               # Business logic services
│   │   ├── auth.service.ts
│   │   ├── content.service.ts
│   │   ├── analytics.service.ts
│   │   ├── notification.service.ts
│   │   ├── sync.service.ts
│   │   └── storage.service.ts
│   │
│   ├── utils/                  # Utilities
│   │   ├── constants.ts
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   ├── storage.ts
│   │   └── logger.ts
│   │
│   ├── types/                  # TypeScript types
│   │   ├── api.types.ts
│   │   ├── content.types.ts
│   │   ├── analytics.types.ts
│   │   └── user.types.ts
│   │
│   ├── themes/                 # Theme configuration
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   └── spacing.ts
│   │
│   └── App.tsx                 # Root component
│
├── __tests__/                  # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── android/                    # Android native code (auto-generated)
└── ios/                        # iOS native code (auto-generated)
```

---

## 2. Architecture & Design Patterns

### 2.1 Redux State Management

```typescript
// src/redux/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import contentReducer from './slices/contentSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'user'], // Persist only these
  blacklist: ['ui'], // Don't persist UI state
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    content: contentReducer,
    analytics: analyticsReducer,
    user: userReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    })
    .concat([offlineMiddleware, syncMiddleware]),
});

export const persistor = persistStore(store);
```

### 2.2 Offline-First Architecture

```typescript
// src/services/sync.service.ts
export class SyncService {
  private offlineQueue: QueuedAction[] = [];
  private syncInProgress = false;

  // Queue action for later sync when online
  async queueAction(action: QueuedAction) {
    this.offlineQueue.push({
      ...action,
      timestamp: Date.now(),
      retries: 0,
    });
    
    // Persist queue to storage
    await StorageService.saveQueue(this.offlineQueue);
  }

  // Sync when connection restored
  async syncQueue() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      // Get all queued actions
      const queued = await StorageService.getQueue();
      
      for (const action of queued) {
        try {
          // Retry with exponential backoff
          await this.executeWithRetry(action, 3);
          
          // Remove from queue on success
          this.offlineQueue = this.offlineQueue.filter(a => a.id !== action.id);
        } catch (error) {
          // Keep in queue for retry
          action.retries++;
          action.lastError = error.message;
        }
      }

      // Persist updated queue
      await StorageService.saveQueue(this.offlineQueue);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async executeWithRetry(action: QueuedAction, maxRetries: number) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.executeAction(action);
      } catch (error) {
        lastError = error;
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }
    
    throw lastError;
  }

  private async executeAction(action: QueuedAction) {
    switch (action.type) {
      case 'PUBLISH_CONTENT':
        return await apiClient.content.publish(action.payload);
      case 'CREATE_COMMENT':
        return await apiClient.comments.create(action.payload);
      // ... other actions
    }
  }
}
```

### 2.3 Authentication Flow

```typescript
// src/services/auth.service.ts
export class AuthService {
  async login(email: string, password: string) {
    // 1. Call API
    const response = await apiClient.auth.login(email, password);
    
    // 2. Store token securely
    await SecureStorage.setToken(response.token);
    await SecureStorage.setRefreshToken(response.refreshToken);
    
    // 3. Store user data
    const user = response.user;
    await AsyncStorage.setItem('user', JSON.stringify(user));
    
    // 4. Update Redux state
    store.dispatch(setAuth({ user, token: response.token }));
    
    // 5. Subscribe to push notifications
    await NotificationService.subscribeToPushNotifications(user.id);
    
    return user;
  }

  async enableBiometric() {
    // Check device support
    const compatible = await BiometricService.isAvailable();
    if (!compatible) throw new Error('Biometric not available');
    
    // Get current token
    const token = await SecureStorage.getToken();
    
    // Store biometric flag
    await SecureStorage.enableBiometric();
    
    // Enable local biometric auth
    return true;
  }

  async biometricLogin() {
    // Authenticate with biometric
    const authenticated = await BiometricService.authenticate();
    if (!authenticated) throw new Error('Biometric auth failed');
    
    // Get token from secure storage
    const token = await SecureStorage.getToken();
    
    // Validate token with API
    const isValid = await apiClient.auth.validateToken(token);
    if (!isValid) {
      // Token expired, refresh
      const newToken = await this.refreshToken();
      await SecureStorage.setToken(newToken);
    }
    
    // Set authenticated state
    store.dispatch(setBiometricAuthenticated(true));
    
    return true;
  }

  async logout() {
    // Call logout endpoint
    await apiClient.auth.logout();
    
    // Clear all stored data
    await SecureStorage.clearToken();
    await AsyncStorage.removeItem('user');
    
    // Reset Redux state
    store.dispatch(clearAuth());
    
    // Unsubscribe from notifications
    await NotificationService.unsubscribe();
  }
}
```

---

## 3. Key Features

### 3.1 Content Management

**Capabilities:**
- ✅ Create, edit, publish, archive content
- ✅ Offline draft saving with sync on reconnect
- ✅ Version history and rollback
- ✅ Multi-format support (blog, social, email)
- ✅ Rich text editor with markdown support
- ✅ Image upload with compression and optimization
- ✅ Template selection and custom fields
- ✅ Scheduling for future publish
- ✅ Bulk operations (multi-select, batch publish)
- ✅ Search and filtering

**Implementation:**
```typescript
// src/screens/content/ContentEditScreen.tsx
export const ContentEditScreen: React.FC = ({ route }) => {
  const { contentId } = route.params;
  const dispatch = useDispatch();
  const content = useSelector(selectContentById(contentId));
  const isOnline = useSelector(selectIsOnline);

  const handleSave = async (data: ContentData) => {
    if (isOnline) {
      // Save to API immediately
      try {
        await dispatch(updateContent(data)).unwrap();
        showSuccess('Content saved');
      } catch (error) {
        showError('Failed to save content');
      }
    } else {
      // Queue for sync when online
      dispatch(queueContentUpdate(data));
      showInfo('Content saved offline. Will sync when online.');
    }
  };

  return (
    <ScrollView>
      <ContentForm
        initialData={content}
        onSubmit={handleSave}
        isOffline={!isOnline}
      />
    </ScrollView>
  );
};
```

### 3.2 Analytics Dashboard

**Capabilities:**
- ✅ Real-time KPI dashboard (views, clicks, engagement)
- ✅ Interactive charts and graphs
- ✅ Performance trends
- ✅ A/B test results
- ✅ Comparison period analysis
- ✅ Custom date ranges
- ✅ Export reports
- ✅ Push notification for performance alerts

**Implementation:**
```typescript
// src/components/analytics/MetricCard.tsx
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  format = 'number',
}) => {
  const trendColor = trend > 0 ? '#4CAF50' : '#F44336';
  const trendIcon = trend > 0 ? '↑' : '↓';

  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{formatValue(value, format)}</Text>
      {trend !== undefined && (
        <Text style={[styles.trend, { color: trendColor }]}>
          {trendIcon} {Math.abs(trend)}%
        </Text>
      )}
    </Card>
  );
};
```

### 3.3 Collaboration Features

**Capabilities:**
- ✅ Real-time comments and feedback
- ✅ Approval workflow with notifications
- ✅ @mentions and tagging
- ✅ Activity timeline
- ✅ Team member management
- ✅ Role-based permissions
- ✅ Notification center

**Implementation:**
```typescript
// src/screens/collaboration/CommentsScreen.tsx
export const CommentsScreen: React.FC = ({ contentId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const currentUser = useSelector(selectCurrentUser);

  const handleAddComment = async () => {
    const comment: Comment = {
      id: generateId(),
      contentId,
      userId: currentUser.id,
      text: newComment,
      mentions: extractMentions(newComment),
      createdAt: new Date().toISOString(),
    };

    // If online, send immediately
    if (isOnline) {
      await apiClient.comments.create(comment);
    } else {
      // Queue for later
      dispatch(queueAction({
        type: 'CREATE_COMMENT',
        payload: comment,
      }));
    }

    setComments([...comments, comment]);
    setNewComment('');
  };

  return (
    <View>
      <FlatList
        data={comments}
        renderItem={({ item }) => (
          <CommentItem comment={item} />
        )}
        keyExtractor={item => item.id}
      />
      <CommentInput
        value={newComment}
        onChangeText={setNewComment}
        onSubmit={handleAddComment}
        mentions={extractPotentialMentions(newComment)}
      />
    </View>
  );
};
```

### 3.4 Push Notifications

**Setup:**
```typescript
// src/services/notification.service.ts
export class NotificationService {
  async initializePushNotifications() {
    // Request user permission
    const { status } = await requestNotificationsPermissions();
    if (status !== 'granted') return;

    // Get FCM token (Android) or APNs token (iOS)
    const token = await messaging().getToken();

    // Register with backend
    await apiClient.notifications.registerDevice({
      token,
      platform: Platform.OS,
      userId: currentUser.id,
    });

    // Handle incoming notifications
    messaging().onMessage(async (message) => {
      this.handleNotification(message);
    });

    // Handle notification tap when app in background
    messaging().onNotificationOpenedApp((message) => {
      this.handleNotificationTap(message);
    });
  }

  private handleNotification(message: any) {
    const notification = message.notification;
    
    // Show local notification
    notifee.displayNotification({
      title: notification.title,
      body: notification.body,
      android: {
        channelId: 'important',
        pressAction: {
          id: 'open',
        },
      },
      ios: {
        critical: message.data?.priority === 'high',
      },
    });
  }

  private handleNotificationTap(message: any) {
    const { contentId, screenName } = message.data;
    
    // Navigate to relevant screen
    navigation.navigate(screenName, { contentId });
  }
}
```

---

## 4. Testing Strategy

### 4.1 Unit Tests

```typescript
// __tests__/unit/services/auth.service.test.ts
describe('AuthService', () => {
  let authService: AuthService;
  let mockApiClient: jest.Mocked<typeof apiClient>;
  let mockStorage: jest.Mocked<typeof SecureStorage>;

  beforeEach(() => {
    mockApiClient = jest.mocked(apiClient);
    mockStorage = jest.mocked(SecureStorage);
    authService = new AuthService();
  });

  test('login should store token and update state', async () => {
    mockApiClient.auth.login.mockResolvedValue({
      token: 'test-token',
      refreshToken: 'refresh-token',
      user: { id: '1', email: 'test@nmd.io' },
    });

    const user = await authService.login('test@nmd.io', 'password');

    expect(mockStorage.setToken).toHaveBeenCalledWith('test-token');
    expect(user.email).toBe('test@nmd.io');
  });

  test('biometric login should validate token', async () => {
    mockStorage.getToken.mockResolvedValue('stored-token');
    mockApiClient.auth.validateToken.mockResolvedValue(true);

    const result = await authService.biometricLogin();

    expect(result).toBe(true);
    expect(mockApiClient.auth.validateToken).toHaveBeenCalledWith('stored-token');
  });
});
```

### 4.2 Integration Tests

```typescript
// __tests__/integration/content-workflow.test.ts
describe('Content Creation Workflow', () => {
  test('should create content, save offline, and sync online', async () => {
    const store = createTestStore();
    const { getByTestId, getByText } = render(
      <Provider store={store}>
        <ContentCreateScreen />
      </Provider>
    );

    // Go offline
    store.dispatch(setOnlineStatus(false));

    // Create content
    fireEvent.changeText(getByTestId('title-input'), 'Test Content');
    fireEvent.press(getByText('Save'));

    // Verify queued
    expect(store.getState().content.queue).toHaveLength(1);

    // Go online
    store.dispatch(setOnlineStatus(true));
    await store.dispatch(syncQueue());

    // Verify synced and removed from queue
    expect(store.getState().content.queue).toHaveLength(0);
  });
});
```

### 4.3 E2E Tests (Detox)

```typescript
// __tests__/e2e/login.e2e.test.ts
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login with email and password', async () => {
    await element(by.id('email-input')).typeText('test@nmd.io');
    await element(by.id('password-input')).typeText('password123');
    await element(by.text('Login')).multiTap();

    await waitFor(element(by.text('Dashboard')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should login with biometric if enabled', async () => {
    await element(by.text('Use Biometric')).multiTap();

    // Simulate biometric success
    await device.matchFace();

    await waitFor(element(by.text('Dashboard')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
```

---

## 5. Performance Optimization

### 5.1 Bundle Size

**Target:** <5MB for main app bundle

**Optimization strategies:**
```typescript
// Use dynamic imports for large screens
const AnalyticsScreen = lazy(() => import('../screens/AnalyticsScreen'));

// Code splitting by route
const contentScreens = {
  home: lazy(() => import('../screens/ContentListScreen')),
  detail: lazy(() => import('../screens/ContentDetailScreen')),
};

// Remove unused dependencies
// Regular audits with: npx react-native-bundle-visualizer
```

### 5.2 Memory Management

```typescript
// Limit list rendering with virtualization
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={item => item.id}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={15}
  removeClippedSubviews={true}  // Memory optimization
/>

// Clean up subscriptions
useEffect(() => {
  const unsubscribe = navigation.addListener('beforeRemove', () => {
    // Clean up: cancel requests, clear timers, etc.
  });

  return unsubscribe;
}, [navigation]);
```

### 5.3 Image Optimization

```typescript
// Compress images before upload
const compressImage = async (uri: string): Promise<string> => {
  return ImageResizer.createResizedImage(
    uri,
    1024,  // max width
    768,   // max height
    'JPEG',
    70,    // quality (0-100)
    0,     // rotation
  );
};

// Use lazy loading for images
<Image
  source={{ uri: contentImage }}
  style={styles.image}
  progressiveRenderingEnabled={true}
  defaultSource={placeholderImage}
/>
```

---

## 6. Deployment

### 6.1 Build Configuration

```bash
# Development build (for internal testing)
eas build --platform ios --profile development
eas build --platform android --profile development

# Production build (for release)
eas build --platform ios --profile production
eas build --platform android --profile production

# App Store submission (iOS)
eas submit --platform ios --latest

# Google Play submission (Android)
eas submit --platform android --latest
```

### 6.2 Release Process

```
Timeline:
1. Internal testing (1-2 weeks)
2. Beta release (1 week)
3. Gather feedback and fix issues
4. Production release (iOS App Store, Google Play)
5. Monitor crash reports via Bugsnag/Sentry
6. Deploy hotfixes as needed

Versioning:
- Semantic versioning: MAJOR.MINOR.PATCH
- Build numbers increment with each release
- Track in app.json and package.json
```

---

## 7. Roadmap

### Phase 13a (Weeks 1-4): Core Setup & Auth
- [x] Project setup with Expo
- [x] Redux store configuration
- [x] Secure storage implementation
- [x] Login/signup screens
- [x] Biometric authentication
- [x] API client setup

### Phase 13b (Weeks 5-8): Content Management
- [ ] Content list screen with offline support
- [ ] Content detail view
- [ ] Content editor with rich text
- [ ] Image upload and compression
- [ ] Offline draft saving
- [ ] Sync queue management

### Phase 13c (Weeks 9-12): Analytics & Collaboration
- [ ] Analytics dashboard
- [ ] Real-time metrics
- [ ] Comments and feedback
- [ ] Approval workflows
- [ ] Notifications
- [ ] Activity timeline

### Phase 13d (Weeks 13-16): Polish & Testing
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Comprehensive testing
- [ ] Beta release
- [ ] Feedback integration
- [ ] Bug fixes

### Phase 13e (Weeks 17-20): Release & Monitoring
- [ ] App Store submission
- [ ] Google Play submission
- [ ] Release monitoring
- [ ] Crash tracking setup
- [ ] User feedback collection
- [ ] Roadmap planning

---

## 8. Success Metrics

**Launch Goals:**
- ✅ <100ms load time
- ✅ <50MB app size
- ✅ 95% offline functionality
- ✅ <1% crash rate
- ✅ 4.5+ star rating
- ✅ 10,000+ downloads in first month

**Ongoing KPIs:**
- Daily active users (DAU)
- Monthly active users (MAU)
- Session length
- Feature adoption rates
- Crash-free sessions
- User satisfaction (NPS)

---

**Document Version:** 1.0
**Last Updated:** 2024-07-31
**Owner:** Mobile Development Team
**Next Review:** 2024-10-31

**Related Documents:**
- README.md - Project overview
- docs/API.md - API reference
- TEAM_TRAINING.md - Mobile dev onboarding
