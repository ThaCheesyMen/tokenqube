import ComingSoon from '../components/ComingSoon';

export default function Clips() {
  return (
    <ComingSoon 
      feature="Clips & Highlights"
      description="Capture, share, and showcase your best gaming moments. Create highlight reels and share them with the community."
      estimatedRelease="Coming in v1.3.0 (6-7 weeks)"
      icon="rocket"
      benefits={[
        "Automatic clip capture",
        "Manual clip recording",
        "Edit and trim clips",
        "Add music & effects",
        "Share to social media",
        "Community highlight reels"
      ]}
    />
  );
}
