import React, { useState, useRef, useEffect } from 'react'
import { chatAPI, profileAPI } from '../services/api'
import { Send, Bot, User, Volume2, Database, MessageCircle } from 'lucide-react'

function Chat() {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentMode, setCurrentMode] = useState('advice') // 'advice' or 'data-collection'
  const [currentModel, setCurrentModel] = useState('')
  const [currentTopic, setCurrentTopic] = useState(null)
  const [conversationHistory, setConversationHistory] = useState([])
  const messagesEndRef = useRef(null)

  const topics = [
    { id: "sleep", label: "خواب", persona: "متخصص خواب" },
    { id: "food", label: "تغذیه", persona: "مشاور تغذیه" },
    { id: "exercise", label: "ورزش", persona: "مربی ورزشی" },
    { id: "work", label: "کار و بهره‌وری", persona: "مربی بهره‌وری" },
  ]

  useEffect(() => {
    loadCurrentModel()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadCurrentModel = async () => {
    try {
      const model = await profileAPI.getCurrentModel()
      setCurrentModel(model.current_model)
    } catch (error) {
      console.error('خطا در بارگذاری مدل:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const startDataCollection = async (topic) => {
    setCurrentTopic(topic)
    setConversationHistory([])
    setCurrentMode('data-collection')
    
    try {
      const response = await chatAPI.sendDataCollection({
        message: "سلام، شروع کنیم؟",
        topic: topic.id,
        persona: topic.persona,
        format: "descriptive",
        history: []
      })
      
      setMessages([response.message])
      setConversationHistory([
        { role: "user", content: "سلام، شروع کنیم؟" },
        { role: "assistant", content: response.message.content }
      ])
    } catch (error) {
      console.error("خطا در شروع جمع‌آوری داده:", error)
    }
  }

  const switchToAdviceMode = () => {
    setCurrentMode('advice')
    setCurrentTopic(null)
    setConversationHistory([])
    setMessages([])
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || loading) return

    const userMessage = {
      content: inputMessage,
      role: 'user',
      created_at: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)

    try {
      let response
      if (currentMode === 'data-collection' && currentTopic) {
        response = await chatAPI.sendDataCollection({
          message: inputMessage,
          topic: currentTopic.id,
          persona: currentTopic.persona,
          format: "descriptive",
          history: conversationHistory
        })
        
        setConversationHistory(prev => [
          ...prev,
          { role: "user", content: inputMessage },
          { role: "assistant", content: response.message.content }
        ])
      } else {
        response = await chatAPI.sendAdvice({ content: inputMessage })
      }
      
      const assistantMessage = {
        ...response.message,
        sources: response.sources
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage = {
        content: 'متاسفانه در پردازش پیام خطایی رخ داد. لطفا دوباره تلاش کنید.',
        role: 'assistant',
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const speakMessage = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'fa-IR'
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  const getPlaceholderText = () => {
    if (currentMode === 'data-collection') {
      return "پاسخ خود را بنویسید..."
    }
    return "پیام خود را به فارسی بنویسید..."
  }

  const getWelcomeMessage = () => {
    if (currentMode === 'data-collection') {
      return "لطفاً پاسخ‌های خود را در مورد سلامت‌تان به اشتراک بگذارید."
    }
    return "سلام! من آرامش هستم، دستیار هوشمند سلامت روان شما. چطور می‌تونم کمکتون کنم؟"
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* هدر و انتخاب حالت */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {currentMode === 'advice' ? 'گفتگو با آرامش' : 'جمع‌آوری داده سلامت'}
        </h1>
        
        <div className="flex items-center space-x-4 space-x-reverse">
          {/* انتخاب حالت */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={switchToAdviceMode}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                currentMode === 'advice' 
                  ? 'bg-white shadow-sm text-primary-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <MessageCircle className="h-4 w-4 ml-2" />
              مشاوره
            </button>
            <button
              onClick={() => setCurrentMode('data-collection')}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                currentMode === 'data-collection' 
                  ? 'bg-white shadow-sm text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Database className="h-4 w-4 ml-2" />
              جمع‌آوری داده
            </button>
          </div>

          {/* اطلاعات مدل */}
          {currentModel && (
            <div className="text-sm text-gray-600">
              مدل: <span className="font-medium">{currentModel.split('/').pop()}</span>
            </div>
          )}
        </div>
      </div>

      {/* موضوعات برای جمع‌آوری داده */}
      {currentMode === 'data-collection' && messages.length === 0 && !currentTopic && (
        <div className="mb-6 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 text-center">
            🎯 انتخاب موضوع برای جمع‌آوری داده
          </h3>
          <p className="text-blue-600 mb-4 text-center">
            لطفاً یکی از موضوعات زیر را انتخاب کنید تا گفتگو را شروع کنیم
          </p>
          <div className="flex justify-center space-x-4">
            {topics.map(topic => (
              <button
                key={topic.id}
                onClick={() => startDataCollection(topic)}
                className="px-6 py-3 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-blue-700 font-medium"
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* نمایش وضعیت فعلی */}
      {currentMode === 'data-collection' && currentTopic && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <p className="text-blue-800 font-medium">
              🔬 در حال جمع‌آوری داده‌های <span className="font-bold">{currentTopic.label}</span>
            </p>
            <p className="text-blue-600 text-sm mt-1">
              با {currentTopic.persona} - هر بار فقط یک سوال پرسیده می‌شود
            </p>
          </div>
        </div>
      )}

      {/* وضعیت حالت مشاوره */}
      {currentMode === 'advice' && messages.length === 0 && (
        <div className="mb-6 p-6 bg-green-50 rounded-lg border border-green-200">
          <div className="text-center">
            <p className="text-green-800 font-medium">
              💬 حالت مشاوره فعال
            </p>
            <p className="text-green-600 text-sm mt-1">
              می‌توانید آزادانه صحبت کنید و راهکارهای تخصصی دریافت نمایید
            </p>
          </div>
        </div>
      )}

      {/* بخش چت */}
      <div className="card h-[600px] flex flex-col border border-gray-200 rounded-xl shadow-sm">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <Bot className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg text-gray-600">{getWelcomeMessage()}</p>
              {currentMode === 'advice' && (
                <p className="mt-3 text-sm text-gray-500">
                  از منابع تخصصی سلامت روان و دانش هوش مصنوعی برای کمک به شما استفاده می‌کنم
                </p>
              )}
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex space-x-3 space-x-reverse ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    message.role === 'user'
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div
                  className={`flex-1 space-y-2 ${
                    message.role === 'user' ? 'text-left' : 'text-right'
                  }`}
                >
                  <div
                    className={`inline-block px-4 py-2 rounded-2xl max-w-[80%] ${
                      message.role === 'user'
                        ? 'bg-primary-600 text-white rounded-tr-none'
                        : 'bg-gray-200 text-gray-900 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                  {message.role === 'assistant' && currentMode === 'advice' && (
                    <button
                      onClick={() => speakMessage(message.content)}
                      className="flex items-center space-x-1 space-x-reverse text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Volume2 className="h-3 w-3" />
                      <span>پخش صدا</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex space-x-3 space-x-reverse">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-gray-600" />
              </div>
              <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-2xl rounded-tl-none">
                <div className="flex space-x-1 space-x-reverse">
                  <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* فرم ارسال پیام */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-xl">
          <form onSubmit={handleSendMessage} className="flex space-x-3 space-x-reverse">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={getPlaceholderText()}
              className="flex-1 input-field border border-gray-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 rounded-lg px-4 py-3 transition-colors"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 space-x-reverse"
            >
              <Send className="h-4 w-4" />
              <span>ارسال</span>
            </button>
          </form>
          
          {/* راهنمای حالت */}
          {currentMode === 'data-collection' && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              💡 در این حالت، پاسخ‌های شما برای تحقیقات سلامت جمع‌آوری می‌شود
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Chat
