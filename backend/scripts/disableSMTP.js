import mongoose from 'mongoose'
import EmailSettings from '../models/EmailSettings.js'
import dotenv from 'dotenv'

dotenv.config()

const disableSMTP = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    // Update or create email settings to disable SMTP
    const result = await EmailSettings.updateMany(
      {},
      { 
        $set: { 
          smtpEnabled: false,
          otpVerificationEnabled: false 
        } 
      }
    )

    console.log(`✓ Updated ${result.modifiedCount} email settings record(s)`)
    console.log('✓ SMTP is now disabled')
    console.log('✓ No emails will be sent (no OTP, no welcome emails)')
    console.log('✓ Users can register immediately without any email verification')

    await mongoose.connection.close()
    console.log('Database connection closed')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

disableSMTP()
