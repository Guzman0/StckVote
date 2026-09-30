import type { ReactNode } from 'react';
import './globals.css';
import { WalletProvider } from '../components/WalletConnect';
import Header from '../components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'StackVote',
  description: 'On-chain polls and voting on Stacks',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="bg-[#131416]">
      <body className="bg-[#131416] text-white">
        <WalletProvider>
          <Header />
          {children}
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}