import { ReactNode } from 'react';
import DesktopSidebar from './DesktopSidebar';
import BottomNav from './BottomNav';

interface ResponsiveLayoutProps {
  children: ReactNode;
  hideNav?: boolean;
  contentClassName?: string;
}

const ResponsiveLayout = ({ children, hideNav = false, contentClassName = '' }: ResponsiveLayoutProps) => {
  if (hideNav) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Desktop/Tablet: Left sidebar */}
      <DesktopSidebar />
      
      {/* Main content - shifted right on desktop */}
      <div className={`md:ml-56 lg:ml-64 ${contentClassName}`}>
        {children}
      </div>
      
      {/* Mobile: Bottom nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </>
  );
};

export default ResponsiveLayout;
