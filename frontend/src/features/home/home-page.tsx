import { ArchitectureSection } from '@/features/home/components/architecture-section';
import { Hero } from '@/features/home/components/hero';
import { RoadmapSection } from '@/features/home/components/roadmap-section';
import { StackSection } from '@/features/home/components/stack-section';

export function HomePage() {
  return (
    <>
      <Hero />
      <ArchitectureSection />
      <RoadmapSection />
      <StackSection />
    </>
  );
}
