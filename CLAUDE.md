# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `@mikrostack/edf` - an Actor Model event-driven React library that implements channel-based communication without prop drilling. The library provides an alternative to traditional React patterns by enabling components to communicate through typed channels instead of prop passing.

## Development Commands

- **Build**: `npm run build` - Builds the library using tsup, generating CommonJS, ES modules, and TypeScript declarations
- **Development**: `npm run dev` - Runs tsup in watch mode for development
- **Install dependencies**: `npm ci` (preferred) or `npm install`

Note: This project currently has no linting, testing, or formatting commands configured. Only build commands are available.

## Architecture Overview

### Core Pattern
The library implements the **Actor Model pattern** where components act as independent actors communicating through well-defined channels:

- **Channel-based communication**: Components communicate via typed channels instead of props
- **Local state with event synchronization**: Each component maintains its own state but broadcasts updates to other subscribed components
- **Automatic memoization**: Components wrapped with `withEvents`/`withService` are automatically memoized and receive no props from parents
- **State restoration**: Components can restore state from last cached messages on mount
- **Zero coupling**: Components can be moved, modified, or removed without affecting others

### Key Components

#### Core Infrastructure (`src/core/`)
- **EventManager.ts**: Central event management system handling subscriptions, emissions, and component lifecycle

#### Public API (`src/api/`)
- **createChannel.ts**: Creates typed channels for domain-specific communication
- **useEventState.ts**: Hook for managing local state that synchronizes via events
- **useSubscribe.ts**: Hook for subscribing to channel events without state management
- **useEmit.ts**: Hook for publishing events to channels
- **withEvents.tsx**: HOC that wraps components for event capabilities (no props from parent)
- **withService.tsx**: HOC for service components that provide business logic but render nothing
- **useComponentId.ts**: Hook for component registration and ID management

#### Supporting Files
- **context/index.ts**: React context for component ID management
- **dev-tools/**: Development and debugging utilities
- **types.ts**: TypeScript type definitions for the entire system

### Domain-Driven Design
The library encourages organizing events into typed channels representing different business domains:

```typescript
// Example channel schemas
type UserChannelSchema = {
  profileChanged: UserProfile;
  statusChanged: { status: UserStatus; previousStatus: UserStatus };
};

type OrderChannelSchema = {
  created: Order;
  statusUpdated: { orderId: string; status: OrderStatus };
};
```

### Compatibility
The library is fully compatible with traditional React patterns. Components can gradually adopt event-driven architecture or use both patterns simultaneously.

## Build Configuration

- **tsup.config.ts**: Builds both CommonJS and ES modules with TypeScript declarations
- **tsconfig.json**: TypeScript configuration targeting ES2020 with React JSX support
- **Output**: `dist/` directory with `index.js`, `index.mjs`, and `index.d.ts`

## Publishing

The project uses GitHub Actions for automated publishing:
- **Trigger**: Git tags matching `v*.*.*` pattern
- **Process**: Builds package and publishes to npm with GitHub release creation
- **Registry**: npmjs.org

## Dependencies

- **Runtime**: React 18+ (peer dependency)
- **Build**: TypeScript 5.9+, tsup 8.5+
- **Target**: Libraries and applications using React