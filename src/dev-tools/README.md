# Event Manager Development Tools

This package includes development tools to help debug and monitor the Event Manager system during development.

## Components

### EventManagerDebug

The main debug component that automatically includes development tools in development environments.

```tsx
import { EventManagerDebug } from '@frontend/icomera-utils/event-manager/dev-tools';

function App() {
  return (
    <div>
      {/* Your app content */}
      
      {/* Include debug tools - only shown in development by default */}
      <EventManagerDebug />
      
      {/* Or force enable in any environment */}
      <EventManagerDebug enabled={true} />
    </div>
  );
}
```

### EventManagerDebugToggle

A standalone toggle button that shows/hides the debug panel.

```tsx
import { EventManagerDebugToggle } from '@frontend/icomera-utils/event-manager/dev-tools';

function App() {
  return (
    <div>
      {/* Your app content */}
      
      <EventManagerDebugToggle />
    </div>
  );
}
```

### EventManagerDebugPanel

The debug panel component that can be controlled manually.

```tsx
import { EventManagerDebugPanel } from '@frontend/icomera-utils/event-manager/dev-tools';

function App() {
  const [showDebug, setShowDebug] = useState(false);
  
  return (
    <div>
      {/* Your app content */}
      
      <button onClick={() => setShowDebug(!showDebug)}>
        Toggle Debug
      </button>
      
      <EventManagerDebugPanel isVisible={showDebug} />
    </div>
  );
}
```

## Features

### Events Tab
- Lists all active event channels
- Shows listener count for each event
- Displays the last payload emitted for each event
- Updates in real-time (every second)

### Components Tab  
- Shows all registered components in the Event Manager
- Displays component names, IDs, and registration timestamps
- Helps track component lifecycle and registration

## Usage Tips

1. **Development Mode**: Use `<EventManagerDebug />` to automatically enable debug tools only in development
2. **Production Debugging**: Use `<EventManagerDebug enabled={true} />` to force enable debugging
3. **Custom Integration**: Use individual components for custom debug interfaces
4. **Performance**: Debug tools update every second to balance performance with real-time monitoring

## Styling

The debug tools use inline styles to avoid dependency on external CSS frameworks. The interface includes:

- Fixed position toggle button (top-right corner)
- Floating debug panel with tabs
- Monospace font for better code readability
- Responsive design that works on various screen sizes

## Example

See `src/event-manager/example/Test.tsx` for a complete example of the Event Manager with debug tools integration.
