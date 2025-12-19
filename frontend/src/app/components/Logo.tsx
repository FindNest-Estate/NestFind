import Image from 'next/image';

type LogoVariant = 'icon' | 'horizontal' | 'mono-black' | 'mono-white';
type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

interface LogoProps {
    variant?: LogoVariant;
    size?: LogoSize;
    className?: string;
}

const sizeMap: Record<LogoSize, { width: number; height: number }> = {
    sm: { width: 32, height: 32 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
    xl: { width: 96, height: 96 },
};

const horizontalSizeMap: Record<LogoSize, { width: number; height: number }> = {
    sm: { width: 120, height: 32 },
    md: { width: 180, height: 48 },
    lg: { width: 240, height: 64 },
    xl: { width: 360, height: 96 },
};

/**
 * NestFind Logo Component
 * 
 * The official "Verified Check" logo for NestFind.
 * 
 * @param variant - Logo style: 'icon', 'horizontal', 'mono-black', 'mono-white'
 * @param size - Logo size: 'sm', 'md', 'lg', 'xl'
 * @param className - Additional CSS classes
 */
export default function Logo({
    variant = 'horizontal',
    size = 'md',
    className = ''
}: LogoProps) {
    const isHorizontal = variant === 'horizontal';
    const dimensions = isHorizontal ? horizontalSizeMap[size] : sizeMap[size];
    const logoPath = `/branding/logo-${variant}.svg`;

    return (
        <Image
            src={logoPath}
            alt="NestFind Logo"
            width={dimensions.width}
            height={dimensions.height}
            className={className}
            priority
        />
    );
}
