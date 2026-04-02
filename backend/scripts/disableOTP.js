import mongoose from 'mongoose'
import EmailSettings from '../models/EmailSettings.js'
import dotenv from 'dotenv'

dotenv.config()

const disableOTP = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    // Update existing email settings to disable OTP
    const result = await EmailSettings.updateMany(
      {},
      { 
        $set: { 
          otpVerificationEnabled: false 
        } 
      }
    )

    console.log(`✓ Updated ${result.modifiedCount} email settings record(s)`)
    console.log('✓ OTP verification is now disabled')
    console.log('✓ Users can now register without email OTP verification')

    await mongoose.connection.close()
    console.log('Database connection closed')
    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

disableOTP()
