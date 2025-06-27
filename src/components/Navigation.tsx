'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Settings } from 'lucide-react'
import Image from 'next/image'


export function Navigation() {
    const pathname = usePathname()

    return (
        <nav className="fixed top-0 z-50 w-full border-b" style={{ background: '#1c4d90' }}>
            <div className="px-0 h-16 flex items-center w-full">
                <div className="flex items-center w-full justify-start pr-8">
                    <div className="flex items-center space-x-4 pl-4">
                        <Link href="/map" className="flex items-center" style={{ textDecoration: 'none' }}>
                            <Image src="/logo.png" alt="Media Space Logo" width={120} height={36} style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
                            <span className="font-bold text-white text-lg" style={{ lineHeight: 1, marginLeft: '40px' }}>OOH Scenario Planner</span>
                        </Link>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        <Link
                            href="/settings"
                            className={cn(
                                "transition-colors hover:text-white",
                                pathname === "/settings" ? "text-white" : "text-white/80"
                            )}
                        >
                            <Settings size={20} color="#fff" />
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    )
} 