import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { MessageCircle, User, Home, LogOut, Stethoscope } from 'lucide-react'

function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { path: '/', icon: Home, label: 'داشبورد' },
    { path: '/chat', icon: MessageCircle, label: 'گفتگو' },
    { path: '/assessment', icon: Stethoscope, label: 'ارزیابی سلامت' },
    { path: '/profile', icon: User, label: 'پروفایل' },
  ]

  if (!user) return null

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8 space-x-reverse">
            <Link to="/" className="flex items-center space-x-2 space-x-reverse">
              <MessageCircle className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">آرامش</span>
            </Link>
            
            <div className="hidden md:flex space-x-6 space-x-reverse">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-1 space-x-reverse px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4 space-x-reverse">
            <span className="text-sm text-gray-700">{user.email}</span>
            <button
              onClick={logout}
              className="flex items-center space-x-1 space-x-reverse text-gray-600 hover:text-gray-900 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">خروج</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
