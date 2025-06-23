import { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ 
  children, 
  className, 
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  disabled,
  ...props 
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 shadow-sm hover:shadow-md",
    secondary: "bg-secondary-600 hover:bg-secondary-700 text-white focus:ring-secondary-500 shadow-sm hover:shadow-md",
    outline: "bg-transparent border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-surface-dark-tertiary focus:ring-primary-500",
    ghost: "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-surface-dark-tertiary focus:ring-primary-500",
    destructive: "bg-error-600 hover:bg-error-700 text-white focus:ring-error-500 shadow-sm hover:shadow-md"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2"
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {!loading && icon && icon}
      {children}
    </button>
  );
}

// Icon Button variant
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
}

export function IconButton({ 
  icon, 
  className, 
  size = 'md',
  variant = 'ghost',
  ...props 
}: IconButtonProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12"
  };

  return (
    <Button
      className={cn(sizeClasses[size], "p-0", className)}
      variant={variant}
      {...props}
    >
      {icon}
    </Button>
  );
}
