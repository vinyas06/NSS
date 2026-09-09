const NSS_LOGO = "https://customer-assets-cm19k8pv.emergentagent.net/job_5085535f-5dce-4e3f-bd8e-237307d9e564/artifacts/ootad4l1_National_Service_Scheme_logo.svg.webp";
const NMAMIT_LOGO = "https://customer-assets-cm19k8pv.emergentagent.net/job_5085535f-5dce-4e3f-bd8e-237307d9e564/artifacts/hdtmqb2l_nitte-nmamit-logo.png";

export function Brand({ dark = false, compact = false }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-logo">
      <img src={NSS_LOGO} alt="NSS" className={compact ? "h-9 w-9" : "h-11 w-11"} />
      <div className={`h-8 w-px ${dark ? "bg-white/25" : "bg-slate-300"}`} />
      <img src={NMAMIT_LOGO} alt="NMAMIT Nitte" className={compact ? "h-6" : "h-7"} style={{ filter: dark ? "brightness(0) invert(1)" : "none" }} />
    </div>
  );
}

export { NSS_LOGO, NMAMIT_LOGO };
