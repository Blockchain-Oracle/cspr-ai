'use client';

import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { cn } from '@/components/utils';

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  href?: string;
}

export interface FeaturesCarouselProps {
  features: FeatureItem[];
  autoPlayInterval?: number;
  theme?: 'light' | 'dark';
  sectionTitle?: string;
}

export function FeaturesCarousel({
  features,
  autoPlayInterval = 5000,
  theme = 'dark',
  sectionTitle = 'Features',
}: FeaturesCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });
  
  const scrollPrev = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  React.useEffect(() => {
    if (autoPlayInterval > 0 && emblaApi) {
        const autoplay = () => {
             if (emblaApi.canScrollNext()) {
                 emblaApi.scrollNext();
             } else {
                 emblaApi.scrollTo(0);
             }
        };

        const interval = setInterval(autoplay, autoPlayInterval);
        
        // Stop on interaction
        emblaApi.on('pointerDown', () => clearInterval(interval));
        emblaApi.on('select', () => {
            clearInterval(interval);
            // Optionally restart
        });
        
        return () => clearInterval(interval);
    }
  }, [emblaApi, autoPlayInterval]);

  return (
    <section className="py-20 bg-secondary/5 border-y border-border/40" id="features">
       <div className="container px-4 md:px-6 mx-auto">
          <div className="flex items-center justify-between mb-12">
              <div className="space-y-1">
                  <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{sectionTitle}</h2>
                  <p className="text-muted-foreground">Explore what CSPR.AI can do for you.</p>
              </div>
              <div className="hidden md:flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={scrollPrev} className="rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary">
                      <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={scrollNext} className="rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary">
                      <ChevronRight className="h-4 w-4" />
                  </Button>
              </div>
          </div>

          <div className="overflow-hidden -mx-4 px-4 py-4" ref={emblaRef}>
              <div className="flex -ml-4 md:-ml-6">
                  {features.map((feature) => (
                      <div className="flex-[0_0_85%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 pl-4 md:pl-6" key={feature.id}>
                          <Card className="h-full hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
                             <div className="flex flex-col h-full gap-4">
                                {feature.icon && (
                                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                                        {feature.icon}
                                    </div>
                                )}
                                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">{feature.title}</h3>
                                <p className="text-muted-foreground flex-1 leading-relaxed text-sm md:text-base">
                                    {feature.description}
                                </p>
                             </div>
                          </Card>
                      </div>
                  ))}
              </div>
          </div>
          
          <div className="flex md:hidden items-center justify-center gap-4 mt-8">
               <Button variant="outline" size="icon" onClick={scrollPrev} className="rounded-full">
                  <ChevronLeft className="h-4 w-4" />
               </Button>
               <Button variant="outline" size="icon" onClick={scrollNext} className="rounded-full">
                  <ChevronRight className="h-4 w-4" />
               </Button>
          </div>
       </div>
    </section>
  );
}