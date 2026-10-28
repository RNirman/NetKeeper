import React, { useEffect, useState } from 'react';

interface ActivityItem {
  id: string;
  timestamp: string;
  success: boolean;
  statusCode?: number;
  latency: number;
  error?: string;
  targetUrl?: string;
}

const App = () => {
  const [running, setRunning] = useState(false);
  const [interval, setInterval] = useState(10);
  const [requests, setRequests] = useState(0);
  const [successful, setSuccessful] = useState(0);
  const [failed, setFailed] = useState(0);
  const [totalLatency, setTotalLatency] = useState(0);
  const [targetUrl, setTargetUrl] = useState('https://example.com');
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    window.hutchKeeper.getStatus().then((status) => {
      setRunning(status.running);
    });
  }, []);

  useEffect(() => {
    const removeListener = window.hutchKeeper.onResult((result) => {
      setRequests((value) => value + 1);

      if (result.success) {
        setSuccessful((value) => value + 1);
      } else {
        setFailed((value) => value + 1);
      }

      setTotalLatency((value) => value + result.latency);

      const newActivity: ActivityItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString(),
        success: result.success,
        statusCode: result.statusCode,
        latency: result.latency,
        error: result.error,
        targetUrl: result.targetUrl || targetUrl,
      };

      setActivities((prev) => [newActivity, ...prev].slice(0, 50));
    });

    return removeListener;
  }, [targetUrl]);

  const handleToggle = async () => {
    if (running) {
      const status = await window.hutchKeeper.stop();
      setRunning(status.running);
    } else {
      const status = await window.hutchKeeper.start(targetUrl, interval);

      setRunning(status.running);

      console.log('Request result:', status.result);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Hutch Keeper</h1>
          <p>Connection Keep-Alive</p>
        </div>

        <div className="status">
          <span
            className="status-dot"
            style={{
              background: running ? '#35c759' : '#687383',
            }}
          ></span>
          <span>{running ? 'Running' : 'Stopped'}</span>
        </div>
      </header>

      <main>
        <section className="card connection-card">
          <div>
            <p className="label">Connection Status</p>
            <h2>{running ? 'Keep-Alive Active' : 'Not Running'}</h2>
            <p className="description">
              {running
                ? 'The keep-alive service is currently running.'
                : 'Start the keep-alive service to maintain background network activity.'}
            </p>
          </div>

          <button className="start-button" onClick={handleToggle}>
            {running ? 'Stop Keep-Alive' : 'Start Keep-Alive'}
          </button>
        </section>

        <section className="card">
          <h2>Keep-Alive Settings</h2>

          <div className="settings">
            <div className="field">
              <label htmlFor="target">Target URL</label>
              <input
                id="target"
                type="url"
                value={targetUrl}
                onChange={(event) => setTargetUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="field">
              <label htmlFor="interval">Interval</label>
              <select
                id="interval"
                value={interval}
                onChange={(event) => setInterval(Number(event.target.value))}
              >
                <option value="5">5 seconds</option>
                <option value="10">10 seconds</option>
                <option value="15">15 seconds</option>
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
              </select>
            </div>
          </div>
        </section>

        <section className="stats">
          <div className="card stat-card">
            <span className="label">Requests</span>
            <strong>{requests}</strong>
          </div>

          <div className="card stat-card">
            <span className="label">Successful</span>
            <strong>{successful}</strong>
          </div>

          <div className="card stat-card">
            <span className="label">Failed</span>
            <strong>{failed}</strong>
          </div>

          <div className="card stat-card">
            <span className="label">Average Latency</span>
            <strong>
              {requests > 0 ? Math.round(totalLatency / requests) : '--'} ms
            </strong>
          </div>
        </section>

        <section className="card activity-card">
          <div className="section-heading">
            <h2>Recent Activity</h2>
            <div className="activity-heading-actions">
              <span>
                {activities.length} {activities.length === 1 ? 'event' : 'events'}
              </span>
              {activities.length > 0 && (
                <button
                  type="button"
                  className="clear-button"
                  onClick={() => setActivities([])}
                  title="Clear activity log"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="empty-state">
              <p>No activity yet</p>
              <span>
                Start the keep-alive service to see network activity here.
              </span>
            </div>
          ) : (
            <div className="activity-list">
              {activities.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-item-left">
                    <span
                      className={`activity-badge ${
                        activity.success ? 'badge-success' : 'badge-error'
                      }`}
                    >
                      {activity.statusCode
                        ? `HTTP ${activity.statusCode}`
                        : activity.success
                        ? 'SUCCESS'
                        : 'FAILED'}
                    </span>
                    <span className="activity-url" title={activity.targetUrl}>
                      {activity.targetUrl || 'Keep-alive ping'}
                    </span>
                    {activity.error && (
                      <span className="activity-error">
                        — {activity.error}
                      </span>
                    )}
                  </div>

                  <div className="activity-item-right">
                    <span className="activity-latency">{activity.latency} ms</span>
                    <span className="activity-time">{activity.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;