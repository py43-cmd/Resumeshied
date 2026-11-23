import * as React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils.js';

const alertVariants = cva(
  'relative w-full rounded-xl border p-4 text-sm shadow-card backdrop-blur-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'bg-card text-foreground',
        info: 'border-primary/30 bg-primary/5 text-foreground',
        warning: 'border-warning/40 bg-warning/5 text-foreground',
        destructive: 'border-destructive/40 bg-destructive/5 text-foreground',
        success: 'border-success/40 bg-success/5 text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5 ref={ref} className={cn('mb-1 font-semibold leading-none tracking-tight', className)} {...props} />
));
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';
