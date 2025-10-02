# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `@mikrostack/edf` - an Actor Model event-driven React library that implements channel-based communication without prop drilling. The library serves as a **communication engine, not a state machine**, enabling components to act as independent actors that communicate through typed channels using mailboxes.

## Development Commands

- **Build**: `npm run build` - Builds the library using tsup, generating CommonJS, ES modules, and TypeScript declarations
- **Development**: `npm run dev` - Runs tsup in watch mode for development
- **Install dependencies**: `npm ci` (preferred) or `npm install`

Note: This project currently has no linting, testing, or formatting commands configured. Only build commands are available.

## Architecture Overview

### Core Pattern: Actor Model with Mailboxes
The library implements a pure **Actor Model pattern** where each component is an independent actor with its own mailbox for message passing:

- **Mailbox-based communication**: Each component gets a `ComponentMailbox` instance for sending and receiving messages
- **Message passing**: Actors communicate via `mailbox.tell()`, `mailbox.receive()`, and `mailbox.ask()` methods
- **Local state + event synchronization**: Components use React's `useState` for local state and `useSyncState` for shared state
- **Request-reply patterns**: `mailbox.ask()` enables synchronous-style async coordination between components
- **Zero coupling**: Components receive no props from parents and can be moved/modified independently
- **Automatic protection**: Built-in rate limiting and loop detection prevent event storms

### Key Components

#### Core Infrastructure (`src/core/`)
- **EventManager.ts**: Central event management system with rate limiting, loop detection, and component lifecycle management
- **ComponentMailbox.ts**: Individual mailbox class for each component, providing `tell()`, `receive()`, `ask()`, and `reply()` methods

#### Public API (`src/api/`)
- **createChannel.ts**: Creates typed channels for domain-specific communication
- **useSyncState.ts**: Hook for managing state that synchronizes across components (replaces useEventState)
- **withEvents.tsx**: HOC that wraps components and provides a mailbox (no props from parent)
- **withService.tsx**: HOC for service components that provide business logic but render nothing
- **useComponentId.ts**: Hook for component registration and ID management

#### Supporting Files
- **context/index.ts**: React context for component ID management
- **dev-tools/**: Development and debugging utilities including EventManagerDebug component
- **types.ts**: TypeScript type definitions for the entire system
- **index.ts**: Main export file exposing the public API

### Communication Patterns

#### Fire-and-Forget Messaging
```typescript
mailbox.tell(userChannel, 'profileChanged', userData);
```

#### Event Listening
```typescript
mailbox.receive(orderChannel, 'statusUpdated', (payload) => {
  // Handle the message
});
```

#### Request-Reply Pattern
```typescript
// Client
const result = await mailbox.ask(validationService, 'validateUser', userData, 5000);

// Service
mailbox.receive(validationService, 'validateUser', (request) => {
  const isValid = validate(request);
  if (request._replyTo) {
    mailbox.reply(request._replyTo, { isValid });
  }
});
```

#### State Synchronization
```typescript
const [user, setUser] = useSyncState(mailbox, userChannel, 'profileChanged');
// Supports React useState patterns: full replacement, partial updates, function updates
```

### Domain-Driven Design
The library encourages organizing communication into typed channels representing different business domains:

```typescript
type UserChannelSchema = {
  profileChanged: { name: string; email: string };
  statusChanged: { status: UserStatus; previousStatus: UserStatus };
};

const userChannel = createChannel<UserChannelSchema>("user", {
  initialState: {
    profileChanged: { name: "Loading...", email: "Loading..." }
  }
});
```

### Component Patterns

#### Event-Driven Components
```typescript
const UserProfile = withEvents("UserProfile")((mailbox) => {
  const [user, setUser] = useSyncState(mailbox, userChannel, 'profileChanged');
  const [isLoading, setIsLoading] = useState(false); // Local state

  return <UserForm user={user} loading={isLoading} />;
});
```

#### Service Components
```typescript
const ValidationService = withService("ValidationService")((mailbox) => {
  mailbox.receive(userChannel, 'validateProfile', async (request) => {
    const isValid = await validateUser(request);
    if (request._replyTo) {
      mailbox.reply(request._replyTo, { isValid });
    }
  });
});
```

## Build Configuration

- **tsup.config.ts**: Builds both CommonJS and ES modules with TypeScript declarations, minification, and source maps
- **tsconfig.json**: TypeScript configuration targeting ES2020 with React JSX support
- **Output**: `dist/` directory with `index.js`, `index.mjs`, and `index.d.ts`
- **Tree-shaking**: `"sideEffects": false` in package.json enables proper tree-shaking

## Key Design Decisions

### Communication Engine Philosophy
The library focuses on being a **communication engine** rather than a state management solution:
- **React handles**: Local component state (`useState`), UI rendering, component lifecycle
- **Library handles**: Inter-component messaging, request-reply patterns, event synchronization, actor coordination

### Local State + Message Passing
Components maintain their own local state but synchronize shared data through message passing:
- Use `useState` for local UI state (loading indicators, form state, etc.)
- Use `useSyncState` for data that needs to sync across components
- Use mailbox methods for cross-component communication and business logic coordination

### Actor Model Benefits
- **Location transparency**: Components don't need to know about each other
- **Fault isolation**: Component failures don't cascade
- **Message ordering**: Built-in protection against loops and storms
- **Async coordination**: Request-reply patterns enable complex workflows

## Dependencies

- **Runtime**: React 18+ (peer dependency)
- **Build**: TypeScript 5.9+, tsup 8.5+, @types/node for crypto.randomUUID()
- **Target**: Libraries and applications using React

The library is designed to work alongside traditional React patterns and can be adopted gradually.