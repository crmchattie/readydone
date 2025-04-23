'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NavigationProvider, useNavigation, ThreadType } from '@/lib/navigation-context';
import { MultiLevelLayout } from '@/components/multi-level-layout';
import { generateTestingScenario } from '@/lib/testing/generate-dummy-data';
import { SidebarProvider } from '@/components/ui/sidebar';

// A wrapper to control the testing
export function LayoutTestingWrapper() {
  return (
    <SidebarProvider defaultOpen={true}>
      <NavigationProvider>
        <LayoutTestingInner />
      </NavigationProvider>
    </SidebarProvider>
  );
}

function LayoutTestingInner() {
  const { setThreads, navigateToThreads } = useNavigation();
  const [testState, setTestState] = useState({
    chatId: '',
    initialized: false
  });

  // Generate test data and populate the navigation context
  const initializeTestData = () => {
    const testData = generateTestingScenario(3, 3);
    
    // Get threads ready for the navigation context
    const navigationThreads = testData.navigationThreads as ThreadType[];
    
    // Store chat ID for rendering
    setTestState({
      chatId: testData.chat.id,
      initialized: true
    });

    // Set threads in the navigation context
    setThreads(navigationThreads);
  };

  // Test navigating to threads
  const testNavigateToThreads = () => {
    if (!testState.initialized) {
      alert('Please initialize test data first');
      return;
    }

    const testData = generateTestingScenario(3, 3);
    navigateToThreads(testData.navigationThreads as ThreadType[]);
  };

  // Test navigating to a single thread
  const testNavigateToSingleThread = () => {
    if (!testState.initialized) {
      alert('Please initialize test data first');
      return;
    }

    const testData = generateTestingScenario(1, 3);
    navigateToThreads(testData.navigationThreads as ThreadType[]);
  };

  return (
    <div className="container mx-auto p-4 max-w-screen-xl">
      <div className="bg-muted p-4 mb-4 rounded-md">
        <h1 className="text-xl font-bold mb-2">Multi-Level Layout Testing</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            onClick={initializeTestData}
            variant="default"
          >
            Initialize Test Data
          </Button>
          <Button 
            onClick={testNavigateToThreads}
            variant="outline"
            disabled={!testState.initialized}
          >
            Show Multiple Threads
          </Button>
          <Button 
            onClick={testNavigateToSingleThread}
            variant="outline"
            disabled={!testState.initialized}
          >
            Show Single Thread
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {testState.initialized 
            ? 'Test data initialized! Use the buttons above to navigate between views.' 
            : 'Click "Initialize Test Data" to begin testing.'}
        </div>
      </div>

      {testState.initialized && (
        <div className="h-[calc(100vh-200px)] w-full border rounded-md overflow-hidden">
          <MultiLevelLayout
            id={testState.chatId}
            initialMessages={[]}
            selectedChatModel="default"
            selectedVisibilityType="private"
            isReadonly={false}
          />
        </div>
      )}
    </div>
  );
} 