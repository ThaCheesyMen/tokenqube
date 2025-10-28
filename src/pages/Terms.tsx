export default function Terms() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1a1a1a] rounded-xl border border-[#202225] p-6 sm:p-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-gray-400 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
              <p>By accessing and using TokenQuest ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">2. Description of Service</h2>
              <p>TokenQuest is a gaming rewards platform that allows users to:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Earn tokens by playing games</li>
                <li>Compete in tournaments</li>
                <li>Participate in social gaming features</li>
                <li>Track gaming statistics and achievements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">3. User Accounts</h2>
              <h3 className="text-xl font-semibold text-white mb-2">3.1 Account Creation</h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>You must provide accurate information when creating an account</li>
                <li>You must be at least 13 years old to use this service</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You are responsible for all activities that occur under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">4. Token System</h2>
              <p>Tokens can be earned through gameplay, achievements, quests, and tournaments. Token earning rates may change at any time. Tokens have no monetary value outside the platform.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">5. User Conduct</h2>
              <p className="mb-2">You agree NOT to:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Use the service for any illegal purpose</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Attempt to exploit bugs or vulnerabilities</li>
                <li>Use bots, scripts, or automated tools without permission</li>
                <li>Engage in any form of cheating or fraud</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">6. Tournaments</h2>
              <p>Tournament entry fees are non-refundable once a tournament begins. Prizes are awarded in tokens. We reserve the right to withhold prizes if cheating is suspected.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">7. Privacy</h2>
              <p>See our Privacy Policy for how we handle your data. We collect data necessary to provide the service and do not sell your personal information.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">8. Disclaimers</h2>
              <p>The service is provided "as is" without warranties. We are not liable for any damages arising from use of the service, including loss of tokens, data, or account access.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">9. Changes to Terms</h2>
              <p>We may update these terms at any time. Continued use after changes constitutes acceptance. Material changes will be notified via email or platform notification.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">10. Contact</h2>
              <p>For questions about these terms, email: <a href="mailto:support@tokenquest.com" className="text-[#8B5CF6] hover:underline">support@tokenquest.com</a></p>
            </section>

            <div className="mt-12 p-6 bg-[#0f0f0f] rounded-lg border border-[#8B5CF6]/30">
              <p className="text-sm text-gray-400">
                <strong className="text-white">Note:</strong> This is a general terms of service. For a production environment, you should have a lawyer review this document to ensure it meets all legal requirements for your jurisdiction and business model.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

