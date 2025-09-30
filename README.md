# Event Manager

A sophisticated React event management system that implements the **Actor Model pattern** for enterprise-scale applications, enabling **channel-based communication** without prop drilling or complex provider setups.

## 🎯 Core Rationale

The Event Manager's primary goal is to **prevent tight coupling and unwanted re-renders** in React applications by:

- **Eliminating prop dependencies** - Components wrapped with `withEvents` and `withService` don't receive props from parents
- **Automatic memoization** - All wrapped components are automatically wrapped in `React.memo()` 
- **Event-driven communication** - Components communicate through typed channels instead of prop passing
- **Selective re-rendering** - Only components subscribed to specific events re-render when relevant state changes
- **Loose coupling** - Components can be moved, removed, or modified without affecting their parents or siblings

## 🎯 Core Concept

The Event Manager uses **typed channels** as communication domains, where components maintain **local state** but synchronize through **state update events**:

- **Local state with event synchronization** - Each component maintains its own state, but shares updates via events
- **State update broadcasting** - When local state changes, updates are broadcast to other interested components
- **Last message restoration** - The event manager caches the last message, allowing late-joining components to restore state
- **Channels define communication domains** - Each channel has a typed schema for events
- **Type-safe event publishing/subscribing** - TypeScript ensures correct event data
- **Domain-driven architecture** - Separate channels for different business domains (user, order, app, etc.)
- **Automatic component tracking** - Each component gets a unique ID for debugging/tracking
- **Context-based component ID** - Components get their ID from React context
- **Cleanup on unmount** - Components automatically unregister when they unmount

## 🚀 Key Features

### **Performance Optimization**
- **Automatic memoization** - All components are wrapped in `React.memo()` to prevent unnecessary re-renders
- **Selective updates** - Only components subscribed to specific events re-render
- **No prop cascading** - Parent re-renders don't trigger child re-renders since there are no props

### **Loose Coupling Architecture**
- **Zero prop dependencies** - Components don't receive props from parents, eliminating coupling
- **Independent lifecycle** - Components can mount/unmount without affecting others
- **Modular design** - Components can be moved anywhere in the tree without breaking functionality

### **Local State with Event Synchronization**
Unlike traditional shared state systems, each component maintains its own local state but broadcasts updates to synchronize with other components interested in the same data.

### **State Restoration on Mount**
Components can restore their local state from the last cached message when they mount, ensuring consistency even for late-joining components.

### **Channel-Based Architecture**
Organize events into typed channels that represent different business domains:

```typescript
// Define channel schemas
type UserChannelSchema = {
  profileChanged: UserProfile;
  statusChanged: { status: UserStatus; previousStatus: UserStatus };
};

type OrderChannelSchema = {
  created: Order;
  statusUpdated: { orderId: string; status: OrderStatus; timestamp: number };
  cancelled: { orderId: string; reason: string };
};

// Create typed channels
const userChannel = createChannel<UserChannelSchema>("user", {
  initialState: {
    profileChanged: { name: "Loading...", email: "Loading..." },
    statusChanged: { status: "offline", previousStatus: "offline" }
  },
  middleware: [(payload, action) => { /* logging, validation, etc. */ }],
  observers: [(eventName) => { /* analytics, side effects, etc. */ }]
});

const orderChannel = createChannel<OrderChannelSchema>("order", {});
```

### **Type-Safe Communication**
Full TypeScript support ensures type safety across all channel communications.

### **Domain-Driven Design**
Separate channels for different business concerns (user domain, order domain, app domain, etc.).

### **Component Lifecycle Integration**
- Automatic component registration and cleanup
- Context provides component ID to hooks automatically
- No manual cleanup needed

### **Advanced Event Features**
- **Loop detection** - Prevents infinite event chains
- **Event metadata** - Rich context passed to listeners
- **Selector functions** - Transform payloads before delivery
- **Filter functions** - Conditional event delivery
- **Performance tracking** - Built-in timing for debugging
- **Last payload caching** - State retrieval for late subscribers

## 📚 API Reference

### Core Hooks

#### `createChannel<TSchema>(name: string, options?)`
Creates a typed channel for domain-specific communication.

```typescript
type UserChannelSchema = {
  profileChanged: UserProfile;
  statusChanged: { status: UserStatus; previousStatus: UserStatus };
};

const userChannel = createChannel<UserChannelSchema>("user", {
  initialState: {
    profileChanged: { name: "Loading...", email: "Loading..." }
  },
  middleware: [(payload, action) => { /* transform, validate, log */ }],
  observers: [(eventName) => { /* analytics, side effects */ }]
});
```

#### `useEventState<T>(channel, eventName: string, options?): [T, (value: T) => void]`
Manages local state that synchronizes with other components via event updates. Each component maintains its own state copy but receives updates from other components.

```typescript
const [user, setUser] = useEventState(userChannel, "profileChanged", {
  restoreOnMount: true // Restore local state from last cached message on mount
});

const [status, setStatus] = useEventState(userChannel, "statusChanged", {
  restoreOnMount: false // Start with initial state, don't restore
});

// When setUser is called:
// 1. Updates local state immediately
// 2. Broadcasts update event to other components
// 3. Other components receive the update and sync their local state
```

#### `useSubscribe(channel, eventName: string, callback: (data: T) => void, options?)`
Subscribe to channel events without managing state.

```typescript
useSubscribe(userChannel, "statusChanged", (payload) => {
  console.log("User status changed:", payload.status);
});
```

#### `useEmit()`
Get an emit function to publish events to channels.

```typescript
const emit = useEmit();

// Emit to specific channel
emit(userChannel, "profileChanged", { name: "John", email: "john@example.com" });
emit(orderChannel, "statusUpdated", { orderId: "123", status: "shipped", timestamp: Date.now() });
```

### Higher-Order Components

#### `withEvents(componentName: string, metadata?)`
Wraps React components to provide event capabilities and channel access. **Components are automatically memoized and receive no props from parents.**

```typescript
const UserProfile = withEvents("UserProfile", { domain: "user" })(() => {
  // No props parameter - component is decoupled from parent
  const [user, setUser] = useEventState(userChannel, "profileChanged", {
    restoreOnMount: true
  });
  
  return <div>Welcome {user.name}</div>;
});

// Usage - parent can re-render without affecting UserProfile
const App = () => {
  const [parentState, setParentState] = useState(0);
  
  return (
    <div>
      <button onClick={() => setParentState(prev => prev + 1)}>
        Re-render parent ({parentState})
      </button>
      {/* UserProfile won't re-render when parent state changes */}
      <UserProfile />
    </div>
  );
};
```

#### `withService(serviceName: string, metadata?)`
Wraps service components that provide business logic but render nothing. **Components are automatically memoized and receive no props.**

```typescript
const NotificationService = withService("NotificationService")(() => {
  // No props - service is completely independent
  const emit = useEmit();
  
  useSubscribe(userChannel, "statusChanged", (payload) => {
    const notification = {
      id: Date.now(),
      message: `User status changed to ${payload.status}`,
      timestamp: new Date().toLocaleTimeString()
    };
    
    emit(appChannel, "notification", notification);
  });
  
  // Returns null - no UI rendered, but logic runs independently
});
```

## � Compatibility with Traditional React

The Event Manager is **fully compatible with traditional React patterns**. Not all components need to be event-driven or wrapped with `withEvents`/`withService`. Traditional React components can easily integrate with the event system:

### **Traditional Components with Event Integration**
```typescript
import { useComponentId, useSubscribe, useEmit } from '@frontend/icomera-utils/event-manager';

// Traditional React component that receives props
const TraditionalComponent = ({ userId, onUserUpdate }) => {
  // Register with event manager to get an ID
  const componentId = useComponentId("TraditionalComponent", { 
    type: "traditional",
    userId 
  });
  
  const emit = useEmit();
  
  // Subscribe to events by passing componentId in options
  useSubscribe(userChannel, "statusChanged", (payload) => {
    console.log("User status changed:", payload.status);
    // Can still call traditional prop callbacks
    onUserUpdate?.(payload);
  }, { componentId });
  
  const handleClick = () => {
    // Can emit events while still being a traditional component
    emit(userChannel, "profileChanged", { 
      name: "Updated Name", 
      email: "new@email.com" 
    });
  };
  
  return (
    <div>
      <h3>User ID: {userId}</h3>
      <button onClick={handleClick}>Update Profile</button>
    </div>
  );
};

// Mixed usage - event-driven and traditional components together
const App = () => {
  const [userId, setUserId] = useState("123");
  
  return (
    <div>
      {/* Event-driven components - no props */}
      <NotificationService />
      <UserProfile />
      
      {/* Traditional components - with props */}
      <TraditionalComponent 
        userId={userId} 
        onUserUpdate={(user) => console.log("Traditional callback:", user)}
      />
      
      {/* Traditional component that doesn't use events at all */}
      <RegularComponent data={someData} />
    </div>
  );
};
```

### **Gradual Migration Strategy**
```typescript
// Step 1: Start with traditional components
const UserCard = ({ user, onUpdate }) => {
  return (
    <div>
      <span>{user.name}</span>
      <button onClick={() => onUpdate({ ...user, status: 'updated' })}>
        Update
      </button>
    </div>
  );
};

// Step 2: Add event capabilities while keeping props
const UserCardWithEvents = ({ user, onUpdate }) => {
  const componentId = useComponentId("UserCard");
  const emit = useEmit();
  
  // Listen to events
  useSubscribe(userChannel, "statusChanged", (payload) => {
    console.log("Status changed via events:", payload);
  }, { componentId });
  
  const handleUpdate = () => {
    const updatedUser = { ...user, status: 'updated' };
    
    // Support both patterns
    onUpdate(updatedUser);           // Traditional prop callback
    emit(userChannel, "profileChanged", updatedUser); // Event emission
  };
  
  return (
    <div>
      <span>{user.name}</span>
      <button onClick={handleUpdate}>Update</button>
    </div>
  );
};

// Step 3: Eventually migrate to fully event-driven (optional)
const UserCardEventDriven = withEvents("UserCard")(() => {
  const [user, setUser] = useEventState(userChannel, "profileChanged");
  
  const handleUpdate = () => {
    setUser({ ...user, status: 'updated' });
  };
  
  return (
    <div>
      <span>{user.name}</span>
      <button onClick={handleUpdate}>Update</button>
    </div>
  );
});
```

### **Best of Both Worlds**
- **Start small**: Add event capabilities to existing components without breaking changes
- **Mix patterns**: Use event-driven components where beneficial, traditional where appropriate
- **Gradual adoption**: Migrate components to event-driven architecture over time
- **Team flexibility**: Different team members can work with familiar patterns

## �🛠 Usage Patterns

### **Channel-Based Domain Architecture**
```typescript
// Define your domain schemas
type UserChannelSchema = {
  profileChanged: { name: string; email: string };
  statusChanged: { status: "online" | "away" | "offline"; previousStatus: string };
};

type OrderChannelSchema = {
  created: Order;
  statusUpdated: { orderId: string; status: OrderStatus; timestamp: number };
  cancelled: { orderId: string; reason: string };
};

type AppChannelSchema = {
  notification: { id: number; message: string; timestamp: string };
};

// Create typed channels
const userChannel = createChannel<UserChannelSchema>("user", {
  initialState: {
    profileChanged: { name: "Loading...", email: "Loading..." },
    statusChanged: { status: "offline", previousStatus: "offline" }
  },
  middleware: [
    (payload, action) => {
      console.info(`👤 User domain: ${action}`, payload);
      return payload;
    }
  ],
  observers: [
    (eventName) => {
      if (eventName.includes("statusChanged")) {
        console.info("📊 Analytics: User status change tracked");
      }
    }
  ]
});

const orderChannel = createChannel<OrderChannelSchema>("order", {
  middleware: [(payload, action) => {
    console.info(`📦 Order domain: ${action}`, payload);
    return payload;
  }]
});

const appChannel = createChannel<AppChannelSchema>("app", {});
```

### **Service Components (Business Logic)**
```typescript
// Notification service listens to user events and emits app notifications
const NotificationService = withService("NotificationService")(() => {
  const emit = useEmit();

  // Cross-channel communication
  useSubscribe(userChannel, "statusChanged", (payload) => {
    const notification = {
      id: Date.now(),
      message: `User status changed to ${payload.status}`,
      timestamp: new Date().toLocaleTimeString()
    };

    emit(appChannel, "notification", notification);
  });
});
```

### **Performance-First Architecture**
```typescript
// Traditional approach - tightly coupled, causes cascading re-renders
const BadExample = () => {
  const [user, setUser] = useState({ name: "John", status: "online" });
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  // When any state changes, ALL children re-render
  return (
    <div>
      <UserProfile user={user} onUserChange={setUser} />
      <OrderList orders={orders} onOrderChange={setOrders} />
      <NotificationPanel notifications={notifications} />
    </div>
  );
};

// Event Manager approach - loose coupling, selective re-renders
const GoodExample = () => {
  // Parent has no state, no re-renders to cascade
  return (
    <div>
      <NotificationService /> {/* Service component - runs logic, no UI */}
      <UserProfile />         {/* Only re-renders on user channel events */}
      <OrderList />           {/* Only re-renders on order channel events */}
      <NotificationPanel />   {/* Only re-renders on app channel events */}
    </div>
  );
};

// Components are completely independent
const UserProfile = withEvents("UserProfile")(() => {
  const [user, setUser] = useEventState(userChannel, "profileChanged");
  // This component only re-renders when user data actually changes
  return <div>{user.name} - {user.status}</div>;
});

const OrderList = withEvents("OrderList")(() => {
  const [orders, setOrders] = useEventState(orderChannel, "listUpdated");
  // This component only re-renders when order data actually changes
  return <div>{orders.length} orders</div>;
});
```

## 🏆 Benefits

### **Local State Architecture**
Components maintain their own state copies but synchronize through event updates, providing better performance and isolation.

### **State Restoration**
The `restoreOnMount` option allows components to restore their local state from the last cached message, perfect for late-joining components.

### **Event-Driven Synchronization**
State updates are broadcast as events, allowing selective subscription and avoiding unnecessary re-renders.

### **Type-Safe Domain Communication**
Channels provide compile-time guarantees that events match their expected schemas.

### **No Shared State Mutations**
Each component owns its state copy, eliminating race conditions and making debugging easier.

### **Cross-Channel Communication**
Service components can listen to one channel and emit to another, enabling complex workflows.

### **Actor Model Pattern**
Each component acts as an independent actor that communicates through well-defined message passing.

### **No Prop Drilling**
State and events are shared via channels, eliminating the need to pass props through component trees.

### **No Provider Setup**
Just create channels and use the hooks - no complex provider configuration needed.

### **Automatic Cleanup**
Components automatically unregister themselves when they unmount.

### **Built-in Debugging**
Component tracking, event logging, and channel introspection help with development.

### **Maximum Performance**
Automatic memoization and zero prop dependencies eliminate unnecessary re-renders across your entire application.

### **Zero Coupling**
Components can be moved, modified, or removed without affecting any other component in the application.

### **Enterprise-Ready**
Middleware, observers, initial state, and restoration capabilities support complex enterprise needs while maintaining performance.

## 🎯 When to Use

The Event Manager is particularly powerful for:

- **Enterprise applications** with complex domain interactions
- **Microservice-style frontends** where UI components act as independent services
- **Real-time applications** where multiple components react to the same domain events
- **Applications requiring audit trails** (middleware can log all domain events)
- **Performance-critical applications** where minimizing re-renders is essential
- **Large component trees** where prop drilling causes performance issues
- **Applications requiring maximum modularity** where components must be completely independent
- **Hybrid applications** where some components benefit from event-driven architecture while others remain traditional
- **Gradual migration** from traditional React patterns to event-driven architecture
- **Team adoption** where different developers can work with familiar patterns while transitioning
- **Legacy integration** where existing components need to integrate with new event-driven features

This creates an **Actor Model pattern** that combines the benefits of **domain-driven design**, **type safety**, and **reactive programming** while maintaining the simplicity of React hooks.