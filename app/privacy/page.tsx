import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for our AI-powered communication service',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
          <p className="mb-2">
            Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and 
            safeguard your information when you use our AI-powered communication service.
          </p>
          <p>
            By using our service, you consent to the data practices described in this Privacy Policy. 
            If you do not agree with the data practices described, you should not use our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
          <p className="mb-2">
            We collect several types of information to provide and improve our service:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li><strong>Account Information:</strong> Name, email address, and payment information when you register</li>
            <li><strong>Gmail Integration Data:</strong> Access to your Gmail account for sending and receiving emails on your behalf</li>
            <li><strong>Communication Content:</strong> Information you provide about your needs and preferences, and the content of emails sent and received through our service</li>
            <li><strong>Document Data:</strong> Content you create or input into our document management tools</li>
            <li><strong>Usage Data:</strong> Information about how you use our service, including chat interactions with our AI</li>
          </ul>
          <p>
            Our AI system processes this information to provide personalized communication services and improve our platform.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. Gmail Integration and Email Access</h2>
          <p className="mb-2">
            Our service requires integration with your Gmail account. When you connect your account, we:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Only access emails related to communications initiated through our service</li>
            <li>Use secure OAuth protocols for authentication</li>
            <li>Do not store your Gmail password</li>
            <li>Only retain necessary email data for service functionality</li>
          </ul>
          <p>
            You can revoke our access to your Gmail account at any time through your Google Account settings.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. How We Use Your Information</h2>
          <p className="mb-2">We use the information we collect to:</p>
          <ul className="list-disc ml-6 mb-4">
            <li>Power our AI system to communicate with businesses on your behalf</li>
            <li>Generate and send personalized outreach emails</li>
            <li>Process and organize responses from businesses</li>
            <li>Create and manage documents and spreadsheets</li>
            <li>Improve our AI models and service quality</li>
            <li>Process transactions and send related information</li>
            <li>Provide customer support and respond to inquiries</li>
            <li>Monitor and analyze usage patterns to improve our service</li>
          </ul>
          <p>
            We do not sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. AI Processing and Data Usage</h2>
          <p className="mb-2">
            Our AI system processes your data to provide personalized services. This includes:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Analyzing your requirements to identify relevant businesses</li>
            <li>Generating appropriate email content</li>
            <li>Processing responses to organize information</li>
            <li>Creating and updating related documents</li>
          </ul>
          <p>
            While we use AI to improve our services, we maintain strict privacy controls and do not use your data 
            to train AI models without your explicit consent.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Data Sharing and Disclosure</h2>
          <p className="mb-2">We may share your information in the following situations:</p>
          <ul className="list-disc ml-6 mb-4">
            <li>With businesses you choose to contact through our service</li>
            <li>With third-party service providers that help operate our platform</li>
            <li>To comply with legal obligations</li>
            <li>To protect and defend our rights and property</li>
            <li>With your consent or at your direction</li>
          </ul>
          <p>
            We require all third parties to respect the security of your personal data and to treat it 
            in accordance with applicable laws.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Data Security</h2>
          <p className="mb-2">
            We implement appropriate technical and organizational measures to protect your personal information, including:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Encryption of data in transit and at rest</li>
            <li>Secure OAuth protocols for Gmail integration</li>
            <li>Regular security assessments and updates</li>
            <li>Strict access controls and authentication measures</li>
          </ul>
          <p>
            While we strive to use commercially acceptable means to protect your personal information, 
            no method of transmission over the Internet or electronic storage is 100&#34; secure.&#34;
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Your Data Rights</h2>
          <p className="mb-2">
            You have several rights regarding your personal information:
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Delete your personal information</li>
            <li>Export your data</li>
            <li>Restrict or object to processing</li>
            <li>Revoke Gmail access</li>
            <li>Review and manage AI-generated communications</li>
          </ul>
          <p>
            To exercise these rights, please contact us using the information provided below.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Changes to this Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by 
            posting the new Privacy Policy on this page and updating the last updated date.
            You are advised to review this Privacy Policy periodically for any changes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">10. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at cory@readydone.ai
          </p>
        </section>
      </div>
      
      <div className="mt-8 text-sm text-gray-500">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
} 