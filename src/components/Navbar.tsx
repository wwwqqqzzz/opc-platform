'use client';

import UserMenu from './UserMenu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-gray-900">
            OPC Platform
          </Link>
          <div className="flex items-center space-x-6">
            <Link
              href="/idea"
              className={`font-medium transition ${isActive('/idea') ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Ideas
            </Link>
            <Link
              href="/launch"
              className={`font-medium transition ${isActive('/launch') ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Launch
            </Link>
            <Link
              href="/project"
              className={`font-medium transition ${isActive('/project') ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Projects
            </Link>
            <Link
              href="/docs"
              className={`font-medium transition ${isActive('/docs') ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Docs
            </Link>
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
