import Link from "next/link";
import { Navigation } from "@/components/landing/navigation";
import { Footer } from "@/components/landing/footer";

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />
      <main className="flex-1 px-6 py-32 sm:py-40">
        <div className="mx-auto max-w-3xl glass-strong p-8 sm:p-12 rounded-2xl border border-separator shadow-card animate-fade-in">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-8">Terms of Service</h1>
          <div className="space-y-6 text-muted">
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
            
            <h2 className="text-2xl font-semibold text-foreground mt-8">1. Acceptance of Terms</h2>
            <p>By accessing or using Collabsy, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.</p>

            <h2 className="text-2xl font-semibold text-foreground mt-8">2. Use License</h2>
            <p>Permission is granted to temporarily download one copy of the materials (information or software) on Collabsy for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>modify or copy the materials;</li>
              <li>use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
              <li>attempt to decompile or reverse engineer any software contained on Collabsy;</li>
              <li>remove any copyright or other proprietary notations from the materials; or</li>
              <li>transfer the materials to another person or "mirror" the materials on any other server.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-foreground mt-8">3. Disclaimer</h2>
            <p>The materials on Collabsy are provided on an 'as is' basis. Collabsy makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>

            <h2 className="text-2xl font-semibold text-foreground mt-8">4. Limitations</h2>
            <p>In no event shall Collabsy or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Collabsy, even if Collabsy or a Collabsy authorized representative has been notified orally or in writing of the possibility of such damage.</p>

            <h2 className="text-2xl font-semibold text-foreground mt-8">5. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at legal@collabsy.space.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
