import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { API_URL } from '../config/api'

const RegisterReferral = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const referralCode = searchParams.get('ref')

  useEffect(() => {
    const fetchAdminByReferral = async () => {
      if (!referralCode) {
        navigate('/user/signup')
        return
      }

      try {
        const res = await fetch(`${API_URL}/admin-mgmt/admin-by-referral/${referralCode}`)
        const data = await res.json()
        
        if (data.success && data.admin.urlSlug) {
          // Redirect to the admin's branded signup page with referral code
          navigate(`/${data.admin.urlSlug}/signup?ref=${referralCode}`, { replace: true })
        } else {
          // If admin not found, redirect to generic signup
          navigate('/user/signup', { replace: true })
        }
      } catch (error) {
        console.error('Error fetching admin by referral:', error)
        navigate('/user/signup', { replace: true })
      }
    }

    fetchAdminByReferral()
  }, [referralCode, navigate])

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-white">Redirecting to signup page...</p>
      </div>
    </div>
  )
}

export default RegisterReferral
