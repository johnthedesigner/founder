import * as React from 'react'
import { Slider as SliderPrimitive } from '@base-ui-components/react/slider'

export interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {}

export function Slider({ className = '', ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root className={`relative flex w-full touch-none items-center ${className}`} {...props}>
      <SliderPrimitive.Control className="relative flex w-full items-center">
        <SliderPrimitive.Track className="relative h-[--slider-track-height] w-full grow overflow-hidden rounded-[--slider-border-radius] bg-[--slider-color-track]">
          <SliderPrimitive.Indicator className="absolute h-full bg-[--slider-color-fill]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block size-[--slider-thumb-size] rounded-[--slider-border-radius] border-2 border-[--slider-color-thumb-border] bg-[--slider-color-thumb] shadow transition-colors focus-visible:outline-2 focus-visible:outline-[--color-border-action]" />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}
