import { useState } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import { AuthProvider } from './hooks/useAuth'
import './App.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentView, setCurrentView] = useState('overview')

  const handleViewChange = (view) => {
    setCurrentView(view)
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-900 text-white">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <div className="flex">
          <Sidebar isOpen={sidebarOpen} onViewChange={handleViewChange} />
          
          <main className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? 'ml-80' : 'ml-0'
          }`}>
            <Dashboard currentView={currentView} onViewChange={setCurrentView} />
          </main>
        </div>
        
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </div>
    </AuthProvider>
  )
}

export default App