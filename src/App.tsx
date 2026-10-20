import React, { useEffect, useState } from 'react';

const supportedIntervals = [5, 10, 15, 30, 60];

const initialStatus: KeepAliveStatus = {
  running: false,
  target: '',
  intervalSeconds: 10,
  requests: 0,
  successful: 0,
  failed: 0,
  averageLatencyMs: null,
  recentEvents: [],
};

const App = () => {
  const [status, setStatus] = useState(initialStatus);
  const [target, setTarget] = useState('');
  const [intervalSeconds, setIntervalSeconds] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const unsubscribe = window.hutchKeeper.onUpdate(setStatus);

    window.hutchKeeper
      .getStatus()
      .then((currentStatus) => {
        if (mounted) {
          setStatus(currentStatus);
          setTarget(currentStatus.target);
          setIntervalSeconds(currentStatus.intervalSeconds);
        }
      })
      .catch((reason: unknown) => {
        if (mounted) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Could not read service status.',
          );
        }
      });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const toggleKeepAlive = async () => {
    setBusy(true);
    setError('');
    try {
      const updatedStatus = status.running
        ? await window.hutchKeeper.stop()
        : await window.hutchKeeper.start(target, intervalSeconds);
      setStatus(updatedStatus);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not update the ping service.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Hutch Keeper</h1>
          <p>Connection Keep-Alive</p>
        </div>

        <div className={`status ${status.running ? 'is-running' : ''}`}>
          <span className="status-dot" aria-hidden="true"></span>
          <span>{status.running ? 'Running' : 'Stopped'}</span>
        </div>
      </header>

      <main>
        <section className="card connection-card">
          <div>
            <p className="label">Connection Status</p>
            <h2>
              {status.running ? `Pinging ${status.target}` : 'Not Running'}
            </h2>
            <p className="description">
              Send periodic ICMP pings to help keep your Hutch connection
              active.
            </p>
          </div>

          <button
            className={`start-button ${status.running ? 'stop-button' : ''}`}
            onClick={toggleKeepAlive}
            disabled={busy}
          >
            {busy
              ? 'Please wait…'
              : status.running
                ? 'Stop Pinging'
                : 'Start Pinging'}
          </button>
        </section>

        <section className="card">
          <h2>Keep-Alive Settings</h2>

          <div className="settings">
            <div className="field">
              <label htmlFor="target">Target host or IP address</label>
              <input
                id="target"
                type="text"
                placeholder="example.com or 1.1.1.1"
                autoComplete="off"
                spellCheck={false}
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                disabled={status.running || busy}
              />
            </div>

            <div className="field">
              <label htmlFor="interval">Interval</label>
              <select
                id="interval"
                value={intervalSeconds}
                onChange={(event) =>
                  setIntervalSeconds(Number(event.target.value))
                }
                disabled={status.running || busy}
              >
                {supportedIntervals.map((seconds) => (
                  <option key={seconds} value={seconds}>
                    {seconds} seconds
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="hint">
            Use a host that responds to ICMP. Some hosts or networks block ping
            requests.
          </p>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </section>

        <section className="stats">
          <div className="card stat-card">
            <span className="label">Requests</span>
            <strong>{status.requests}</strong>
          </div>

          <div className="card stat-card">
            <span className="label">Successful</span>
            <strong>{status.successful}</strong>
          </div>

          <div className="card stat-card">
            <span className="label">Failed</span>
            <strong>{status.failed}</strong>
          </div>

          <div className="card stat-card">
            <span className="label">Average Latency</span>
            <strong>
              {status.averageLatencyMs === null
                ? '--'
                : status.averageLatencyMs}{' '}
              ms
            </strong>
          </div>
        </section>

        <section className="card activity-card">
          <div className="section-heading">
            <h2>Recent Activity</h2>
            <span>{status.requests} pings</span>
          </div>

          {status.recentEvents.length === 0 ? (
            <div className="empty-state">
              <p>No activity yet</p>
              <span>Start pinging to see connection activity here.</span>
            </div>
          ) : (
            <ul className="activity-list">
              {status.recentEvents.map((event, index) => (
                <li
                  className="activity-item"
                  key={`${event.timestamp}-${index}`}
                >
                  <span
                    className={`activity-indicator ${event.success ? 'success' : 'failure'}`}
                  />
                  <span className="activity-time">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="activity-message">{event.message}</span>
                  <span className="activity-latency">
                    {event.latencyMs === null ? '--' : `${event.latencyMs} ms`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
