import { useRef, useState, useEffect } from 'react';
import MatrixCanvas from './MatrixCanvas';
import Message from './Message';
import Settings, { DEFAULT_CONFIG } from './Settings';

function loadConfig() {
  try {
    const saved = localStorage.getItem('matrixConfig');
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export default function App() {
  const [config, setConfig] = useState(loadConfig);
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
    localStorage.setItem('matrixConfig', JSON.stringify(config));
  }, [config]);

  return (
    <>
      <MatrixCanvas configRef={configRef} />
      <Message />
      <Settings config={config} onChange={setConfig} />
    </>
  );
}
