import React, { useState, useEffect } from "react";
import { globalEventManager } from "../core/EventManager";

export const EventManagerDebugPanel: React.FC<{ isVisible: boolean }> = ({
  isVisible,
}) => {
  const [activeTab, setActiveTab] = useState<"events" | "components">("events");
  const [events, setEvents] = useState<string[]>([]);
  const [components, setComponents] = useState<
    Array<{ id: string; name: string; registeredAt: number }>
  >([]);

  useEffect(() => {
    if (!isVisible) return;

    const unsub: (() => void)[] = [];

    unsub.push(globalEventManager.getEvents(setEvents));
    unsub.push(globalEventManager.getComponentRegistry(setComponents));

    return () => {
      unsub.forEach((fn) => fn());
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "50px",
        right: "20px",
        width: "400px",
        height: "500px",
        backgroundColor: "white",
        border: "1px solid #ccc",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 10000,
        fontFamily: "monospace",
        fontSize: "12px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px",
          borderBottom: "1px solid #eee",
          backgroundColor: "#f5f5f5",
          fontWeight: "bold",
        }}
      >
        Event Manager Debug
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
        <button
          onClick={() => setActiveTab("events")}
          style={{
            flex: 1,
            padding: "8px",
            border: "none",
            backgroundColor: activeTab === "events" ? "#007acc" : "#f0f0f0",
            color: activeTab === "events" ? "white" : "black",
            cursor: "pointer",
          }}
        >
          Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab("components")}
          style={{
            flex: 1,
            padding: "8px",
            border: "none",
            backgroundColor: activeTab === "components" ? "#007acc" : "#f0f0f0",
            color: activeTab === "components" ? "white" : "black",
            cursor: "pointer",
          }}
        >
          Components ({components?.length})
        </button>
      </div>

      <div
        style={{
          padding: "10px",
          height: "calc(100% - 100px)",
          overflow: "auto",
        }}
      >
        {activeTab === "events" ? (
          <div>
            {events.length === 0 ? (
              <div style={{ color: "#999" }}>No events registered</div>
            ) : (
              events.map((eventName) => {
                const listenerCount =
                  globalEventManager.getEventListenerCount(eventName);
                const lastPayload = globalEventManager.getPayloads(eventName);

                return (
                  <div
                    key={eventName}
                    style={{
                      marginBottom: "10px",
                      padding: "8px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: "4px",
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#007acc" }}>
                      {eventName}
                    </div>
                    <div style={{ color: "#666", fontSize: "11px" }}>
                      Listeners: {listenerCount}
                    </div>
                    {lastPayload && (
                      <div
                        style={{
                          marginTop: "4px",
                          color: "#666",
                          fontSize: "10px",
                          maxHeight: "60px",
                          overflow: "auto",
                        }}
                      >
                        Last: {JSON.stringify(lastPayload, null, 2)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div>
            {components?.length === 0 ? (
              <div style={{ color: "#999" }}>No components registered</div>
            ) : (
              components?.map((component) => (
                <div
                  key={component.id}
                  style={{
                    marginBottom: "10px",
                    padding: "8px",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "4px",
                  }}
                >
                  <div style={{ fontWeight: "bold", color: "#007acc" }}>
                    {component.name}
                  </div>
                  <div style={{ color: "#666", fontSize: "11px" }}>
                    ID: {component.id}
                  </div>
                  <div style={{ color: "#666", fontSize: "11px" }}>
                    Registered:{" "}
                    {new Date(component.registeredAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const EventManagerDebugToggle: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 10001,
          padding: "8px 12px",
          backgroundColor: "#007acc",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "12px",
          fontFamily: "monospace",
        }}
      >
        {isVisible ? "✕" : "🐛"} Debug
      </button>

      <EventManagerDebugPanel isVisible={isVisible} />
    </>
  );
};

// Main debug component that can be easily added to any app
export const EventManagerDebug: React.FC<{ enabled?: boolean }> = ({
  enabled = process.env.NODE_ENV === "development",
}) => {
  if (!enabled) return null;

  return <EventManagerDebugToggle />;
};
