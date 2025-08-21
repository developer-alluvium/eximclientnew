/**
 * Frontend Module Assignment Test Script
 * This script tests the frontend's ability to access and display assigned modules
 * Run this in the browser console or as a standalone script
 */

class ModuleAssignmentFrontendTester {
  constructor() {
    this.API_BASE_URL = process.env.REACT_APP_API_STRING;
    this.results = [];
    this.currentUser = null;
  }

  // Log test results
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    this.results.push(logEntry);
  }

  // Get current user from localStorage
  getCurrentUser() {
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        this.log(`Current user: ${this.currentUser.name} (${this.currentUser.ie_code_no})`);
        return this.currentUser;
      } else {
        this.log('No user data found in localStorage', 'error');
        return null;
      }
    } catch (error) {
      this.log(`Error getting current user: ${error.message}`, 'error');
      return null;
    }
  }

  // Test 1: Check localStorage user data
  testLocalStorageUserData() {
    this.log('Test 1: Checking localStorage user data...');
    
    const userData = this.getCurrentUser();
    if (!userData) {
      this.log('❌ No user data in localStorage', 'error');
      return false;
    }

    // Check if assignedModules field exists
    if (userData.assignedModules) {
      this.log(`✅ User has assignedModules: ${JSON.stringify(userData.assignedModules)}`);
      return true;
    } else {
      this.log('⚠️  User data exists but no assignedModules field', 'warning');
      return false;
    }
  }

  // Test 2: Test module access utilities
  testModuleAccessUtilities() {
    this.log('Test 2: Testing module access utilities...');
    
    try {
      // Import the module access utility (this would need to be available in the test environment)
      if (typeof window !== 'undefined' && window.moduleAccessUtils) {
        const { getUserAssignedModules, hasModuleAccess } = window.moduleAccessUtils;
        
        const assignedModules = getUserAssignedModules();
        this.log(`✅ getUserAssignedModules returned: ${JSON.stringify(assignedModules)}`);
        
        // Test access to specific modules
        const testModules = ['/importdsr', '/netpage', 'http://elock-tracking.s3-website.ap-south-1.amazonaws.com/'];
        testModules.forEach(module => {
          const hasAccess = hasModuleAccess(module);
          this.log(`Module ${module}: ${hasAccess ? '✅ Access granted' : '❌ Access denied'}`);
        });
        
        return true;
      } else {
        this.log('❌ Module access utilities not available', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error testing module access utilities: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 3: Test API call for user profile
  async testUserProfileAPI() {
    this.log('Test 3: Testing user profile API...');
    
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/customer/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        this.log(`✅ User profile API success: ${JSON.stringify(data.data)}`);
        
        // Check if assignedModules are returned
        if (data.data && data.data.assignedModules) {
          this.log(`✅ API returned assignedModules: ${JSON.stringify(data.data.assignedModules)}`);
          return true;
        } else {
          this.log('⚠️  API response missing assignedModules', 'warning');
          return false;
        }
      } else {
        this.log(`❌ User profile API failed: ${response.status} ${response.statusText}`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error calling user profile API: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 4: Test navigation access
  testNavigationAccess() {
    this.log('Test 4: Testing navigation access...');
    
    if (!this.currentUser || !this.currentUser.assignedModules) {
      this.log('❌ Cannot test navigation - no user or assigned modules', 'error');
      return false;
    }

    const assignedModules = this.currentUser.assignedModules;
    
    // Define module navigation mappings
    const moduleNavigationMap = {
      '/importdsr': 'Import DSR',
      '/netpage': 'CostIQ',
      'http://snapcheckv1.s3-website.ap-south-1.amazonaws.com/': 'SnapCheck',
      'http://qrlocker.s3-website.ap-south-1.amazonaws.com/': 'QR Locker',
      'http://task-flow-ai.s3-website.ap-south-1.amazonaws.com/': 'Task Flow AI',
      'http://elock-tracking.s3-website.ap-south-1.amazonaws.com/': 'E-Lock',
      '/trademasterguide': 'Import Video',
    };

    let accessibleModules = 0;
    
    assignedModules.forEach(moduleId => {
      const moduleName = moduleNavigationMap[moduleId] || moduleId;
      
      // Check if module link exists in DOM (if running in browser)
      if (typeof document !== 'undefined') {
        const moduleLink = document.querySelector(`[href="${moduleId}"]`);
        if (moduleLink) {
          this.log(`✅ Module link found for ${moduleName}`);
          accessibleModules++;
        } else {
          this.log(`⚠️  Module link not found for ${moduleName}`, 'warning');
        }
      } else {
        this.log(`✅ Module ${moduleName} is assigned`);
        accessibleModules++;
      }
    });

    this.log(`📊 Accessible modules: ${accessibleModules}/${assignedModules.length}`);
    return accessibleModules > 0;
  }

  // Test 5: Test real-time updates
  async testRealTimeUpdates() {
    this.log('Test 5: Testing real-time updates...');
    
    const originalModules = this.currentUser?.assignedModules || [];
    this.log(`Original modules: ${JSON.stringify(originalModules)}`);
    
    // Simulate a refresh of user data
    try {
      if (typeof window !== 'undefined' && window.moduleAccessUtils && window.moduleAccessUtils.refreshUserData) {
        await window.moduleAccessUtils.refreshUserData();
        this.log('✅ User data refresh triggered');
        
        // Check if localStorage was updated
        const updatedUser = this.getCurrentUser();
        if (updatedUser) {
          this.log(`✅ Updated modules: ${JSON.stringify(updatedUser.assignedModules)}`);
          return true;
        } else {
          this.log('❌ Failed to get updated user data', 'error');
          return false;
        }
      } else {
        this.log('❌ refreshUserData function not available', 'error');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error testing real-time updates: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 6: Test error handling
  testErrorHandling() {
    this.log('Test 6: Testing error handling...');
    
    try {
      // Test with invalid user data
      const originalData = localStorage.getItem('userData');
      localStorage.setItem('userData', 'invalid_json');
      
      const user = this.getCurrentUser();
      if (user === null) {
        this.log('✅ Error handling works for invalid JSON');
      } else {
        this.log('❌ Error handling failed for invalid JSON', 'error');
      }
      
      // Restore original data
      if (originalData) {
        localStorage.setItem('userData', originalData);
      }
      
      return true;
    } catch (error) {
      this.log(`❌ Error in error handling test: ${error.message}`, 'error');
      return false;
    }
  }

  // Test 7: Test module debugging
  testModuleDebugging() {
    this.log('Test 7: Testing module debugging...');
    
    if (typeof window !== 'undefined' && window.ModuleDebugger) {
      try {
        // Create a debug instance
        const moduleDebugger = new window.ModuleDebugger();
        this.log('✅ ModuleDebugger is available');
        
        // Test debug functions if available
        if (moduleDebugger.checkModuleAccess) {
          const debugResults = moduleDebugger.checkModuleAccess();
          this.log(`✅ Debug results: ${JSON.stringify(debugResults)}`);
        }
        
        return true;
      } catch (error) {
        this.log(`❌ Error using ModuleDebugger: ${error.message}`, 'error');
        return false;
      }
    } else {
      this.log('⚠️  ModuleDebugger not available (normal in production)', 'warning');
      return true; // This is normal in production
    }
  }

  // Run all tests
  async runAllTests() {
    this.log('🚀 Starting Frontend Module Assignment Tests');
    this.log('=============================================');
    
    const tests = [
      { name: 'LocalStorage User Data', fn: () => this.testLocalStorageUserData() },
      { name: 'Module Access Utilities', fn: () => this.testModuleAccessUtilities() },
      { name: 'User Profile API', fn: () => this.testUserProfileAPI() },
      { name: 'Navigation Access', fn: () => this.testNavigationAccess() },
      { name: 'Real-time Updates', fn: () => this.testRealTimeUpdates() },
      { name: 'Error Handling', fn: () => this.testErrorHandling() },
      { name: 'Module Debugging', fn: () => this.testModuleDebugging() },
    ];
    
    let passedTests = 0;
    let failedTests = 0;
    
    for (const test of tests) {
      try {
        this.log(`\n🧪 Running test: ${test.name}...`);
        const result = await test.fn();
        
        if (result) {
          passedTests++;
          this.log(`✅ Test "${test.name}" passed`);
        } else {
          failedTests++;
          this.log(`❌ Test "${test.name}" failed`);
        }
      } catch (error) {
        failedTests++;
        this.log(`❌ Test "${test.name}" threw an error: ${error.message}`, 'error');
      }
    }
    
    // Summary
    this.log('\n📊 Test Summary');
    this.log('===============');
    this.log(`✅ Passed: ${passedTests}`);
    this.log(`❌ Failed: ${failedTests}`);
    this.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
    
    if (failedTests === 0) {
      this.log('🎉 All frontend tests passed!');
    } else {
      this.log('⚠️  Some frontend tests failed. Check the logs above.');
    }
    
    return this.results;
  }

  // Generate test report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.results.filter(r => r.message.includes('Test "')).length,
      passedTests: this.results.filter(r => r.message.includes('passed')).length,
      failedTests: this.results.filter(r => r.message.includes('failed')).length,
      results: this.results,
      user: this.currentUser,
    };
    
    return report;
  }
}

// Make it globally available if running in browser
if (typeof window !== 'undefined') {
  window.ModuleAssignmentFrontendTester = ModuleAssignmentFrontendTester;
  
  // Convenience function for easy testing
  window.testModuleAssignment = async () => {
    const tester = new ModuleAssignmentFrontendTester();
    const results = await tester.runAllTests();
    return tester.generateReport();
  };
  
  console.log('Module Assignment Frontend Tester loaded!');
  console.log('Run window.testModuleAssignment() to start testing.');
}

// Export for use as module
export { ModuleAssignmentFrontendTester };

// Example usage in browser console:
/*
const tester = new ModuleAssignmentFrontendTester();
tester.runAllTests().then(results => {
  console.log('Test completed:', results);
});
*/
