/**
 * Test script for error logging system
 * 
 * This file can be used to test the error logging functionality
 * Run this in a development environment to verify error logging works
 */

import { 
  logAuthError, 
  logApiError, 
  logAppError, 
  logSystemError,
  ErrorCategory, 
  ErrorSeverity 
} from './logger'

/**
 * Test all error logging functions
 */
export async function testErrorLogging() {
  console.log('Testing error logging system...')

  try {
    // Test auth error logging
    await logAuthError(
      ErrorCategory.LOGIN_FAILED,
      'Test authentication error',
      {
        email: 'test@example.com',
        timestamp: new Date().toISOString()
      },
      undefined,
      ErrorSeverity.WARNING
    )
    console.log('✅ Auth error logged successfully')

    // Test API error logging
    await logApiError(
      ErrorCategory.API_REQUEST_FAILED,
      'Test API error',
      {
        request: {
          method: 'POST',
          url: '/api/test',
          headers: { 'content-type': 'application/json' }
        },
        response: {
          status: 500
        }
      },
      ErrorSeverity.ERROR
    )
    console.log('✅ API error logged successfully')

    // Test app error logging
    await logAppError(
      ErrorCategory.COMPONENT_ERROR,
      'Test component error',
      {
        url: '/test-page',
        userAgent: 'Test User Agent',
        componentStack: 'TestComponent -> App'
      },
      undefined,
      ErrorSeverity.ERROR
    )
    console.log('✅ App error logged successfully')

    // Test system error logging
    await logSystemError(
      ErrorCategory.DATABASE_ERROR,
      'Test system error',
      {
        service: 'database',
        operation: 'connection',
        timestamp: new Date().toISOString()
      },
      ErrorSeverity.CRITICAL
    )
    console.log('✅ System error logged successfully')

    console.log('🎉 All error logging tests passed!')
    
  } catch (error) {
    console.error('❌ Error logging test failed:', error)
  }
}

// Export for use in development
if (typeof window === 'undefined' && require.main === module) {
  // Only run if this file is executed directly (not imported)
  testErrorLogging()
}