import ComingSoon from '../components/ComingSoon';

export default function Analytics() {
  return (
    <ComingSoon 
      feature="Analytics Dashboard"
      description="Dive deep into your gaming statistics with beautiful charts, insights, and performance tracking across all your games."
      estimatedRelease="Coming in v1.1.0 (2-3 weeks)"
      icon="sparkles"
      benefits={[
        "Token earnings over time (line charts)",
        "Gaming hours by game (bar charts)",
        "Activity heatmap calendar",
        "Performance trends & insights",
        "Comparative stats vs friends",
        "Export reports (PDF/CSV)"
      ]}
    />
  );
}
