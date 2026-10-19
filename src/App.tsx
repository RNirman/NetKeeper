import React, { useEffect, useState } from 'react';

const App = () => {
  const [running, setRunning] = useState(false);
  const [interval, setInterval] = useState(10);
  const [targetUrl, setTargetUrl] = useState('https://example.com');

  useEffect(() => {
    window.hutchKeeper.getStatus().then((status) => {
      setRunning(status.running);
    });
  }, []);

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
            <strong>0</strong>
          </div>

          <div className="card stat-card">
            <span className="label">Successful</span>
            <strong>0</strong>
          </div>

          <div className="card stat-card">
            <span className="label">Failed</span>
            <strong>0</strong>
          </div>

          <div className="card stat-card">
            <span className="label">Average Latency</span>
            <strong>-- ms</strong>
          </div>
        </section>

        <section className="card activity-card">
          <div className="section-heading">
            <h2>Recent Activity</h2>
            <span>0 events</span>
          </div>

          <div className="empty-state">
            <p>No activity yet</p>
            <span>
              Start the keep-alive service to see network activity here.
            </span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;