'use client';
import { ConfigProvider } from 'antd';
import { rentPayAntTheme } from '../theme';
export function Providers({ children }: { children: React.ReactNode }) { return <ConfigProvider theme={rentPayAntTheme}>{children}</ConfigProvider>; }
