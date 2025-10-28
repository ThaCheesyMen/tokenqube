export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] p-6 sm:p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">1. Introduction</h2>
              <p>TokenQuest respects your privacy and is committed to protecting your personal data. This privacy policy explains how we collect, use, and protect your information.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">2. Information We Collect</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Information You Provide</h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Account Information: Username, email address, password (encrypted)</li>
                    <li>Profile Information: Avatar, bio, social links</li>
                    <li>Communication: Messages, chat logs, support tickets</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">Information Collected Automatically</h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Gaming Data: Games played, playtime, achievements</li>
                    <li>Device Information: Browser type, operating system</li>
                    <li>Usage Data: Features used, pages visited</li>
                    <li>Location Data: IP address, timezone</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">3. How We Use Your Information</h2>
              <p className="mb-2">We use your information to:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Provide and improve the service</li>
                <li>Track gameplay and award tokens</li>
                <li>Process tournaments and competitions</li>
                <li>Facilitate social features</li>
                <li>Send service updates and notifications</li>
                <li>Prevent fraud and abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">4. How We Share Your Information</h2>
              <div className="space-y-2">
                <p><strong className="text-white">We Share With:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Service Providers (Supabase, Stripe, etc.)</li>
                  <li>Other Users (public profile information)</li>
                  <li>Legal Requirements (when required by law)</li>
                </ul>
                <p className="mt-3"><strong className="text-white">We Do NOT:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Sell your personal information</li>
                  <li>Share email addresses publicly</li>
                  <li>Share private messages with other users</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">5. Your Rights</h2>
              <p className="mb-2">You have the right to:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account</li>
                <li>Export your data</li>
                <li>Opt-out of marketing emails</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">6. Data Security</h2>
              <p className="mb-2">We protect your data with:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Encryption in transit (HTTPS/TLS)</li>
                <li>Encryption at rest (database encryption)</li>
                <li>Password hashing (bcrypt)</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">7. Cookies</h2>
              <p>We use essential cookies for authentication and session management. You can manage cookie preferences in your browser settings.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">8. Children's Privacy</h2>
              <p>You must be at least 13 years old to use this service. We do not knowingly collect data from children under 13.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">9. Changes to This Policy</h2>
              <p>We may update this policy at any time. Material changes will be notified via email. Continued use after changes constitutes acceptance.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">10. Contact Us</h2>
              <p>For privacy questions, email: <a href="mailto:privacy@tokenquest.com" className="text-[#8B5CF6] hover:underline">privacy@tokenquest.com</a></p>
            </section>

            <div className="mt-8 p-6 bg-[#8B5CF6]/10 rounded-lg border border-[#8B5CF6]/30">
              <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
              <ul className="text-sm space-y-1">
                <li><strong>We collect:</strong> Account info, gaming data, usage data</li>
                <li><strong>We use it for:</strong> Providing service, improving features</li>
                <li><strong>We share with:</strong> Service providers, other users (public data only)</li>
                <li><strong>We protect:</strong> Encryption, security measures, access controls</li>
                <li><strong>Your rights:</strong> Access, delete, export, opt-out</li>
              </ul>
            </div>

            <div className="mt-6 p-6 bg-[#0f0f0f] rounded-lg border border-[#8B5CF6]/30">
              <p className="text-sm text-gray-400">
                <strong className="text-white">Important:</strong> This is a general privacy policy template. For a production environment, you should have a lawyer review this document to ensure compliance with GDPR (EU), CCPA (California), COPPA (children), and other applicable laws.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

