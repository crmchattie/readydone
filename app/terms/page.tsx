import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Terms and conditions for using our AI-powered communication service',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms and Conditions</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
          <p className="mb-2">
            Welcome to our AI-powered communication platform. These Terms and Conditions govern your use of our website and services, 
            including all content, functionality, and AI-assisted communication services offered on or through our platform.
          </p>
          <p>
            By using our service, you accept and agree to be bound by these Terms and Conditions. 
            If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. User Accounts and Gmail Integration</h2>
          <p className="mb-2">
            When you create an account with us, you must provide accurate and complete information. 
            You are responsible for maintaining the confidentiality of your account credentials and for 
            all activities that occur under your account.
          </p>
          <p className="mb-2">
            Our service requires integration with your Gmail account to send and receive communications on your behalf. 
            By connecting your Gmail account, you authorize us to:
          </p>
          <ul className="list-disc ml-6 mb-2">
            <li>Access and read your emails related to service-initiated communications</li>
            <li>Send emails on your behalf through our AI-powered system</li>
            <li>Organize and manage email threads related to your requests</li>
          </ul>
          <p>
            We reserve the right to terminate or suspend your account if you violate these Terms or 
            for any other reason at our sole discretion.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. AI-Powered Communication Service</h2>
          <p className="mb-2">
            Our service uses AI to communicate with businesses on your behalf. By using our service, you authorize our AI system to:
          </p>
          <ul className="list-disc ml-6 mb-2">
            <li>Search for and identify relevant businesses based on your requirements</li>
            <li>Generate and send personalized outreach emails</li>
            <li>Process and organize responses from businesses</li>
            <li>Create and manage related documents and spreadsheets</li>
          </ul>
          <p className="mb-2">
            You can choose to review and approve emails before they are sent or enable auto-send functionality. 
            You remain responsible for all communications sent through our platform, whether manually approved or auto-sent.
          </p>
          <p>
            You can review all communications at any time and instruct us to stop communicating with specific businesses.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Document Management</h2>
          <p className="mb-2">
            Our service includes document management features such as spreadsheets, checklists, and quote tracking. 
            You retain ownership of all content you create or input into these documents.
          </p>
          <p>
            We provide these tools to help organize your communications and decision-making process, but we are not 
            responsible for the accuracy of information provided by third-party businesses or your final decisions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Payment Terms</h2>
          <p className="mb-2">
            For paid services, we use Stripe as our payment processor. All payment information is processed 
            and stored by Stripe in accordance with their terms and policies.
          </p>
          <p>
            We reserve the right to change our pricing at any time, with notice to our users before 
            implementing any price changes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Intellectual Property</h2>
          <p className="mb-2">
            All content, features, and functionality of our service, including our AI system, text, graphics, logos, 
            and software, are owned by us or our licensors and are protected by copyright, trademark, 
            and other intellectual property laws.
          </p>
          <p>
            You may not reproduce, distribute, modify, create derivative works from, or publicly display 
            any content from our service without our prior written consent.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. User Content and Data</h2>
          <p className="mb-2">
            You retain ownership of any content you submit to our service, including your communications, 
            documents, and personal information. By using our service, you grant us a worldwide, non-exclusive, 
            royalty-free license to use, reproduce, and process such content to provide our services.
          </p>
          <p>
            You are solely responsible for the content you submit and must not violate any third-party 
            rights or applicable laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Disclaimers and Limitations of Liability</h2>
          <p className="mb-2">
            Our service is provided as is without warranties of any kind, either express or implied.
          </p>
          <p className="mb-2">
            While our AI system is designed to assist with communications effectively, we do not guarantee 
            specific outcomes from business interactions or the accuracy of AI-generated content.
          </p>
          <p>
            To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, 
            special, consequential, or punitive damages arising out of or in connection with your use 
            of our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Changes to Terms</h2>
          <p>
            We may revise these Terms and Conditions at any time by updating this page. By continuing 
            to use our service after such changes, you agree to be bound by the revised terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Contact Us</h2>
          <p>
            If you have any questions about these Terms and Conditions, please contact us at cory@readydone.ai
          </p>
        </section>
      </div>
      
      <div className="mt-8 text-sm text-gray-500">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
} 