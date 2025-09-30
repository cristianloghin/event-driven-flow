import { useEffect, useState } from "react";

import {
  createChannel,
  useEmit,
  useEventState,
  useSubscribe,
  withEvents,
  withService,
} from "@frontend/icomera-utils/event-manager";

// Import the new debug tools
import { EventManagerDebug } from "../dev-tools";

// Define channel schemas
type UserStatus = "online" | "away" | "offline";

type UserProfile = {
  name: string;
  email: string;
};

type UserChannelSchema = {
  profileChanged: UserProfile;
  statusChanged: { status: UserStatus; previousStatus: UserStatus };
};

type Order = {
  id: string;
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  total: number;
};

type OrderStatus = "pending" | "shipped" | "delivered" | "cancelled";

type OrderChannelSchema = {
  created: Order;
  statusUpdated: { orderId: string; status: OrderStatus; timestamp: number };
  cancelled: { orderId: string; reason: string };
};

type AppNotification = {
  id: number;
  message: string;
  timestamp: string;
};

type AppChannel = {
  notification: AppNotification;
};

// Create typed channels
const appDomain = createChannel<AppChannel>("app", {});

const userChannel = createChannel<UserChannelSchema>("user", {
  initialState: {
    profileChanged: {
      name: "Loading...",
      email: "Loading...",
    },
    statusChanged: { status: "offline", previousStatus: "offline" },
  },
  middleware: [
    (payload, action) => {
      console.info(`👤 User domain: ${action}`, payload);
      return payload;
    },
  ],
  observers: [
    (eventName) => {
      // Analytics observer
      if (eventName.includes("statusChanged")) {
        console.info("📊 Analytics: User status change tracked");
      }
    },
  ],
});

const orderDomain = createChannel<OrderChannelSchema>("order", {
  middleware: [
    (payload, action) => {
      console.info(`📦 Order domain: ${action}`, payload);
      return payload;
    },
  ],
});

const UserProfileComponent = withEvents("UserProfile", { domain: "user" })(
  () => {
    const [user, setUser] = useEventState(userChannel, "profileChanged", {
      restoreOnMount: true,
    });
    const [status, setStatus] = useEventState(userChannel, "statusChanged", {
      restoreOnMount: true,
    });

    // Simulate API call
    useEffect(() => {
      const timer = setTimeout(() => {
        const userData: UserProfile = {
          name: "John Doe",
          email: "john@example.com",
        };
        setUser(userData);
      }, 1000);

      return () => clearTimeout(timer);
    }, [setUser]);

    const updateStatus = (newStatus: UserStatus) => {
      setStatus({ status: newStatus, previousStatus: status.previousStatus });
    };

    return (
      <div className="p-4 border rounded-lg bg-blue-50">
        <h3 className="font-bold text-lg mb-2">User Profile</h3>
        <p>Name: {user.name}</p>
        <p>Email: {user.email}</p>
        <p>
          Status:{" "}
          <span
            className={`font-semibold ${
              status.status === "online" ? "text-green-600" : "text-gray-600"
            }`}
          >
            {status.status}
          </span>
        </p>
        <div className="mt-2 space-x-2">
          <button
            onClick={() => updateStatus("online")}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Online
          </button>
          <button
            onClick={() => updateStatus("away")}
            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Away
          </button>
          <button
            onClick={() => updateStatus("offline")}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Offline
          </button>
        </div>
      </div>
    );
  }
);

const NotificationService = withService("NotificationService")(() => {
  const emit = useEmit();

  // Listen to user status changes
  useSubscribe(userChannel, "statusChanged", (payload) => {
    const notification = {
      id: Date.now(),
      message: `User status changed to ${payload.status}`,
      timestamp: new Date().toLocaleTimeString(),
      type: "status-change",
    };

    // Emit notification event for other components
    emit(appDomain, "notification", notification);
  });
});

const NotificationDisplay = withEvents("NotificationDisplay")(() => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Subscribe to app notifications
  useSubscribe(appDomain, "notification", (notification) => {
    setNotifications((prev) => [notification, ...prev.slice(0, 4)]);
  });

  const clearNotifications = () => setNotifications([]);

  return (
    <div className="p-4 border rounded-lg bg-yellow-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg">Notifications</h3>
        <button
          onClick={clearNotifications}
          className="text-sm px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear
        </button>
      </div>
      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="p-2 bg-white rounded border-l-4 border-yellow-400"
            >
              <p className="text-sm">{notif.message}</p>
              <p className="text-xs text-gray-500">{notif.timestamp}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No notifications</p>
      )}
    </div>
  );
});

const OrderManager = withEvents("OrderManager")(() => {
  const emit = useEmit();
  const [orders, setOrders] = useState([
    { id: "1", status: "pending", total: 99.99 },
    { id: "2", status: "shipped", total: 149.99 },
  ]);

  // Subscribe to order updates
  useSubscribe(orderDomain, "statusUpdated", (payload) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === payload.orderId
          ? { ...order, status: payload.status }
          : order
      )
    );
  });

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );

    emit(orderDomain, "statusUpdated", {
      orderId,
      status: newStatus,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="p-4 border rounded-lg bg-green-50">
      <h3 className="font-bold text-lg mb-2">Order Manager</h3>
      <div className="space-y-2">
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex justify-between items-center p-2 bg-white rounded"
          >
            <div>
              <span className="font-semibold">Order #{order.id}</span>
              <span className="ml-2 text-gray-600">${order.total}</span>
              <span
                className={`ml-2 px-2 py-1 rounded text-xs ${
                  order.status === "pending"
                    ? "bg-yellow-200"
                    : order.status === "shipped"
                    ? "bg-blue-200"
                    : "bg-green-200"
                }`}
              >
                {order.status}
              </span>
            </div>
            <select
              value={order.status}
              onChange={(e) =>
                updateOrderStatus(order.id, e.target.value as OrderStatus)
              }
              className="text-sm border rounded px-2 py-1"
            >
              <option value="pending">Pending</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
});

export const EventDrivenArchitectureDemo = () => {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Event-Driven Component Architecture
        </h1>
        <p className="text-gray-600">
          Actor Model Pattern for React - Enterprise Scale
        </p>
        <p className="text-sm text-blue-600 mt-2">
          💡 Click the 🐛 Debug button in the top-right corner to monitor events
          in real-time
        </p>
      </div>

      {/* Service Components (render null but manage data) */}
      <NotificationService />

      {/* UI Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showProfile && <UserProfileComponent />}
        <OrderManager />
        <NotificationDisplay />
      </div>
      <div>
        <button onClick={() => setShowProfile(!showProfile)}>
          Toggle User Profile
        </button>
      </div>

      {/* Include the new debug tools */}
      <EventManagerDebug enabled={true} />
    </div>
  );
};
