import { HeroSection } from "@/components/landing/hero-section";
import { DatasetMetamorphosis } from "@/components/landing/dataset-metamorphosis";
import { SketchbookSection } from "@/components/landing/sketchbook-section";
import { InteractiveExampleSection } from "@/components/landing/interactive-example-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { StoryCtaSection } from "@/components/landing/story-cta-section";

export default function HomePage() {
  return (
    <div className="flex flex-col w-full selection:bg-cyan-500/25 selection:text-cyan-200">
      <HeroSection />
      <DatasetMetamorphosis />
      <SketchbookSection />
      <InteractiveExampleSection />
      <FeaturesSection />
      <StoryCtaSection />
    </div>
  );
}
