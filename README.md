# @mikrostack/edf

**Actor Model Event-Driven React** - A communication engine that implements the Actor Model pattern for React applications, enabling channel-based communication without prop drilling.

## 🎯 Core Philosophy

**@mikrostack/edf is a communication engine, not a state machine.**

The library's primary goal is to enable **clean communication between independent actors** (React components) while letting React handle what it does best - local state management and UI rendering.

## 🎯 Core Concept

Components act as **independent actors** that communicate through **typed channels** using **mailboxes**:

- **Actor Model Pattern** - Each component is an independent actor with its own mailbox
- **Message Passing** - Actors communicate via `tell()`, `receive()`, and `ask()` methods
- **Local State** - Components use React's `useState` for local state
- **Event Synchronization** - Shared state syncs across components via message passing
- **Channel-based Communication** - Organize messages into typed domain channels
- **Request-Reply Patterns** - Services can respond to requests asynchronously

## 🚀 Key Features

### **Actor Model Messaging**
- **`mailbox.tell()`** - Send fire-and-forget messages
- **`mailbox.receive()`** - Listen for incoming messages
- **`mailbox.ask()`** - Request-reply pattern with timeout
- **Rate limiting** - Automatic protection against event storms
- **Loop detection** - Prevents infinite message chains

### **Local State + Event Synchronization**
- **React useState** - For local component state
- **useSyncState** - For state that syncs across components
- **Channel-based domains** - Organize communication by business domain

### **Performance Optimization**
- **Automatic memoization** - Components are wrapped in `React.memo()`
- **Selective updates** - Only subscribed components re-render
- **Zero prop dependencies** - Eliminates cascading re-renders

## 📚 API Reference

### Core Components

#### `createChannel<TSchema>(name: string, options?)`
Creates a typed channel for domain-specific communication.

```typescript
type UserChannelSchema = {
  profileChanged: { name: string; email: string };
  statusChanged: { status: "online" | "offline" };
};

const userChannel = createChannel<UserChannelSchema>("user", {
  initialState: {
    profileChanged: { name: "Loading...", email: "Loading..." }
  }
});
```

#### `withMailbox(componentName: string, metadata?)`
Wraps components to provide mailbox capabilities. Components receive no props from parents.

```typescript
const UserProfile = withMailbox("UserProfile")(({mailbox}) => {
  // Use React useState for local state
  const [isLoading, setIsLoading] = useState(false);

  // Use mailbox for communication
  const [user, setUser] = useSyncState(mailbox, userChannel, 'profileChanged');

  const handleSave = () => {
    setIsLoading(true);
    mailbox.tell(userChannel, 'profileChanged', {
      name: 'Updated',
      email: user.email
    });
    setIsLoading(false);
  };

  return <UserForm user={user} loading={isLoading} onSave={handleSave} />;
});
```

#### `withService(serviceName: string, metadata?)`
Wraps service components that provide business logic but render nothing.

```typescript
const ValidationService = withService("ValidationService")((mailbox) => {
  // Handle validation requests
  mailbox.receive(userChannel, 'validateProfile', async (request) => {
    const isValid = await validateUserLogic(request);

    // Reply if this was an ask() request
    if (request._replyTo) {
      mailbox.reply(request._replyTo, { isValid });
    }

    // Also broadcast for listeners
    mailbox.tell(userChannel, 'profileValidated', { isValid });
  });
});
```

### Mailbox Methods

#### `mailbox.tell(channel, action, payload)`
Send a fire-and-forget message.

```typescript
mailbox.tell(userChannel, 'profileChanged', { name: 'John', email: 'john@example.com' });
```

#### `mailbox.receive(channel, action, handler)`
Listen for incoming messages.

```typescript
mailbox.receive(orderChannel, 'statusUpdated', (payload) => {
  console.log('Order status changed:', payload.status);
});
```

#### `mailbox.ask(channel, action, payload, timeout?): Promise<Response>`
Send a request and wait for a response.

```typescript
const result = await mailbox.ask(validationService, 'validateUser', userData, 5000);
if (result.isValid) {
  // User is valid
}
```

#### `mailbox.reply(replyTo, response)`
Reply to an ask() request (used in services).

```typescript
mailbox.receive(userService, 'validateUser', (request) => {
  const isValid = validate(request);
  mailbox.reply(request._replyTo, { isValid });
});
```

### State Management

#### `useSyncState(mailbox, channel, action, options?)`
Manages state that synchronizes across components. Supports React useState patterns.

```typescript
const [user, setUser] = useSyncState(mailbox, userChannel, 'profileChanged');

// React useState patterns supported:
setUser({ name: 'John', email: 'john@example.com' }); // Full replacement
setUser({ name: 'Updated' }); // Partial update
setUser(prev => ({ ...prev, name: 'Updated' })); // Function with previous state
```

## 🛠 Usage Patterns

### Basic Component Communication

```typescript
// Define domain channels
const userChannel = createChannel<{
  profileChanged: { name: string; email: string };
  statusChanged: { status: string };
}>('user');

// Components communicate via mailboxes
const UserProfile = withMailbox('UserProfile')(({mailbox}) => {
  const [user, setUser] = useSyncState(mailbox, userChannel, 'profileChanged');

  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={() => setUser({ ...user, name: 'Updated' })}>
        Update Name
      </button>
    </div>
  );
});

const UserStatus = withMailbox('UserStatus')(({mailbox}) => {
  const [user] = useSyncState(mailbox, userChannel, 'profileChanged');

  return <div>Status for {user.name}</div>;
});
```

### Service Components with Request-Reply

```typescript
const UserService = withService('UserService')(({mailbox}) => {
  mailbox.receive(userChannel, 'validateProfile', async (request) => {
    const isValid = await validateUser(request);

    // Reply to ask() requests
    if (request._replyTo) {
      mailbox.reply(request._replyTo, { isValid, userId: request.id });
    }
  });
});

const UserForm = withMailbox('UserForm')(({mailbox}) => {
  const [user, setUser] = useSyncState(mailbox, userChannel, 'profileChanged');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async () => {
    setIsValidating(true);

    try {
      const result = await mailbox.ask(userChannel, 'validateProfile', user);
      if (result.isValid) {
        console.log('User is valid!');
      }
    } catch (error) {
      console.error('Validation timeout');
    } finally {
      setIsValidating(false);
    }
  };

  return <form onSubmit={handleSubmit}>{/* form fields */}</form>;
});
```

### Mixed Local and Shared State

```typescript
const OrderManager = withMailbox('OrderManager')(({mailbox}) => {
  // Local state (not shared)
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({ status: 'all' });

  // Shared state (syncs across components)
  const [orders, setOrders] = useSyncState(mailbox, orderChannel, 'listUpdated');

  useEffect(() => {
    // Listen for updates from other components
    const unsub = mailbox.receive(orderChannel, 'statusUpdated', (payload) => {
      setOrders(prev =>
        prev.map(order =>
          order.id === payload.orderId
            ? { ...order, status: payload.status }
            : order
        )
      );
    });

    return () => unsub();
  }, [mailbox])
  

  return (
    <div>
      <FilterControls filters={filters} onChange={setFilters} />
      <OrderList orders={orders} loading={isLoading} />
    </div>
  );
});
```

## 🎯 When to Use

**Perfect for:**
- **Cross-component communication** - Replace prop drilling with clean messaging
- **Service-oriented architectures** - Components as independent services
- **Request-reply patterns** - Services that respond to requests
- **Complex business logic** - Multi-step workflows coordinated via messaging
- **Real-time applications** - Multiple components reacting to events

**Local React state is still perfect for:**
- **UI state** - Loading indicators, form state, modal visibility
- **Component-specific data** - Data that doesn't need to be shared
- **Performance-critical updates** - Immediate local updates without messaging overhead

## 🏆 Benefits

### **Clean Separation of Concerns**
- **Communication Engine** - Handles actor messaging and coordination
- **React State** - Handles local component state and UI updates
- **Best of both worlds** - Use the right tool for each job

### **Actor Model Benefits**
- **Location transparency** - Components don't need to know about each other
- **Fault isolation** - Component failures don't cascade
- **Request-reply patterns** - Synchronous-style async coordination
- **Message ordering** - Built-in rate limiting and loop prevention

### **Performance**
- **Selective re-renders** - Only components that subscribe to specific events update
- **Automatic memoization** - Components wrapped in React.memo() by default
- **Zero prop dependencies** - Eliminates cascading re-renders

### **Developer Experience**
- **Type safety** - Full TypeScript support for channels and messages
- **Familiar patterns** - Works alongside existing React patterns
- **Gradual adoption** - Can be introduced incrementally
- **Clear debugging** - Message flows are explicit and traceable

---

**@mikrostack/edf** - Enabling clean actor-based communication in React applications.