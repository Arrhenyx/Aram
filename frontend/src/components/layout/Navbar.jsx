import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  MessageCircle, 
  User, 
  Home, 
  LogOut, 
  Stethoscope,
  LucideIcon
} from 'lucide-react';

// تایپ‌های TypeScript برای ایمنی بیشتر
interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  requiresAuth?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', icon: Home, label: 'داشبورد' },
  { path: '/chat', icon: MessageCircle, label: 'گفتگو' },
  { path: '/assessment', icon: Stethoscope, label: 'ارزیابی سلامت' },
  { path: '/profile', icon: User, label: 'پروفایل' },
];

// کامپوننت مجزا برای آیتم‌های ناوبری
interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ item, isActive }) => {
  const { icon: Icon, path, label } = item;
  
  return (
    <Link
      to={path}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
        transition-all duration-200 ease-in-out
        ${isActive
          ? 'bg-primary-100 text-primary-700 shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
      `}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span>{label}</span>
    </Link>
  );
};

// کامپوننت مجزا برای دسکتاپ نویگیشن
const DesktopNavigation: React.FC = () => {
  const location = useLocation();
  
  return (
    <nav className="hidden md:flex items-center gap-4" aria-label="منوی اصلی">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          item={item}
          isActive={location.pathname === item.path}
        />
      ))}
    </nav>
  );
};

// کامپوننت مجزا برای بخش کاربر
interface UserSectionProps {
  email: string;
  onLogout: () => void;
}

const UserSection: React.FC<UserSectionProps> = ({ email, onLogout }) => (
  <div className="flex items-center gap-4">
    <span 
      className="text-sm text-gray-700 truncate max-w-[150px]" 
      title={email}
    >
      {email}
    </span>
    
    <button
      onClick={onLogout}
      className="
        flex items-center gap-2 
        text-gray-600 hover:text-red-600 
        transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50
        rounded-lg px-2 py-1
      "
      aria-label="خروج از حساب کاربری"
    >
      <LogOut className="h-4 w-4" />
      <span className="text-sm hidden sm:inline">خروج</span>
    </button>
  </div>
);

// کامپوننت اصلی Navbar
const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Early return برای کاربر غیر‌مجاز
  if (!user) {
    return null;
  }

  // بررسی فعال بودن مسیر
  const isActive = (path: string): boolean => 
    location.pathname === path || 
    (path !== '/' && location.pathname.startsWith(path));

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* سمت راست: لوگو و ناوبری */}
          <div className="flex items-center gap-8">
            {/* لوگو */}
            <Link 
              to="/" 
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-label="بازگشت به صفحه اصلی"
            >
              <MessageCircle className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900 whitespace-nowrap">
                آرامش
              </span>
            </Link>

            {/* ناوبری دسکتاپ */}
            <DesktopNavigation />
          </div>

          {/* سمت چپ: اطلاعات کاربر */}
          <UserSection email={user.email} onLogout={logout} />
        </div>
      </div>
    </header>
  );
};

export default React.memo(Navbar);
