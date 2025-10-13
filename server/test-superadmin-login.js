// Test SuperAdmin Login Flow
// Run this in browser console after going to /login

const testSuperAdminLogin = async () => {
  console.log('🧪 Testing SuperAdmin Login Flow...');
  
  const credentials = {
    username: 'superadmin',
    password: '1qazXsw@'
  };
  
  try {
    // 1. Test login API
    const response = await fetch('/api/superadmin/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    console.log('📊 Login response:', data);
    
    if (response.ok && data.success) {
      console.log('✅ Login successful');
      
      // 2. Check localStorage
      const token = localStorage.getItem('superadmin_token');
      const user = localStorage.getItem('superadmin_user');
      
      console.log('🔑 Token stored:', !!token);
      console.log('👤 User stored:', !!user);
      
      if (token && user) {
        console.log('📋 Token (first 20 chars):', token.substring(0, 20));
        console.log('👤 User data:', JSON.parse(user));
        
        // 3. Test token validation
        const { validateSuperAdminToken } = window;
        if (validateSuperAdminToken) {
          const validation = validateSuperAdminToken();
          console.log('✅ Token validation:', validation);
        }
        
        // 4. Navigate to dashboard
        console.log('🔄 Navigating to dashboard...');
        window.location.href = '/superadmin-dashboard';
      }
    } else {
      console.log('❌ Login failed:', data.message);
    }
    
  } catch (error) {
    console.error('❌ Login error:', error);
  }
};

// Export for manual testing
window.testSuperAdminLogin = testSuperAdminLogin;

console.log('🧪 SuperAdmin test loaded. Run testSuperAdminLogin() to test login flow.');
