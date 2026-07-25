import { useEffect } from 'react';
import { useAppBootstrap } from './hooks/useAppBootstrap';
import { HomeMapPage } from './pages/HomeMapPage';
import { useAppStore } from './store';

/** Mirrors iOS `RootView` + `MikeBilliOSApp`. */
function App() {
  useAppBootstrap();

  const enableDarkMode = useAppStore((s) => s.enableDarkMode);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', enableDarkMode);
  }, [enableDarkMode]);

  return <HomeMapPage />;
}

export default App;
