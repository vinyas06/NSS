import PublicLayout from "@/components/PublicLayout";

export default function Legal() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-6 py-16 prose dark:prose-invert">
        <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white">Legal & Policies</h1>
        <section className="mt-8 space-y-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          <div id="privacy"><h3 className="font-display font-bold text-slate-900 dark:text-white">Privacy Policy</h3><p>NSS NMAMIT collects only the information necessary to manage membership, event registration and certificates. Your data is never sold or shared with third parties except payment processors (Razorpay) for paid events.</p></div>
          <div id="terms"><h3 className="font-display font-bold text-slate-900 dark:text-white">Terms of Service</h3><p>By using this platform you agree to abide by the NSS code of conduct and NMAMIT institutional policies. Membership is granted at the discretion of NSS administrators.</p></div>
          <div id="refund"><h3 className="font-display font-bold text-slate-900 dark:text-white">Refund Policy</h3><p>Event registration fees are generally non-refundable. In case of event cancellation by NSS, fees will be refunded to the original payment method within 7-10 business days.</p></div>
          <div id="shipping"><h3 className="font-display font-bold text-slate-900 dark:text-white">Shipping Policy</h3><p>Certificates are issued digitally and available for download. No physical shipping is involved.</p></div>
          <div id="contact"><h3 className="font-display font-bold text-slate-900 dark:text-white">Contact</h3><p>NMAM Institute of Technology Nitte, SH1, Karkala, Karnataka, 574110<br/>Email: nss@nmamit.in · Phone: +91 8258 281263</p></div>
        </section>
      </div>
    </PublicLayout>
  );
}
