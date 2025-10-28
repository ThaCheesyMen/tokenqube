import ComingSoon from '../components/ComingSoon';

export default function LiveStudio() {
  return (
    <ComingSoon 
      feature="Live Studio"
      description="Stream your gameplay, interact with viewers, and grow your audience. Professional streaming tools integrated directly into TokenQuest."
      estimatedRelease="Coming in v1.2.0 (4-5 weeks)"
      icon="rocket"
      benefits={[
        "Stream to Twitch, YouTube, and more",
        "Built-in chat integration",
        "Stream health monitoring",
        "Viewer analytics & insights",
        "Earn tokens while streaming",
        "Highlight reel generation"
      ]}
    />
  );
}
