import React, { useState, useEffect } from 'react'
import { healthAPI } from '../services/api'
import { Save, AlertTriangle, CheckCircle } from 'lucide-react'

function HealthAssessment() {
  const [assessment, setAssessment] = useState({
    phq9_scores: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    gad7_scores: [0, 0, 0, 0, 0, 0, 0],
    sleep_quality: 3,
    suicidal_thoughts: false,
    stress_factors: []
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [lastAssessment, setLastAssessment] = useState(null)

  const stressOptions = [
    'کار و تحصیل',
    'روابط خانوادگی',
    'روابط اجتماعی',
    'مشکلات مالی',
    'سلامت جسمی',
    'عدم تعادل زندگی',
    'عدم تحرک',
    'سایر'
  ]

  const phq9Questions = [
    'کم علاقگی یا بی‌لذتی به انجام کارها',
    'احساس افسردگی، ناامیدی',
    'مشکل در به خواب رفتن یا خواب ماندن یا خواب زیاد',
    'احساس خستگی یا کمبود انرژی',
    'کم اشتهایی یا پرخوری',
    'احساس بد نسبت به خود - احساس شکست - احساس بی‌کفایتی',
    'مشکل در تمرکز روی امور',
    'کندی یا بی‌قراری در حرکات',
    'افکار خودکشی یا آسیب به خود'
  ]

  const gad7Questions = [
    'احساس عصبی، اضطراب یا نگرانی',
    'ناتوانی در توقف یا کنترل نگرانی',
    'نگرانی بیش از حد درباره مسائل مختلف',
    'مشکل در آرامش گرفتن',
    'بی‌قراری',
    'زودرنجی یا تحریک‌پذیری',
    'احساس ترس'
  ]

  useEffect(() => {
    loadLastAssessment()
  }, [])

  const loadLastAssessment = async () => {
    try {
      const data = await healthAPI.getHealthProfile()
      if (data) {
        setLastAssessment(data)
        // تبدیل داده‌های قدیمی به فرمت جدید
        setAssessment({
          phq9_scores: data.phq9_scores || Array(9).fill(0),
          gad7_scores: data.gad7_scores || Array(7).fill(0),
          sleep_quality: data.sleep_quality || 3,
          suicidal_thoughts: data.suicidal_thoughts || false,
          stress_factors: data.stress_factors || []
        })
      }
    } catch (error) {
      console.error('Error loading last assessment:', error)
    }
  }

  const handleStressFactorToggle = (factor) => {
    setAssessment(prev => ({
      ...prev,
      stress_factors: prev.stress_factors.includes(factor)
        ? prev.stress_factors.filter(f => f !== factor)
        : [...prev.stress_factors, factor]
    }))
  }

  const handlePHQ9Change = (questionIndex, score) => {
    setAssessment(prev => {
      const newScores = [...prev.phq9_scores]
      newScores[questionIndex] = score
      return {
        ...prev,
        phq9_scores: newScores
      }
    })
  }

  const handleGAD7Change = (questionIndex, score) => {
    setAssessment(prev => {
      const newScores = [...prev.gad7_scores]
      newScores[questionIndex] = score
      return {
        ...prev,
        gad7_scores: newScores
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const submissionData = {
        phq9_score: calculatePHQ9Score(),
        gad7_score: calculateGAD7Score(),
        sleep_quality: assessment.sleep_quality,
        suicidal_thoughts: assessment.suicidal_thoughts,
        stress_factors: assessment.stress_factors
      }

      const result = await healthAPI.updateAssessment(submissionData)
      setMessage('ارزیابی با موفقیت ثبت شد')
      
      if (result.risk_assessment.risk_level === 'critical') {
        setMessage('ارزیابی ثبت شد. لطفاً فوراً با خط بحران ۱۲۳ تماس بگیرید.')
      }
      
      setLastAssessment(result.profile)
    } catch (error) {
      setMessage('خطا در ثبت ارزیابی: ' + (error.detail || 'خطای ناشناخته'))
    } finally {
      setLoading(false)
    }
  }

  const calculatePHQ9Score = () => {
    return assessment.phq9_scores.reduce((sum, score) => sum + score, 0)
  }

  const calculateGAD7Score = () => {
    return assessment.gad7_scores.reduce((sum, score) => sum + score, 0)
  }

  const getRiskLevel = () => {
    const phq9 = calculatePHQ9Score()
    const gad7 = calculateGAD7Score()
    const suicidal = assessment.suicidal_thoughts

    if (suicidal) return { level: 'critical', text: 'بحرانی', color: 'text-red-600 bg-red-100' }
    if (phq9 >= 20 || gad7 >= 15) return { level: 'high', text: 'بالا', color: 'text-orange-600 bg-orange-100' }
    if (phq9 >= 10 || gad7 >= 8) return { level: 'moderate', text: 'متوسط', color: 'text-yellow-600 bg-yellow-100' }
    return { level: 'low', text: 'پایین', color: 'text-green-600 bg-green-100' }
  }

  // تابع برای فرمت کردن تاریخ
  const formatDate = (dateString) => {
    if (!dateString) return '---'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('fa-IR')
    } catch (error) {
      return '---'
    }
  }

  const riskInfo = getRiskLevel()

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">ارزیابی سلامت روان</h1>

      {message && (
        <div className={`p-4 rounded-lg mb-6 flex items-center space-x-3 space-x-reverse ${
          message.includes('۱۲۳') 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message.includes('۱۲۳') ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <span>{message}</span>
        </div>
      )}

      {riskInfo.level === 'critical' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3 space-x-reverse">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-red-800">وضعیت بحرانی</h3>
              <p className="text-red-700 mt-1">
                لطفاً فوراً با خطوط بحران تماس بگیرید:
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-red-800 font-medium">۱۲۳ - خط ملی بحران</p>
                <p className="text-red-800 font-medium">۱۴۸۰ - اورژانس اجتماعی</p>
                <p className="text-red-800 font-medium">۱۱۵ - اورژانس پزشکی</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* بخش PHQ-9 */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">پرسشنامه افسردگی (PHQ-9)</h3>
          <p className="text-sm text-gray-600 mb-6">
            در ۲ هفته گذشته هر یک از مشکلات زیر چقدر شما را آزار داده است؟
          </p>
          
          <div className="space-y-6">
            {phq9Questions.map((question, index) => (
              <div key={index} className="border-b border-gray-200 pb-4">
                <p className="font-medium text-gray-900 mb-3">
                  {index + 1}. {question}
                </p>
                <div className="flex justify-between text-xs text-gray-600 mb-2">
                  <span>اصلاً (0)</span>
                  <span>چند روز (1)</span>
                  <span>بیش از نصف روزها (2)</span>
                  <span>تقریباً هر روز (3)</span>
                </div>
                <div className="flex justify-between">
                  {[0, 1, 2, 3].map((score) => (
                    <label key={score} className="flex flex-col items-center space-y-2">
                      <input
                        type="radio"
                        name={`phq9-${index}`}
                        value={score}
                        checked={assessment.phq9_scores[index] === score}
                        onChange={() => handlePHQ9Change(index, score)}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-xs text-gray-600">{score}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">امتیاز PHQ-9:</span>
              <span className="text-2xl font-bold text-gray-900">{calculatePHQ9Score()}</span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {calculatePHQ9Score() >= 20 ? 'افسردگی شدید' :
               calculatePHQ9Score() >= 15 ? 'افسردگی نسبتاً شدید' :
               calculatePHQ9Score() >= 10 ? 'افسردگی متوسط' :
               calculatePHQ9Score() >= 5 ? 'افسردگی خفیف' : 'فاقد افسردگی'}
            </div>
          </div>
        </div>

        {/* بخش GAD-7 */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">پرسشنامه اضطراب (GAD-7)</h3>
          <p className="text-sm text-gray-600 mb-6">
            در ۲ هفته گذشته هر یک از مشکلات زیر چقدر شما را آزار داده است؟
          </p>
          
          <div className="space-y-6">
            {gad7Questions.map((question, index) => (
              <div key={index} className="border-b border-gray-200 pb-4">
                <p className="font-medium text-gray-900 mb-3">
                  {index + 1}. {question}
                </p>
                <div className="flex justify-between text-xs text-gray-600 mb-2">
                  <span>اصلاً (0)</span>
                  <span>چند روز (1)</span>
                  <span>بیش از نصف روزها (2)</span>
                  <span>تقریباً هر روز (3)</span>
                </div>
                <div className="flex justify-between">
                  {[0, 1, 2, 3].map((score) => (
                    <label key={score} className="flex flex-col items-center space-y-2">
                      <input
                        type="radio"
                        name={`gad7-${index}`}
                        value={score}
                        checked={assessment.gad7_scores[index] === score}
                        onChange={() => handleGAD7Change(index, score)}
                        className="text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-xs text-gray-600">{score}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">امتیاز GAD-7:</span>
              <span className="text-2xl font-bold text-gray-900">{calculateGAD7Score()}</span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {calculateGAD7Score() >= 15 ? 'اضطراب شدید' :
               calculateGAD7Score() >= 10 ? 'اضطراب متوسط' :
               calculateGAD7Score() >= 5 ? 'اضطراب خفیف' : 'فاقد اضطراب'}
            </div>
          </div>
        </div>

        {/* بخش سایر اطلاعات */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">سایر اطلاعات</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                کیفیت خواب در هفته گذشته
              </label>
              <div className="flex items-center space-x-4 space-x-reverse">
                <span className="text-sm text-gray-600">خیلی بد</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={assessment.sleep_quality}
                  onChange={(e) => setAssessment(prev => ({ ...prev, sleep_quality: parseInt(e.target.value) }))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600">عالی</span>
              </div>
              <div className="text-center mt-2">
                <span className="text-lg font-medium text-gray-900">{assessment.sleep_quality}/5</span>
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-3 space-x-reverse">
                <input
                  type="checkbox"
                  checked={assessment.suicidal_thoughts}
                  onChange={(e) => setAssessment(prev => ({ ...prev, suicidal_thoughts: e.target.checked }))}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  در ۲ هفته گذشته افکار خودکشی یا آسیب به خود داشته‌ام
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                عوامل استرس‌زای فعلی
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stressOptions.map((factor) => (
                  <label key={factor} className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      checked={assessment.stress_factors.includes(factor)}
                      onChange={() => handleStressFactorToggle(factor)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">{factor}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* خلاصه ارزیابی */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">خلاصه ارزیابی</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{calculatePHQ9Score()}</div>
              <div className="text-sm text-gray-600">PHQ-9</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{calculateGAD7Score()}</div>
              <div className="text-sm text-gray-600">GAD-7</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${riskInfo.color}`}>
                {riskInfo.text}
              </div>
              <div className="text-sm text-gray-600 mt-1">سطح خطر</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4 space-x-reverse">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center space-x-2 space-x-reverse disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? 'در حال ثبت...' : 'ثبت ارزیابی'}</span>
          </button>
        </div>
      </form>

      {/* بخش ارزیابی قبلی */}
      {lastAssessment && (
        <div className="card mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ارزیابی قبلی</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-600">تاریخ</div>
              <div className="font-medium">{formatDate(lastAssessment.last_assessment)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">PHQ-9</div>
              <div className="font-medium">{lastAssessment.phq9_score || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">GAD-7</div>
              <div className="font-medium">{lastAssessment.gad7_score || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">خواب</div>
              <div className="font-medium">{lastAssessment.sleep_quality || 0}/5</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HealthAssessment