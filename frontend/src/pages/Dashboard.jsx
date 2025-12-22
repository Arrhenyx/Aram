import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { profileAPI, healthAPI } from '../services/api'
import { MessageCircle, User, Stethoscope, Brain, TrendingUp } from 'lucide-react'

function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [healthProfile, setHealthProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [profileData, healthData] = await Promise.all([
        profileAPI.getProfile(),
        healthAPI.getHealthProfile()
      ])
      setProfile(profileData)
      setHealthProfile(healthData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMoodColor = (trend) => {
    const colors = {
      very_positive: 'text-green-600 bg-green-100',
      positive: 'text-lime-600 bg-lime-100',
      neutral: 'text-yellow-600 bg-yellow-100',
      slightly_negative: 'text-orange-600 bg-orange-100',
      negative: 'text-red-600 bg-red-100'
    }
    return colors[trend] || colors.neutral
  }

  const getRiskLevel = (phq9, gad7, suicidal) => {
    if (suicidal) return { level: 'critical', text: 'بحرانی', color: 'text-red-600 bg-red-100' }
    if (phq9 >= 20 || gad7 >= 15) return { level: 'high', text: 'بالا', color: 'text-orange-600 bg-orange-100' }
    if (phq9 >= 10 || gad7 >= 8) return { level: 'moderate', text: 'متوسط', color: 'text-yellow-600 bg-yellow-100' }
    return { level: 'low', text: 'پایین', color: 'text-green-600 bg-green-100' }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const riskInfo = healthProfile ? getRiskLevel(
    healthProfile.phq9_score,
    healthProfile.gad7_score,
    healthProfile.suicidal_thoughts
  ) : null

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">داشبورد</h1>
        <div className="flex space-x-3 space-x-reverse">
          <Link to="/chat" className="btn-primary flex items-center space-x-2 space-x-reverse">
            <MessageCircle className="h-4 w-4" />
            <span>شروع گفتگو</span>
          </Link>
          <Link to="/assessment" className="btn-secondary flex items-center space-x-2 space-x-reverse">
            <Stethoscope className="h-4 w-4" />
            <span>ارزیابی سلامت</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center space-x-3 space-x-reverse mb-4">
            <User className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">پروفایل کاربری</h3>
          </div>
          {profile && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">مدل پیشفرض:</span>
                <span className="font-medium">{profile.preferred_model}</span>
              </div>
              {profile.mood_score && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">حالت روحی:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMoodColor(profile.sentiment_trend)}`}>
                    {profile.sentiment_trend?.replace('_', ' ')}
                  </span>
                </div>
              )}
              <Link to="/profile" className="block text-center btn-secondary text-sm">
                مدیریت پروفایل
              </Link>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 space-x-reverse mb-4">
            <Stethoscope className="h-6 w-6 text-persian-600" />
            <h3 className="text-lg font-semibold text-gray-900">سلامت روان</h3>
          </div>
          {healthProfile ? (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">امتیاز PHQ-9:</span>
                <span className="font-medium">{healthProfile.phq9_score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">امتیاز GAD-7:</span>
                <span className="font-medium">{healthProfile.gad7_score}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">سطح خطر:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${riskInfo.color}`}>
                  {riskInfo.text}
                </span>
              </div>
              <Link to="/assessment" className="block text-center btn-primary text-sm">
                بروزرسانی ارزیابی
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-3">هنوز ارزیابی انجام نداده‌اید</p>
              <Link to="/assessment" className="btn-primary text-sm">
                اولین ارزیابی
              </Link>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 space-x-reverse mb-4">
            <Brain className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">ویژگی‌ها</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>گفتگوی هوشمند فارسی</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>پشتیبانی از مدل‌های مختلف</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>ارزیابی دوره‌ای سلامت</span>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span>تشخیص زودهنگام خطر</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">راهنما</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="space-y-2">
            <p><strong>گفتگو با آرامش:</strong> می‌توانید به زبان فارسی یا انگلیسی با دستیار صحبت کنید.</p>
            <p><strong>ارزیابی سلامت:</strong> هر ۷ روز یکبار وضعیت سلامت روان شما بررسی می‌شود.</p>
          </div>
          <div className="space-y-2">
            <p><strong>اطلاعات اضطراری:</strong> در صورت افکار خودکشی با ۱۲۳ یا ۱۴۸۰ تماس بگیرید.</p>
            <p><strong>حریم خصوصی:</strong> تمام گفتگوهای شما رمزنگاری و محرمانه نگهداری می‌شوند.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard