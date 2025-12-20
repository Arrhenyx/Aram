import React, { useState, useEffect } from 'react'
import { profileAPI } from '../services/api'
import { Save, RefreshCw, User, Palette, Languages } from 'lucide-react'

function Profile() {
  const [profile, setProfile] = useState(null)
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    setLoading(true)
    try {
      const [profileData, modelsData] = await Promise.all([
        profileAPI.getProfile(),
        profileAPI.getModels()
      ])
      setProfile(profileData)
      setModels(modelsData.available_models)
    } catch (error) {
      console.error('Error loading profile data:', error)
      setMessage('خطا در بارگذاری اطلاعات')
    } finally {
      setLoading(false)
    }
  }

  const handleModelChange = async (modelName) => {
    setSaving(true)
    setMessage('')
    try {
      await profileAPI.updateModel(modelName)
      setProfile(prev => ({ ...prev, preferred_model: modelName }))
      setMessage('مدل با موفقیت به‌روز شد')
    } catch (error) {
      setMessage('خطا در به‌روزرسانی مدل')
    } finally {
      setSaving(false)
    }
  }

  const handleCulturalPreferenceChange = (key, value) => {
    setProfile(prev => ({
      ...prev,
      cultural_preferences: {
        ...prev.cultural_preferences,
        [key]: value
      }
    }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">خطا در بارگذاری پروفایل</p>
        <button onClick={loadProfileData} className="btn-primary mt-4">
          تلاش مجدد
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">پروفایل کاربری</h1>
        <button
          onClick={loadProfileData}
          className="btn-secondary flex items-center space-x-2 space-x-reverse"
        >
          <RefreshCw className="h-4 w-4" />
          <span>بروزرسانی</span>
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.includes('موفقیت') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        <div className="card">
          <div className="flex items-center space-x-3 space-x-reverse mb-4">
            <User className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">اطلاعات پایه</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ایمیل</label>
              <input
                type="email"
                value={profile.user_id}
                disabled
                className="input-field bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">خلاصه پروفایل</label>
              <input
                type="text"
                value={profile.summary}
                disabled
                className="input-field bg-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 space-x-reverse mb-4">
            <Languages className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">تنظیمات مدل</h3>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              مدل هوش مصنوعی پیشفرض
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {models.map((model) => (
                <button
                  key={model}
                  onClick={() => handleModelChange(model)}
                  disabled={saving || model === profile.preferred_model}
                  className={`p-3 border rounded-lg text-right transition-colors ${
                    model === profile.preferred_model
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-primary-500 hover:bg-primary-25'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="font-medium">{model.split('/').pop()}</div>
                  <div className="text-xs text-gray-500 truncate">{model}</div>
                </button>
              ))}
            </div>
            {saving && (
              <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600 mt-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                <span>در حال به‌روزرسانی...</span>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3 space-x-reverse mb-4">
            <Palette className="h-6 w-6 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">ترجیحات فرهنگی</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">گرایش مذهبی</label>
              <div className="flex space-x-3 space-x-reverse">
                {['neutral', 'muslim', 'secular'].map((option) => (
                  <button
                    key={option}
                    onClick={() => handleCulturalPreferenceChange('religion', option)}
                    className={`px-4 py-2 border rounded-lg transition-colors ${
                      profile.cultural_preferences?.religion === option
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {option === 'neutral' && 'خنثی'}
                    {option === 'muslim' && 'مسلمان'}
                    {option === 'secular' && 'سکولار'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">علاقه به شعر</label>
              <button
                onClick={() => handleCulturalPreferenceChange('poetry', !profile.cultural_preferences?.poetry)}
                className={`px-4 py-2 border rounded-lg transition-colors ${
                  profile.cultural_preferences?.poetry
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-primary-500'
                }`}
              >
                {profile.cultural_preferences?.poetry ? 'فعال' : 'غیرفعال'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">سبک درمانی</label>
              <div className="flex space-x-3 space-x-reverse">
                {['standard', 'cbt', 'mindfulness'].map((option) => (
                  <button
                    key={option}
                    onClick={() => handleCulturalPreferenceChange('therapy_style', option)}
                    className={`px-4 py-2 border rounded-lg transition-colors ${
                      profile.cultural_preferences?.therapy_style === option
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {option === 'standard' && 'استاندارد'}
                    {option === 'cbt' && 'شناختی-رفتاری'}
                    {option === 'mindfulness' && 'ذهن‌آگاهی'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile