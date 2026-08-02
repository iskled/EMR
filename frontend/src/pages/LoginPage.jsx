import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {useClinicSettings} from '../context/ClinicSettingsContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const {settings}=useClinicSettings()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await login(email, password)

      navigate('/dashboard')
    } catch (error) {
      console.error(error)

      alert('Invalid credentials')
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f5f7fb',
      }}
    >
      <div
        style={{
          width: '400px',
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        }}
      >
        {settings.logo_url&&<img src={settings.logo_url} alt="" style={{height:'72px',maxWidth:'180px',objectFit:'contain'}}/>}<h1>{settings.clinic_name}</h1>

        <p>{settings.tagline}</p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}
