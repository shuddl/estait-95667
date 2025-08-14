
'use client';
import { useState, useEffect } from 'react';

const Logo = () => {
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        setAnimated(true);
    }, []);

    return (
        <div className="flex items-center gap-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="4" width="2.5" height="16" rx="1" className={`transition-transform duration-700 ${animated ? 'translate-y-0' : '-translate-y-full'}`} />
                <rect x="6.5" y="4" width="2.5" height="16" rx="1" className={`transition-transform duration-700 delay-100 ${animated ? 'translate-y-0' : '-translate-y-full'}`} />
                <rect x="11" y="4" width="2.5" height="16" rx="1" className={`transition-transform duration-700 delay-200 ${animated ? 'translate-y-0' : '-translate-y-full'}`} />
                <rect x="15.5" y="4" width="2.5" height="16" rx="1" className={`transition-transform duration-700 delay-300 ${animated ? 'translate-y-0' : '-translate-y-full'}`} />
                <rect x="20" y="4" width="2.5" height="16" rx="1" className={`transition-transform duration-700 delay-500 ${animated ? 'translate-y-0' : '-translate-y-full'}`} />
            </svg>
            <span className="text-3xl font-semibold text-white">estait</span>
        </div>
    );
};

export default Logo;
